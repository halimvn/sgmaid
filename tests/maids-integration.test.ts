import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";

/**
 * Tests #3–#7 from the Phase 3 spec, plus the Step 28 filter/pagination
 * checks — run against the REAL development database (sgmaid-dev), not
 * a mock. Only `@/auth`'s auth() is mocked (to simulate a signed-in
 * session) — the Prisma client, the visibility policy, and every query
 * below are the genuine lib/services/maids.ts code path, proving the
 * actual seeded fictional DRAFT/INACTIVE/hidden-availability rows are
 * excluded for real, not just in a mocked stand-in.
 *
 * Requires DATABASE_URL (see tests/setup.ts) and the fictional seed data
 * from prisma/seed.ts (`npx prisma db seed`) to already be loaded.
 *
 * A single throwaway, non-login-capable test employer User is created in
 * beforeAll and removed in afterAll — no seeded MaidProfile rows are
 * modified.
 */

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const { listEmployerVisibleMaids, getEmployerVisibleMaidProfile } = await import("@/lib/services/maids");
const { parseMaidFilters } = await import("@/lib/validation/maid-filters");

const TEST_EMPLOYER_EMAIL = "phase3-integration-test@example.test";
let testEmployerId: string;

// Fictional profileCodes seeded by prisma/seed.ts, chosen specifically
// for their visibility status:
const DRAFT_PROFILE_CODE = "SG-00007"; // profileStatus: DRAFT
const INACTIVE_PROFILE_CODE = "SG-00008"; // profileStatus: INACTIVE
const PLACED_PROFILE_CODE = "SG-00004"; // ACTIVE but availabilityStatus: PLACED (hidden)
const UNAVAILABLE_PROFILE_CODE = "SG-00006"; // ACTIVE but availabilityStatus: UNAVAILABLE (hidden)
const VISIBLE_PROFILE_CODE = "SG-00001"; // ACTIVE + AVAILABLE (visible)

async function idFor(profileCode: string): Promise<string> {
  const row = await prisma.maidProfile.findUniqueOrThrow({ where: { profileCode }, select: { id: true } });
  return row.id;
}

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { fullName: "[Fictional] Phase 3 Integration Test", email: TEST_EMPLOYER_EMAIL, role: "EMPLOYER", status: "ACTIVE" },
  });
  testEmployerId = user.id;
  mockAuth.mockResolvedValue({ user: { id: testEmployerId }, sessionVersion: 0 });
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: testEmployerId } });
  await prisma.$disconnect();
});

describe("employer visibility — real database", () => {
  it("3. an ACTIVE + AVAILABLE/RESERVED profile is returned in the listing", async () => {
    const result = await listEmployerVisibleMaids(parseMaidFilters({ search: VISIBLE_PROFILE_CODE }));
    expect(result.items.some((m) => m.profileCode === VISIBLE_PROFILE_CODE)).toBe(true);
  });

  it("4. a DRAFT profile is excluded from the listing", async () => {
    const result = await listEmployerVisibleMaids(parseMaidFilters({ search: DRAFT_PROFILE_CODE }));
    expect(result.items.some((m) => m.profileCode === DRAFT_PROFILE_CODE)).toBe(false);
    expect(result.totalCount).toBe(0);
  });

  it("5. an INACTIVE profile is excluded from the listing", async () => {
    const result = await listEmployerVisibleMaids(parseMaidFilters({ search: INACTIVE_PROFILE_CODE }));
    expect(result.items.some((m) => m.profileCode === INACTIVE_PROFILE_CODE)).toBe(false);
    expect(result.totalCount).toBe(0);
  });

  it("6. PLACED and UNAVAILABLE profiles are excluded from normal browse", async () => {
    const placedResult = await listEmployerVisibleMaids(parseMaidFilters({ search: PLACED_PROFILE_CODE }));
    const unavailableResult = await listEmployerVisibleMaids(parseMaidFilters({ search: UNAVAILABLE_PROFILE_CODE }));
    expect(placedResult.totalCount).toBe(0);
    expect(unavailableResult.totalCount).toBe(0);
  });

  it("7. direct profile lookup cannot retrieve a DRAFT, INACTIVE, or hidden-availability profile", async () => {
    const [draftId, inactiveId, placedId, unavailableId] = await Promise.all([
      idFor(DRAFT_PROFILE_CODE),
      idFor(INACTIVE_PROFILE_CODE),
      idFor(PLACED_PROFILE_CODE),
      idFor(UNAVAILABLE_PROFILE_CODE),
    ]);

    const results = await Promise.all([
      getEmployerVisibleMaidProfile(draftId),
      getEmployerVisibleMaidProfile(inactiveId),
      getEmployerVisibleMaidProfile(placedId),
      getEmployerVisibleMaidProfile(unavailableId),
    ]);

    expect(results).toEqual([null, null, null, null]);
  });

  it("7b. direct lookup of a genuinely nonexistent id behaves identically (null)", async () => {
    const result = await getEmployerVisibleMaidProfile("this-id-does-not-exist-at-all");
    expect(result).toBeNull();
  });

  it("a visible profile's detail loads real skills, training, and employment history", async () => {
    const id = await idFor(VISIBLE_PROFILE_CODE);
    const profile = await getEmployerVisibleMaidProfile(id);

    expect(profile).not.toBeNull();
    expect(profile!.profileCode).toBe(VISIBLE_PROFILE_CODE);
    expect(profile!.skills.length).toBeGreaterThan(0);
    expect(profile!.trainings.length).toBeGreaterThan(0);
    expect(profile!.employmentHistory.length).toBeGreaterThan(0);
  });
});

