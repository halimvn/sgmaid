import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests #1, #2, #8, #9, #10, #13 from the Phase 3 spec: the maid service
 * (lib/services/maids.ts) against a MOCKED Prisma client — these prove
 * the service's own authorization/DTO-shape behaviour in isolation,
 * independent of what's actually seeded in the real database. See
 * tests/maids-integration.test.ts for the real-database visibility
 * proof (tests #3–#7).
 */

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  maidProfile: { findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

class RedirectSignal extends Error {
  constructor(public url: string) {
    super(`REDIRECT:${url}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
}));

const { listEmployerVisibleMaids, getEmployerVisibleMaidProfile } = await import("@/lib/services/maids");
const { parseMaidFilters } = await import("@/lib/validation/maid-filters");

function activeEmployerDbUser() {
  return {
    id: "emp_1",
    fullName: "[Fictional] Test Employer",
    email: "employer@example.test",
    role: "EMPLOYER",
    status: "ACTIVE",
    sessionVersion: 0,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listEmployerVisibleMaids authorization boundary", () => {
  it("1. rejects an unauthenticated caller before ever querying maid data", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(listEmployerVisibleMaids(parseMaidFilters({}))).rejects.toThrow(/REDIRECT:\/login/);
    expect(mockPrisma.maidProfile.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.maidProfile.count).not.toHaveBeenCalled();
  });
});

describe("getEmployerVisibleMaidProfile authorization boundary", () => {
  it("2. rejects an unauthenticated caller before ever querying maid data", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(getEmployerVisibleMaidProfile("some-id")).rejects.toThrow(/REDIRECT:\/login/);
    expect(mockPrisma.maidProfile.findFirst).not.toHaveBeenCalled();
  });
});

describe("employer-safe DTOs never leak internalNotes", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ user: { id: "emp_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(activeEmployerDbUser());
  });

  it("8. internalNotes never appears in the listing DTO, even if the row carries one", async () => {
    // Simulates a defensive worst case: the row somehow has an
    // internalNotes value attached. The DTO mapping step must produce an
    // object that simply doesn't contain it — not merely omit it from
    // rendering.
    mockPrisma.maidProfile.findMany.mockResolvedValue([
      {
        id: "m1",
        profileCode: "SG-00001",
        name: "[Fictional] Test Maid",
        photoUrl: null,
        nationality: "Indonesian",
        dateOfBirth: new Date("1990-01-01"),
        yearsExperience: 5,
        availabilityStatus: "AVAILABLE",
        skills: [],
        documents: [],
        internalNotes: "[SECRET STAFF-ONLY NOTE — must never reach an employer]",
      },
    ]);
    mockPrisma.maidProfile.count.mockResolvedValue(1);

    const result = await listEmployerVisibleMaids(parseMaidFilters({}));

    expect(JSON.stringify(result)).not.toContain("SECRET STAFF-ONLY NOTE");
    expect(JSON.stringify(result)).not.toContain("internalNotes");
  });

  it("9. internalNotes never appears in the detail DTO, even if the row carries one", async () => {
    mockPrisma.maidProfile.findFirst.mockResolvedValue({
      id: "m1",
      profileCode: "SG-00001",
      name: "[Fictional] Test Maid",
      photoUrl: null,
      nationality: "Indonesian",
      dateOfBirth: new Date("1990-01-01"),
      languages: ["English"],
      yearsExperience: 5,
      availabilityStatus: "AVAILABLE",
      skills: [],
      documents: [],
      internalNotes: "[SECRET STAFF-ONLY NOTE — must never reach an employer]",
    });

    const result = await getEmployerVisibleMaidProfile("m1");

    expect(JSON.stringify(result)).not.toContain("SECRET STAFF-ONLY NOTE");
    expect(JSON.stringify(result)).not.toContain("internalNotes");
  });

  it("9b. storagePath (biodata document location) never appears in the profile DTO", async () => {
    mockPrisma.maidProfile.findFirst.mockResolvedValue({
      id: "m1",
      profileCode: "SG-00001",
      name: "[Fictional] Test Maid",
      photoUrl: null,
      nationality: "Indonesian",
      dateOfBirth: new Date("1990-01-01"),
      languages: ["English"],
      yearsExperience: 5,
      availabilityStatus: "AVAILABLE",
      heightCm: 160,
      weightKg: 55,
      maritalStatus: "SINGLE",
      maidType: "NEW",
      skills: [],
      // Phase 4.6.2: the maids.ts query does join MaidDocument now, but
      // only ever selects `type` (to resolve photoUrl for an approved
      // PROFILE_PHOTO) — storagePath is never part of that select. This
      // simulates a worst case (an accidental future select widening) and
      // proves the DTO mapping still wouldn't surface it, since only
      // named fields are copied across.
      documents: [{ type: "BIODATA_PDF", storagePath: "SG-00001/biodata.pdf" }],
    });

    const result = await getEmployerVisibleMaidProfile("m1");

    expect(JSON.stringify(result)).not.toContain("storagePath");
    expect(JSON.stringify(result)).not.toContain("biodata.pdf");
  });

  it("9c. an approved PROFILE_PHOTO document resolves photoUrl to the secure route, never a raw path", async () => {
    mockPrisma.maidProfile.findFirst.mockResolvedValue({
      id: "m1",
      profileCode: "SG-00001",
      name: "[Fictional] Test Maid",
      photoUrl: null,
      nationality: "Indonesian",
      dateOfBirth: new Date("1990-01-01"),
      languages: ["English"],
      yearsExperience: 5,
      availabilityStatus: "AVAILABLE",
      heightCm: null,
      weightKg: null,
      maritalStatus: null,
      maidType: null,
      skills: [],
      documents: [{ type: "PROFILE_PHOTO" }],
    });

    const result = await getEmployerVisibleMaidProfile("m1");

    expect(result?.photoUrl).toBe("/dashboard/maids/m1/photo");
  });

  it("9d. no PROFILE_PHOTO document leaves photoUrl as the raw column value (null for every current record)", async () => {
    mockPrisma.maidProfile.findFirst.mockResolvedValue({
      id: "m1",
      profileCode: "SG-00001",
      name: "[Fictional] Test Maid",
      photoUrl: null,
      nationality: "Indonesian",
      dateOfBirth: new Date("1990-01-01"),
      languages: ["English"],
      yearsExperience: 5,
      availabilityStatus: "AVAILABLE",
      heightCm: null,
      weightKg: null,
      maritalStatus: null,
      maidType: null,
      skills: [],
      documents: [{ type: "BIODATA_PDF" }],
    });

    const result = await getEmployerVisibleMaidProfile("m1");

    expect(result?.photoUrl).toBeNull();
  });

  it("9e. Expertise is a deduplicated short summary of approved categories only — never individual skill names, notes, or PET_CARE", async () => {
    mockPrisma.maidProfile.findFirst.mockResolvedValue({
      id: "m1",
      profileCode: "SG-00001",
      name: "[Fictional] Test Maid",
      photoUrl: null,
      nationality: "Indonesian",
      dateOfBirth: new Date("1990-01-01"),
      languages: ["English"],
      yearsExperience: 5,
      availabilityStatus: "AVAILABLE",
      heightCm: null,
      weightKg: null,
      maritalStatus: null,
      maidType: null,
      skills: [
        { skill: { category: "CHILDCARE", name: "School-Age Childcare" } },
        { skill: { category: "CHILDCARE", name: "Infant Care" } }, // two skills, same category — must dedupe
        { skill: { category: "PET_CARE", name: "Pet Care (Dogs)" } }, // real category, not on the approved 5 — must be excluded
      ],
      documents: [],
    });

    const result = await getEmployerVisibleMaidProfile("m1");

    expect(result?.expertise).toEqual(["Childcare"]);
    expect(JSON.stringify(result)).not.toContain("School-Age Childcare");
    expect(JSON.stringify(result)).not.toContain("Infant Care");
    expect(JSON.stringify(result)).not.toContain("Pet Care");
    expect(JSON.stringify(result)).not.toContain("PET_CARE");
  });

  it("9f. the detail DTO never contains trainings or employmentHistory (Phase 4.6.5: short profile only)", async () => {
    mockPrisma.maidProfile.findFirst.mockResolvedValue({
      id: "m1",
      profileCode: "SG-00001",
      name: "[Fictional] Test Maid",
      photoUrl: null,
      nationality: "Indonesian",
      dateOfBirth: new Date("1990-01-01"),
      languages: ["English"],
      yearsExperience: 5,
      availabilityStatus: "AVAILABLE",
      heightCm: null,
      weightKg: null,
      maritalStatus: null,
      maidType: null,
      skills: [],
      documents: [],
    });

    const result = await getEmployerVisibleMaidProfile("m1");

    expect(result).not.toHaveProperty("trainings");
    expect(result).not.toHaveProperty("employmentHistory");
    expect(Object.keys(result!).sort()).toEqual(
      [
        "id",
        "profileCode",
        "name",
        "photoUrl",
        "nationality",
        "age",
        "languages",
        "yearsExperience",
        "availabilityStatus",
        "heightCm",
        "weightKg",
        "maritalStatus",
        "maidType",
        "expertise",
      ].sort()
    );
  });

  it("10. the listing DTO contains only the fields MaidCard needs — no full relations", async () => {
    mockPrisma.maidProfile.findMany.mockResolvedValue([
      {
        id: "m1",
        profileCode: "SG-00001",
        name: "[Fictional] Test Maid",
        photoUrl: null,
        nationality: "Indonesian",
        dateOfBirth: null,
        yearsExperience: 5,
        availabilityStatus: "AVAILABLE",
        skills: [{ skill: { name: "General Housekeeping" } }],
        documents: [],
      },
    ]);
    mockPrisma.maidProfile.count.mockResolvedValue(1);

    const result = await listEmployerVisibleMaids(parseMaidFilters({}));

    expect(Object.keys(result.items[0]).sort()).toEqual(
      ["id", "profileCode", "name", "photoUrl", "nationality", "age", "yearsExperience", "availabilityStatus", "skills"].sort()
    );
  });

  it("13. a filter value outside the employer-visible availability set cannot override the base visibility clause", async () => {
    mockPrisma.maidProfile.findMany.mockResolvedValue([]);
    mockPrisma.maidProfile.count.mockResolvedValue(0);

    // Simulates a validation bypass — parseMaidFilters() can never
    // actually produce this value, but the service must not trust its
    // own input type blindly either (see lib/services/maids.ts).
    const forgedFilters = { ...parseMaidFilters({}), availability: "PLACED" } as unknown as Parameters<
      typeof listEmployerVisibleMaids
    >[0];

    await listEmployerVisibleMaids(forgedFilters);

    const whereArg = mockPrisma.maidProfile.findMany.mock.calls[0][0].where;
    // The base policy clause must still be in force — either the
    // forged value was ignored (leaving the `in [...]` clause) or, at
    // minimum, whatever ended up in the query still cannot be "PLACED".
    expect(whereArg.availabilityStatus).not.toBe("PLACED");
    expect(whereArg.profileStatus).toBe("ACTIVE");
  });
});
