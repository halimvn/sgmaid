import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";

/**
 * Admin "Add New Maid" form: Years of Experience accepts decimals, and an
 * Employment History row's End Year is free text ("Current", "Now", or a
 * year).
 *
 * Part 1 — pure form-parsing tests (no DB).
 * Part 2 — against the REAL development database with throwaway fictional
 *   fixtures (ZZTEST-DEC-*, deleted in afterAll): the new column types
 *   really store 2.5 and "Current", and the employer experience filter has
 *   no gap for part-year values (2.5 used to match neither "0–2" nor "3–5").
 */

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const { parseAdminMaidForm } = await import("@/lib/validation/admin-maid");
const { parseMaidFilters } = await import("@/lib/validation/maid-filters");
const { listEmployerVisibleMaids } = await import("@/lib/services/maids");

function form(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const base: Record<string, string> = {
    profileCode: "ZZTEST-DEC-FORM",
    name: "[Fictional] Form Test",
    maidType: "NEW",
    profileStatus: "DRAFT",
    availabilityStatus: "UNAVAILABLE",
  };
  for (const [k, v] of Object.entries({ ...base, ...overrides })) fd.set(k, v);
  return fd;
}

describe("Years of Experience — form parsing", () => {
  it.each([
    ["2", 2],
    ["2.5", 2.5],
    ["0.5", 0.5],
    ["0", 0],
    ["10.25", 10.25],
  ])("accepts %s", (input, expected) => {
    const result = parseAdminMaidForm(form({ yearsExperience: input }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.yearsExperience).toBe(expected);
  });

  it("treats a blank value as not provided", () => {
    const result = parseAdminMaidForm(form({ yearsExperience: "" }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.yearsExperience).toBeUndefined();
  });

  it.each(["-1", "abc", "61", "1e999"])("rejects %s", (input) => {
    expect(parseAdminMaidForm(form({ yearsExperience: input })).success).toBe(false);
  });

  it("height and weight are still whole numbers only", () => {
    expect(parseAdminMaidForm(form({ heightCm: "157.5" })).success).toBe(false);
    expect(parseAdminMaidForm(form({ weightKg: "60.5" })).success).toBe(false);
  });
});

describe("Employment History End Year — form parsing", () => {
  function parsedRow(endYear: string) {
    const result = parseAdminMaidForm(
      form({ "employmentHistory.0.country": "Singapore", "employmentHistory.0.endYear": endYear })
    );
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("form should have parsed");
    return result.data.employmentHistory[0];
  }

  it.each(["Current", "Now", "now", "Present", "2025"])("accepts %s as text", (input) => {
    expect(parsedRow(input)?.endYear).toBe(input);
  });

  it("trims whitespace", () => {
    expect(parsedRow("  Current  ")?.endYear).toBe("Current");
  });

  it("treats blank as not provided", () => {
    expect(parsedRow("")?.endYear).toBeUndefined();
  });

  it("rejects an absurdly long value", () => {
    const result = parseAdminMaidForm(
      form({ "employmentHistory.0.country": "Singapore", "employmentHistory.0.endYear": "x".repeat(31) })
    );
    expect(result.success).toBe(false);
  });

  it("start year is still a validated year number", () => {
    const result = parseAdminMaidForm(
      form({ "employmentHistory.0.country": "Singapore", "employmentHistory.0.startYear": "Current" })
    );
    expect(result.success).toBe(false);
  });
});

const P = "ZZTEST-DEC-";
const FIXTURES = [
  { code: `${P}A`, years: 0.5 },
  { code: `${P}B`, years: 2 },
  { code: `${P}C`, years: 2.5 }, // the old gap: not <=2, not >=3
  { code: `${P}D`, years: 3 },
  { code: `${P}E`, years: 5 }, // boundary: in both "3–5" and "5+", unchanged
  { code: `${P}F`, years: 5.5 },
];
const TEST_EMPLOYER_EMAIL = "decimal-experience-test@example.test";
let employerId: string;

async function codesFor(experience: string): Promise<string[]> {
  const out: string[] = [];
  let page = 1;
  // Real pilot profiles may also be present; page through and keep only our fixtures.
  for (;;) {
    const result = await listEmployerVisibleMaids(parseMaidFilters({ experience, page: String(page) }));
    out.push(...result.items.map((m) => m.profileCode));
    if (page >= result.totalPages) break;
    page++;
  }
  return out.filter((c) => c.startsWith(P));
}

describe("Decimal years and text end year — real database", () => {
  beforeAll(async () => {
    await prisma.maidProfile.deleteMany({ where: { profileCode: { startsWith: P } } });
    const employer = await prisma.user.create({
      data: {
        fullName: "[Fictional] Decimal Experience Test",
        email: TEST_EMPLOYER_EMAIL,
        role: "EMPLOYER",
        status: "ACTIVE",
        accessExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    employerId = employer.id;
    mockAuth.mockResolvedValue({ user: { id: employerId }, sessionVersion: 0 });

    for (const f of FIXTURES) {
      await prisma.maidProfile.create({
        data: {
          profileCode: f.code,
          name: `[Fictional] ${f.code}`,
          nationality: "Indonesian",
          yearsExperience: f.years,
          profileStatus: "ACTIVE",
          availabilityStatus: "AVAILABLE",
          employmentHistory:
            f.code === `${P}A`
              ? {
                  create: [
                    { country: "Singapore", startYear: 2023, endYear: "Current" },
                    { country: "Hong Kong", startYear: 2019, endYear: "2022" },
                  ],
                }
              : undefined,
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.maidProfile.deleteMany({ where: { profileCode: { startsWith: P } } });
    if (employerId) await prisma.user.delete({ where: { id: employerId } }).catch(() => {});
    await prisma.$disconnect();
  });

  it("stores and returns a decimal years-of-experience value exactly", async () => {
    const row = await prisma.maidProfile.findUniqueOrThrow({ where: { profileCode: `${P}C` } });
    expect(row.yearsExperience).toBe(2.5);
  });

  it("stores 'Current' as an end year and a plain year as its text form, in order", async () => {
    const row = await prisma.maidProfile.findUniqueOrThrow({
      where: { profileCode: `${P}A` },
      select: { employmentHistory: { orderBy: { startYear: "desc" }, select: { country: true, endYear: true } } },
    });
    expect(row.employmentHistory).toEqual([
      { country: "Singapore", endYear: "Current" },
      { country: "Hong Kong", endYear: "2022" },
    ]);
  });

  it("'0–2 years' includes 2.5 (no gap before '3–5'), and excludes 3 and above", async () => {
    const codes = await codesFor("0-2");
    expect(codes.sort()).toEqual([`${P}A`, `${P}B`, `${P}C`]);
  });

  it("'3–5 years' still includes 3 and 5, and excludes part-years above 5 and below 3", async () => {
    const codes = await codesFor("3-5");
    expect(codes.sort()).toEqual([`${P}D`, `${P}E`]);
  });

  it("'5+ years' includes 5 and 5.5", async () => {
    const codes = await codesFor("5-plus");
    expect(codes.sort()).toEqual([`${P}E`, `${P}F`]);
  });

  it("every fixture, whatever its decimal value, matches at least one experience bucket", async () => {
    const all = new Set([...(await codesFor("0-2")), ...(await codesFor("3-5")), ...(await codesFor("5-plus"))]);
    for (const f of FIXTURES) expect(all.has(f.code)).toBe(true);
  });
});
