import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";

/**
 * Tests #3–#7 from the Phase 3 spec, plus the Step 28 filter/pagination
 * checks and the Phase 4.6.3 filter combinations — run against the REAL
 * development database (sgmaid-dev), not a mock. Only `@/auth`'s auth() is
 * mocked (to simulate a signed-in session) — the Prisma client, the
 * visibility policy, and every query below are the genuine
 * lib/services/maids.ts code path.
 *
 * This suite does NOT depend on any permanently seeded maid profile. The
 * fictional demo candidates that prisma/seed.ts used to create were
 * removed (real pilot data is what lives in the database now), and real
 * candidates must never be assumed or asserted on here. Instead,
 * beforeAll creates a small set of throwaway, clearly fictional
 * MaidProfile fixtures (profileCode prefix ZZTEST-P3-) engineered for
 * exactly the visibility states and maidType/expertise/marital/language
 * combinations the assertions need, and afterAll deletes them (children
 * cascade). Assertions are written to hold even when real profiles are
 * also present and visible: they check that specific fixtures are
 * included/excluded, never that the whole result set equals something.
 *
 * Requires DATABASE_URL (see tests/setup.ts) and the reference-data seed
 * (Skill + TrainingModule taxonomy — `npx prisma db seed`) to be loaded;
 * those are taxonomy rows this suite only reads, never modifies.
 */

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const { listEmployerVisibleMaids, getEmployerVisibleMaidProfile } = await import("@/lib/services/maids");
const { parseMaidFilters } = await import("@/lib/validation/maid-filters");

const TEST_EMPLOYER_EMAIL = "phase3-integration-test@example.test";
let testEmployerId: string;

const P = "ZZTEST-P3-";
const CODE = {
  VISIBLE: `${P}01`, // ACTIVE+AVAILABLE, NEW, MARRIED, Bahasa Indonesia, childcare+housekeeping, has training/history
  TRANSFER_HOUSEKEEPING: `${P}02`, // ACTIVE+AVAILABLE, TRANSFER, SINGLE, housekeeping
  TRANSFER_COOKING: `${P}03`, // ACTIVE+AVAILABLE, TRANSFER, cooking
  EX_SG_DIVORCED_ELDER: `${P}04`, // ACTIVE+RESERVED, EX_SINGAPORE, DIVORCED, eldercare, Filipino
  DIVORCED_NO_ELDER: `${P}05`, // ACTIVE+AVAILABLE, NEW, DIVORCED, housekeeping only
  NULL_MARITAL: `${P}06`, // ACTIVE+AVAILABLE, marital left null
  DRAFT: `${P}07`, // DRAFT (with an eldercare skill)
  INACTIVE: `${P}08`, // INACTIVE (with an eldercare skill)
  PLACED: `${P}09`, // ACTIVE + PLACED (with a cooking skill) — hidden
  UNAVAILABLE: `${P}10`, // ACTIVE + UNAVAILABLE — hidden
};
const ALL_CODES = Object.values(CODE);

type FixtureSpec = {
  code: string;
  name: string;
  nationality?: string;
  profileStatus: "DRAFT" | "ACTIVE" | "INACTIVE";
  availabilityStatus: "AVAILABLE" | "RESERVED" | "PLACED" | "UNAVAILABLE";
  maidType?: "NEW" | "TRANSFER" | "EX_SINGAPORE" | "EX_OTHERS";
  maritalStatus?: "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED";
  languages?: string[];
  skillSlugs?: string[];
  withTrainingAndHistory?: boolean;
};

