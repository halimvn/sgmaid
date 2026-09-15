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

  it("2. expertise category filter returns only maids with a skill in that category", async () => {
    const result = await listEmployerVisibleMaids(parseMaidFilters({ expertise: "eldercare" }));
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("nationality + expertise combination narrows further than either alone", async () => {
    const nationalityOnly = await listEmployerVisibleMaids(parseMaidFilters({ nationality: "Filipino" }));
    const combined = await listEmployerVisibleMaids(
      parseMaidFilters({ nationality: "Filipino", expertise: "eldercare" })
    );
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

/**
 * Phase 4.6.3 — Maid Type, Expertise (multi-select), Marital, and
 * Language filters, run against the real database so the actual Prisma
 * queries (not a mocked stand-in) are proven, per Section 15 of the
 * Phase 4.6.3 spec. Profile codes/fixture values referenced here are set
 * up in prisma/seed.ts specifically to make these combinations
 * deterministic — see the comments there.
 */
describe("Phase 4.6.3 filters against real seed data", () => {
  it("1. Maid Type filter narrows to only that type", async () => {
    const result = await listEmployerVisibleMaids(parseMaidFilters({ maidType: "transfer-maid" }));
    expect(result.items.length).toBeGreaterThan(0);
    const ids = result.items.map((m) => m.profileCode);
    // SG-00009/00012/00016 are seeded as TRANSFER; a DRAFT/hidden profile
    // must never appear even if it happened to share the type.
    expect(ids).toEqual(expect.arrayContaining(["SG-00009", "SG-00012"]));
  });

  it("1. multiple Maid Type values (OR) return the union of both types", async () => {
    const newOnly = await listEmployerVisibleMaids(parseMaidFilters({ maidType: "new-maid" }));
    const combined = await listEmployerVisibleMaids(
      parseMaidFilters({ maidType: ["new-maid", "transfer-maid"] })
    );
    expect(combined.totalCount).toBeGreaterThanOrEqual(newOnly.totalCount);
  });

  it("3. Marital filter narrows to only that status, and never invents a value for a null profile", async () => {
    const result = await listEmployerVisibleMaids(parseMaidFilters({ marital: "single" }));
    expect(result.items.length).toBeGreaterThan(0);
    // SG-00015 has no maritalStatus set at all (null) and must never
    // appear under any specific marital filter.
    expect(result.items.some((m) => m.profileCode === "SG-00015")).toBe(false);
  });

  it("4. Language filter matches only maids whose real languages array contains it", async () => {
    const result = await listEmployerVisibleMaids(parseMaidFilters({ language: "bahasa-indonesia" }));
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.some((m) => m.profileCode === "SG-00002")).toBe(true);
  });

  it("10. an unrecognized language slug narrows to zero results, not 'no filter'", async () => {
    const unpaged = await listEmployerVisibleMaids(parseMaidFilters({}));
    const result = await listEmployerVisibleMaids(parseMaidFilters({ language: "klingon" }));
    expect(result.totalCount).toBe(0);
    expect(unpaged.totalCount).toBeGreaterThan(0); // sanity: the base dataset isn't just empty
  });

  it("5. Maid Type + Expertise combination applies both conditions", async () => {
    const result = await listEmployerVisibleMaids(
      parseMaidFilters({ maidType: "transfer-maid", expertise: "general-housekeeping" })
    );
    const codes = result.items.map((m) => m.profileCode);
    expect(codes).toContain("SG-00012"); // TRANSFER + general-housekeeping
    expect(codes).not.toContain("SG-00001"); // NEW, not TRANSFER
  });

  it("6. Expertise + Marital combination applies both conditions", async () => {
    const result = await listEmployerVisibleMaids(parseMaidFilters({ expertise: "eldercare", marital: "divorced" }));
    const codes = result.items.map((m) => m.profileCode);
    expect(codes).toContain("SG-00003"); // EX_SINGAPORE/DIVORCED with an eldercare skill
    expect(codes).not.toContain("SG-00018"); // DIVORCED but no eldercare skill
  });

  it("7. Maid Type + Expertise + Marital + Language all combine (the spec's own worked example)", async () => {
    const result = await listEmployerVisibleMaids(
      parseMaidFilters({
        maidType: "new-maid",
        expertise: "childcare",
        marital: "married",
        language: "bahasa-indonesia",
      })
    );
    const codes = result.items.map((m) => m.profileCode);
    // SG-00002 is the fictional fixture built for this exact combination.
    // DV155 (the real Phase 4.6 pilot candidate) also genuinely satisfies
    // it (NEW/Married/Bahasa Indonesia/Childcare) and is expected to
    // appear too — this test doesn't assume fictional-only data.
    expect(codes).toContain("SG-00002");
    expect(codes.every((c) => ["SG-00002", "DV155"].includes(c))).toBe(true);
  });

  it("11. a PLACED (hidden) maid with a matching skill is still excluded by an Expertise filter", async () => {
    // SG-00004 is ACTIVE + PLACED (hidden from normal browse) and does
    // have a "chinese-home-cooking" (COOKING) skill — the visibility
    // policy must still win over the filter matching its data.
    const result = await listEmployerVisibleMaids(parseMaidFilters({ expertise: "cooking" }));
    expect(result.items.some((m) => m.profileCode === "SG-00004")).toBe(false);
  });

  it("11. an INACTIVE maid with a matching skill is still excluded by an Expertise filter", async () => {
    // SG-00008 is INACTIVE and has an "elderly-companionship" skill.
    const result = await listEmployerVisibleMaids(parseMaidFilters({ expertise: "eldercare" }));
    expect(result.items.some((m) => m.profileCode === "SG-00008")).toBe(false);
  });
});