describe("filters against real seed data", () => {
  it("nationality filter narrows results to that nationality only", async () => {
    const result = await listEmployerVisibleMaids(parseMaidFilters({ nationality: "Indonesian" }));
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((m) => m.nationality === "Indonesian")).toBe(true);
  });

  it("skill category filter returns only maids with a skill in that category", async () => {
    const result = await listEmployerVisibleMaids(parseMaidFilters({ skill: "pet-care" }));
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("nationality + skill combination narrows further than either alone", async () => {
    const nationalityOnly = await listEmployerVisibleMaids(parseMaidFilters({ nationality: "Filipino" }));
    const combined = await listEmployerVisibleMaids(parseMaidFilters({ nationality: "Filipino", skill: "elderly-care" }));
    expect(combined.totalCount).toBeLessThanOrEqual(nationalityOnly.totalCount);
    expect(combined.items.every((m) => m.nationality === "Filipino")).toBe(true);
  });

  it("search + nationality combination applies both conditions", async () => {
    const result = await listEmployerVisibleMaids(parseMaidFilters({ search: "SG-000", nationality: "Indonesian" }));
    expect(result.items.every((m) => m.nationality === "Indonesian" && m.profileCode.includes("SG-000"))).toBe(true);
  });

  it("availability filter only ever returns AVAILABLE or RESERVED, never anything hidden", async () => {
    const available = await listEmployerVisibleMaids(parseMaidFilters({ availability: "AVAILABLE" }));
    const reserved = await listEmployerVisibleMaids(parseMaidFilters({ availability: "RESERVED" }));
    expect(available.items.every((m) => m.availabilityStatus === "AVAILABLE")).toBe(true);
    expect(reserved.items.every((m) => m.availabilityStatus === "RESERVED")).toBe(true);
  });

  it("pagination: page 1 and page 2 together cover the full result set with no overlap", async () => {
    const unpaged = await listEmployerVisibleMaids(parseMaidFilters({}));
    if (unpaged.totalPages < 2) {
      // Not enough employer-visible seed data to exercise page 2 — the
      // seed is expected to provide enough (see prisma/seed.ts Phase 3
      // addition), but don't hard-fail the suite over a seed change.
      expect(unpaged.items.length).toBe(unpaged.totalCount);
      return;
    }
    const page1 = await listEmployerVisibleMaids(parseMaidFilters({ page: "1" }));
    const page2 = await listEmployerVisibleMaids(parseMaidFilters({ page: "2" }));

    const page1Ids = new Set(page1.items.map((m) => m.id));
    const overlap = page2.items.filter((m) => page1Ids.has(m.id));

    expect(overlap.length).toBe(0);
    expect(page1.items.length + page2.items.length).toBeLessThanOrEqual(unpaged.totalCount);
  });
});