const FIXTURES: FixtureSpec[] = [
  { code: CODE.VISIBLE, name: "[Fictional] Test Visible", profileStatus: "ACTIVE", availabilityStatus: "AVAILABLE", maidType: "NEW", maritalStatus: "MARRIED", languages: ["Bahasa Indonesia"], skillSlugs: ["school-age-childcare", "general-housekeeping"], withTrainingAndHistory: true },
  { code: CODE.TRANSFER_HOUSEKEEPING, name: "[Fictional] Test Transfer Housekeeping", profileStatus: "ACTIVE", availabilityStatus: "AVAILABLE", maidType: "TRANSFER", maritalStatus: "SINGLE", languages: ["English"], skillSlugs: ["general-housekeeping"] },
  { code: CODE.TRANSFER_COOKING, name: "[Fictional] Test Transfer Cooking", profileStatus: "ACTIVE", availabilityStatus: "AVAILABLE", maidType: "TRANSFER", maritalStatus: "SINGLE", skillSlugs: ["chinese-home-cooking"] },
  { code: CODE.EX_SG_DIVORCED_ELDER, name: "[Fictional] Test ExSG Elder", nationality: "Filipino", profileStatus: "ACTIVE", availabilityStatus: "RESERVED", maidType: "EX_SINGAPORE", maritalStatus: "DIVORCED", skillSlugs: ["elderly-companionship"] },
  { code: CODE.DIVORCED_NO_ELDER, name: "[Fictional] Test Divorced NoElder", profileStatus: "ACTIVE", availabilityStatus: "AVAILABLE", maidType: "NEW", maritalStatus: "DIVORCED", skillSlugs: ["general-housekeeping"] },
  { code: CODE.NULL_MARITAL, name: "[Fictional] Test Null Marital", profileStatus: "ACTIVE", availabilityStatus: "AVAILABLE", maidType: "NEW" },
  { code: CODE.DRAFT, name: "[Fictional] Test Draft", profileStatus: "DRAFT", availabilityStatus: "UNAVAILABLE", skillSlugs: ["elderly-companionship"] },
  { code: CODE.INACTIVE, name: "[Fictional] Test Inactive", profileStatus: "INACTIVE", availabilityStatus: "AVAILABLE", skillSlugs: ["elderly-companionship"] },
  { code: CODE.PLACED, name: "[Fictional] Test Placed", profileStatus: "ACTIVE", availabilityStatus: "PLACED", skillSlugs: ["chinese-home-cooking"] },
  { code: CODE.UNAVAILABLE, name: "[Fictional] Test Unavailable", profileStatus: "ACTIVE", availabilityStatus: "UNAVAILABLE" },
];

async function idFor(profileCode: string): Promise<string> {
  const row = await prisma.maidProfile.findUniqueOrThrow({ where: { profileCode }, select: { id: true } });
  return row.id;
}

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      fullName: "[Fictional] Phase 3 Integration Test",
      email: TEST_EMPLOYER_EMAIL,
      role: "EMPLOYER",
      status: "ACTIVE",
      // Phase 8: an EMPLOYER now needs an unexpired accessExpiresAt to pass requireEmployer().
      accessExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  testEmployerId = user.id;
  mockAuth.mockResolvedValue({ user: { id: testEmployerId }, sessionVersion: 0 });

  // Reference taxonomy — read only, never modified here.
  const trainingModule = await prisma.trainingModule.findFirstOrThrow({ select: { id: true } });

  for (const f of FIXTURES) {
    await prisma.maidProfile.create({
      data: {
        profileCode: f.code,
        name: f.name,
        nationality: f.nationality ?? "Indonesian",
        dateOfBirth: new Date("1990-01-01"),
        languages: f.languages ?? [],
        yearsExperience: 3,
        profileStatus: f.profileStatus,
        availabilityStatus: f.availabilityStatus,
        maidType: f.maidType ?? null,
        maritalStatus: f.maritalStatus ?? null,
        skills: f.skillSlugs?.length
          ? { create: f.skillSlugs.map((slug) => ({ skill: { connect: { slug } } })) }
          : undefined,
        trainings: f.withTrainingAndHistory
          ? { create: [{ trainingModule: { connect: { id: trainingModule.id } }, completed: true, completedAt: new Date("2023-01-01") }] }
          : undefined,
        employmentHistory: f.withTrainingAndHistory
          ? { create: [{ country: "Singapore", startYear: 2020, endYear: 2022, duties: "Fictional test duties" }] }
          : undefined,
      },
    });
  }
});

afterAll(async () => {
  // Children (skills/trainings/history/documents/shortlist) cascade.
  await prisma.maidProfile.deleteMany({ where: { profileCode: { in: ALL_CODES } } });
  await prisma.user.delete({ where: { id: testEmployerId } });
  await prisma.$disconnect();
});

