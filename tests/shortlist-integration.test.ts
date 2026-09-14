import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { prisma } from "@/lib/db";

/**
 * Tests #5, #6, #7, #11, #12 from the Phase 4 spec, the Step 19
 * two-employer ownership scenario, and a Step 14 status-transition
 * check — run against the REAL development database (sgmaid-dev), not
 * a mock. Only `@/auth`'s auth() is mocked (to switch between two
 * fictional employer sessions) — every shortlist read/write below goes
 * through the genuine lib/services/shortlist.ts code path.
 *
 * Two throwaway, non-login-capable test employers (A and B) are created
 * in beforeAll and removed (with their shortlist rows, via Prisma's
 * onDelete: Cascade on Shortlist.employerId) in afterAll. No seeded
 * MaidProfile rows are modified except one temporary, restored status
 * flip for the Step 14 visibility-transition test.
 */

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const {
  getEmployerShortlist,
  getShortlistedMaidIds,
  addToShortlist,
  removeFromShortlist,
} = await import("@/lib/services/shortlist");

let employerAId: string;
let employerBId: string;
let maid1Id: string; // SG-00001
let maid2Id: string; // SG-00002
let maid3Id: string; // SG-00003

function actingAs(userId: string) {
  mockAuth.mockResolvedValue({ user: { id: userId }, sessionVersion: 0 });
}

beforeAll(async () => {
  const [userA, userB, maid1, maid2, maid3] = await Promise.all([
    prisma.user.create({
      data: { fullName: "[Fictional] Phase 4 Employer A", email: "phase4-employer-a@example.test", role: "EMPLOYER", status: "ACTIVE" },
    }),
    prisma.user.create({
      data: { fullName: "[Fictional] Phase 4 Employer B", email: "phase4-employer-b@example.test", role: "EMPLOYER", status: "ACTIVE" },
    }),
    prisma.maidProfile.findUniqueOrThrow({ where: { profileCode: "SG-00001" }, select: { id: true } }),
    prisma.maidProfile.findUniqueOrThrow({ where: { profileCode: "SG-00002" }, select: { id: true } }),
    prisma.maidProfile.findUniqueOrThrow({ where: { profileCode: "SG-00003" }, select: { id: true } }),
  ]);
  employerAId = userA.id;
  employerBId = userB.id;
  maid1Id = maid1.id;
  maid2Id = maid2.id;
  maid3Id = maid3.id;
});

afterEach(async () => {
  // Keep each test's shortlist state isolated from the next.
  await prisma.shortlist.deleteMany({ where: { employerId: { in: [employerAId, employerBId] } } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [employerAId, employerBId] } } });
  await prisma.$disconnect();
});