describe("employer visibility — real database", () => {
  it("3. an ACTIVE + AVAILABLE/RESERVED profile is returned in the listing", async () => {
    const result = await listEmployerVisibleMaids(parseMaidFilters({ search: CODE.VISIBLE }));
    expect(result.items.some((m) => m.profileCode === CODE.VISIBLE)).toBe(true);
  });

  it("4. a DRAFT profile is excluded from the listing", async () => {
    const result = await listEmployerVisibleMaids(parseMaidFilters({ search: CODE.DRAFT }));
    expect(result.items.some((m) => m.profileCode === CODE.DRAFT)).toBe(false);
    expect(result.totalCount).toBe(0);
  });

  it("5. an INACTIVE profile is excluded from the listing", async () => {
    const result = await listEmployerVisibleMaids(parseMaidFilters({ search: CODE.INACTIVE }));
    expect(result.items.some((m) => m.profileCode === CODE.INACTIVE)).toBe(false);
    expect(result.totalCount).toBe(0);
  });

  it("6. PLACED and UNAVAILABLE profiles are excluded from normal browse", async () => {
    const placedResult = await listEmployerVisibleMaids(parseMaidFilters({ search: CODE.PLACED }));
    const unavailableResult = await listEmployerVisibleMaids(parseMaidFilters({ search: CODE.UNAVAILABLE }));
    expect(placedResult.totalCount).toBe(0);
    expect(unavailableResult.totalCount).toBe(0);
  });

  it("7. direct profile lookup cannot retrieve a DRAFT, INACTIVE, or hidden-availability profile", async () => {
    const [draftId, inactiveId, placedId, unavailableId] = await Promise.all([
      idFor(CODE.DRAFT),
      idFor(CODE.INACTIVE),
      idFor(CODE.PLACED),
      idFor(CODE.UNAVAILABLE),
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

  it("a visible profile's short-profile DTO includes a real Expertise summary, and never trainings/employmentHistory", async () => {
    const id = await idFor(CODE.VISIBLE);
    const profile = await getEmployerVisibleMaidProfile(id);

    expect(profile).not.toBeNull();
    expect(profile!.profileCode).toBe(CODE.VISIBLE);
    expect(profile!.expertise.length).toBeGreaterThan(0);
    // Phase 4.6.5: the employer-facing DTO no longer selects or exposes
    // these at all — this is a data-layer guarantee, not just something
    // the page happens not to render.
    expect(profile).not.toHaveProperty("trainings");
    expect(profile).not.toHaveProperty("employmentHistory");
    expect(profile).not.toHaveProperty("skills");
  });

  it("Phase 4.6.5: MaidTraining and EmploymentHistory rows still exist in Postgres for that profile, untouched — only the employer-facing DTO stopped exposing them", async () => {
    const id = await idFor(CODE.VISIBLE);
    const [trainingCount, historyCount, skillCount] = await Promise.all([
      prisma.maidTraining.count({ where: { maidId: id } }),
      prisma.employmentHistory.count({ where: { maidId: id } }),
      prisma.maidSkill.count({ where: { maidId: id } }),
    ]);
    expect(trainingCount).toBeGreaterThan(0);
    expect(historyCount).toBeGreaterThan(0);
    expect(skillCount).toBeGreaterThan(0);
  });
});

describe("filters against isolated fixtures", () => {
  it("nationality filter narrows results to that nationality only", async () => {
    const result = await listEmployerVisibleMaids(parseMaidFilters({ nationality: "Indonesian" }));
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((m) => m.nationality === "Indonesian")).toBe(true);
  });

  it("2. expertise category filter returns only maids with a skill in that category", async () => {
    const result = await listEmployerVisibleMaids(parseMaidFilters({ expertise: "eldercare" }));
    const codes = result.items.map((m) => m.profileCode);
    expect(codes).toContain(CODE.EX_SG_DIVORCED_ELDER);
    expect(codes).not.toContain(CODE.DIVORCED_NO_ELDER);
  });

  it("nationality + expertise combination narrows further than either alone", async () => {
    const nationalityOnly = await listEmployerVisibleMaids(parseMaidFilters({ nationality: "Filipino" }));
    const combined = await listEmployerVisibleMaids(
      parseMaidFilters({ nationality: "Filipino", expertise: "eldercare" })
    );
    expect(combined.totalCount).toBeLessThanOrEqual(nationalityOnly.totalCount);
    expect(combined.items.map((m) => m.profileCode)).toContain(CODE.EX_SG_DIVORCED_ELDER);
    expect(combined.items.every((m) => m.nationality === "Filipino")).toBe(true);
  });

  it("search + nationality combination applies both conditions", async () => {
    const result = await listEmployerVisibleMaids(parseMaidFilters({ search: "ZZTEST-P3", nationality: "Indonesian" }));
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((m) => m.nationality === "Indonesian" && m.profileCode.includes("ZZTEST-P3"))).toBe(true);
  });

  it("availability filter only ever returns AVAILABLE or RESERVED, never anything hidden", async () => {
    const available = await listEmployerVisibleMaids(parseMaidFilters({ availability: "AVAILABLE" }));
    const reserved = await listEmployerVisibleMaids(parseMaidFilters({ availability: "RESERVED" }));
    expect(available.items.every((m) => m.availabilityStatus === "AVAILABLE")).toBe(true);
    expect(reserved.items.every((m) => m.availabilityStatus === "RESERVED")).toBe(true);
    expect(reserved.items.map((m) => m.profileCode)).toContain(CODE.EX_SG_DIVORCED_ELDER);
  });

  it("pagination: page 1 and page 2 never overlap, and never exceed the result set", async () => {
    const page1 = await listEmployerVisibleMaids(parseMaidFilters({ page: "1" }));
    if (page1.totalPages < 2) {
      // Fewer visible profiles than one page — nothing to page through
      // (real data alone may be below one page; this must not be assumed).
      expect(page1.items.length).toBe(page1.totalCount);
      return;
    }
    const page2 = await listEmployerVisibleMaids(parseMaidFilters({ page: "2" }));

    const page1Ids = new Set(page1.items.map((m) => m.id));
    expect(page2.items.filter((m) => page1Ids.has(m.id)).length).toBe(0);
    expect(page1.items.length + page2.items.length).toBeLessThanOrEqual(Math.max(page1.totalCount, page2.totalCount));
  });
});

/**
 * Phase 4.6.3 — Maid Type, Expertise (multi-select), Marital, and
 * Language filters, run against the real database so the actual Prisma
 * queries (not a mocked stand-in) are proven. Fixtures above are built
 * specifically to make each combination deterministic.
 */
describe("Phase 4.6.3 filters against isolated fixtures", () => {
  it("1. Maid Type filter narrows to only that type", async () => {
    const result = await listEmployerVisibleMaids(parseMaidFilters({ maidType: "transfer-maid" }));
    const codes = result.items.map((m) => m.profileCode);
    expect(codes).toEqual(expect.arrayContaining([CODE.TRANSFER_HOUSEKEEPING, CODE.TRANSFER_COOKING]));
    expect(codes).not.toContain(CODE.VISIBLE); // NEW, not TRANSFER
  });

  it("1. multiple Maid Type values (OR) return the union of both types", async () => {
    const newOnly = await listEmployerVisibleMaids(parseMaidFilters({ maidType: "new-maid" }));
    const combined = await listEmployerVisibleMaids(
      parseMaidFilters({ maidType: ["new-maid", "transfer-maid"] })
    );
    expect(combined.totalCount).toBeGreaterThanOrEqual(newOnly.totalCount);
    expect(combined.items.map((m) => m.profileCode)).toContain(CODE.TRANSFER_COOKING);
  });

  it("3. Marital filter narrows to only that status, and never invents a value for a null profile", async () => {
    const result = await listEmployerVisibleMaids(parseMaidFilters({ marital: "single" }));
    const codes = result.items.map((m) => m.profileCode);
    expect(codes).toContain(CODE.TRANSFER_HOUSEKEEPING);
    // A profile with no maritalStatus at all must never appear under any specific marital filter.
    expect(codes).not.toContain(CODE.NULL_MARITAL);
  });

  it("4. Language filter matches only maids whose real languages array contains it", async () => {
    const result = await listEmployerVisibleMaids(parseMaidFilters({ language: "bahasa-indonesia" }));
    const codes = result.items.map((m) => m.profileCode);
    expect(codes).toContain(CODE.VISIBLE);
    expect(codes).not.toContain(CODE.TRANSFER_HOUSEKEEPING); // English only
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
    expect(codes).toContain(CODE.TRANSFER_HOUSEKEEPING); // TRANSFER + housekeeping
    expect(codes).not.toContain(CODE.TRANSFER_COOKING); // TRANSFER but no housekeeping
    expect(codes).not.toContain(CODE.VISIBLE); // housekeeping but NEW, not TRANSFER
  });

  it("6. Expertise + Marital combination applies both conditions", async () => {
    const result = await listEmployerVisibleMaids(parseMaidFilters({ expertise: "eldercare", marital: "divorced" }));
    const codes = result.items.map((m) => m.profileCode);
    expect(codes).toContain(CODE.EX_SG_DIVORCED_ELDER); // DIVORCED with an eldercare skill
    expect(codes).not.toContain(CODE.DIVORCED_NO_ELDER); // DIVORCED but no eldercare skill
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
    // The fixture built for this exact combination must appear; fixtures
    // that satisfy only part of it must not. Real profiles that also
    // genuinely satisfy every condition may legitimately appear too.
    expect(codes).toContain(CODE.VISIBLE);
    expect(codes).not.toContain(CODE.DIVORCED_NO_ELDER);
    expect(codes).not.toContain(CODE.TRANSFER_HOUSEKEEPING);
  });

  it("11. a PLACED (hidden) maid with a matching skill is still excluded by an Expertise filter", async () => {
    // ACTIVE + PLACED (hidden from normal browse) with a COOKING skill —
    // the visibility policy must still win over the filter matching its data.
    const result = await listEmployerVisibleMaids(parseMaidFilters({ expertise: "cooking" }));
    const codes = result.items.map((m) => m.profileCode);
    expect(codes).toContain(CODE.TRANSFER_COOKING);
    expect(codes).not.toContain(CODE.PLACED);
  });

  it("11. an INACTIVE maid with a matching skill is still excluded by an Expertise filter", async () => {
    const result = await listEmployerVisibleMaids(parseMaidFilters({ expertise: "eldercare" }));
    expect(result.items.some((m) => m.profileCode === CODE.INACTIVE)).toBe(false);
    expect(result.items.some((m) => m.profileCode === CODE.DRAFT)).toBe(false);
  });
});