describe("shortlist ownership — real database, two employers", () => {
  it("Step 19: Employer A and Employer B each see only their own shortlist", async () => {
    actingAs(employerAId);
    await addToShortlist(maid1Id);
    await addToShortlist(maid2Id);

    actingAs(employerBId);
    await addToShortlist(maid2Id);
    await addToShortlist(maid3Id);

    actingAs(employerAId);
    const aIds = (await getEmployerShortlist()).map((i) => i.maidId).sort();

    actingAs(employerBId);
    const bIds = (await getEmployerShortlist()).map((i) => i.maidId).sort();

    expect(aIds).toEqual([maid1Id, maid2Id].sort());
    expect(bIds).toEqual([maid2Id, maid3Id].sort());
  });

  it("5. Employer A cannot read Employer B's shortlist", async () => {
    actingAs(employerBId);
    await addToShortlist(maid3Id);

    actingAs(employerAId);
    const aShortlist = await getEmployerShortlist();

    expect(aShortlist.some((i) => i.maidId === maid3Id)).toBe(false);
  });

  it("6. Employer A cannot remove Employer B's shortlist record", async () => {
    actingAs(employerBId);
    await addToShortlist(maid3Id);

    actingAs(employerAId);
    await removeFromShortlist(maid3Id); // A never shortlisted maid3 — should be a no-op for B's row

    actingAs(employerBId);
    const bShortlist = await getEmployerShortlist();
    expect(bShortlist.some((i) => i.maidId === maid3Id)).toBe(true); // B's row survives untouched
  });

  it("7. Employer A cannot create a shortlist entry \"on behalf of\" Employer B", async () => {
    // addToShortlist() has no employerId parameter at all — the only
    // identity it can possibly use is whichever session is active.
    // Acting as A, the created row must belong to A, never B.
    actingAs(employerAId);
    await addToShortlist(maid1Id);

    const row = await prisma.shortlist.findUnique({
      where: { employerId_maidId: { employerId: employerAId, maidId: maid1Id } },
    });
    expect(row).not.toBeNull();
    expect(row!.employerId).toBe(employerAId);

    const bRow = await prisma.shortlist.findUnique({
      where: { employerId_maidId: { employerId: employerBId, maidId: maid1Id } },
    });
    expect(bRow).toBeNull();
  });

  it("11. adding the same maid twice does not create a duplicate row", async () => {
    actingAs(employerAId);
    await addToShortlist(maid1Id);
    await addToShortlist(maid1Id);
    await addToShortlist(maid1Id);

    const count = await prisma.shortlist.count({ where: { employerId: employerAId, maidId: maid1Id } });
    expect(count).toBe(1);
  });

  it("12. remove only ever deletes the authenticated employer's own relation", async () => {
    actingAs(employerAId);
    await addToShortlist(maid1Id);
    actingAs(employerBId);
    await addToShortlist(maid1Id); // same maid, different employer

    actingAs(employerAId);
    await removeFromShortlist(maid1Id);

    const aRow = await prisma.shortlist.findUnique({
      where: { employerId_maidId: { employerId: employerAId, maidId: maid1Id } },
    });
    const bRow = await prisma.shortlist.findUnique({
      where: { employerId_maidId: { employerId: employerBId, maidId: maid1Id } },
    });
    expect(aRow).toBeNull(); // A's removed
    expect(bRow).not.toBeNull(); // B's untouched
  });

  it("removing an already-absent entry is idempotent (no error)", async () => {
    actingAs(employerAId);
    const result1 = await removeFromShortlist(maid1Id); // never shortlisted
    const result2 = await removeFromShortlist(maid1Id); // remove again
    expect(result1).toEqual({ ok: true });
    expect(result2).toEqual({ ok: true });
  });

  it("getShortlistedMaidIds() returns only the calling employer's ids", async () => {
    actingAs(employerAId);
    await addToShortlist(maid1Id);
    actingAs(employerBId);
    await addToShortlist(maid2Id);

    actingAs(employerAId);
    const aIds = await getShortlistedMaidIds();
    expect(aIds.has(maid1Id)).toBe(true);
    expect(aIds.has(maid2Id)).toBe(false);
  });
});

describe("Step 14: shortlist survives a maid's status transition, safely", () => {
  it("AVAILABLE -> PLACED: shortlist row is kept, but no profile detail leaks; restored afterward", async () => {
    actingAs(employerAId);
    await addToShortlist(maid2Id); // SG-00002, seeded ACTIVE/AVAILABLE

    const before = await prisma.maidProfile.findUniqueOrThrow({
      where: { id: maid2Id },
      select: { profileStatus: true, availabilityStatus: true },
    });
    expect(before.availabilityStatus).toBe("AVAILABLE");

    try {
      await prisma.maidProfile.update({ where: { id: maid2Id }, data: { availabilityStatus: "PLACED" } });

      const shortlist = await getEmployerShortlist();
      const item = shortlist.find((i) => i.maidId === maid2Id);

      expect(item).toBeDefined();
      expect(item!.visible).toBe(false);
      expect(item!.nationality).toBeNull();
      expect(item!.skills).toEqual([]);
      expect(JSON.stringify(item)).not.toContain("PLACED");

      // The row itself is still there — confirmed via a direct query,
      // proving it wasn't silently deleted.
      const rawRow = await prisma.shortlist.findUnique({
        where: { employerId_maidId: { employerId: employerAId, maidId: maid2Id } },
      });
      expect(rawRow).not.toBeNull();
    } finally {
      // Restore the fictional seed data to its original state.
      await prisma.maidProfile.update({ where: { id: maid2Id }, data: { availabilityStatus: before.availabilityStatus } });
    }

    const after = await prisma.maidProfile.findUniqueOrThrow({
      where: { id: maid2Id },
      select: { availabilityStatus: true },
    });
    expect(after.availabilityStatus).toBe("AVAILABLE");
  });
});
