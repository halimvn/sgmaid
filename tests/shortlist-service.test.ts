import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests #1, #2, #3, #8, #9, #10, #13, #14, #15 from the Phase 4 spec —
 * the shortlist service (lib/services/shortlist.ts) against a MOCKED
 * Prisma client. See tests/shortlist-integration.test.ts for the
 * real-database ownership proof (#5, #6, #7, #11, #12) and the Step 19
 * two-employer scenario.
 */

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  maidProfile: { findFirst: vi.fn() },
  shortlist: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
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

const { getEmployerShortlist, addToShortlist, removeFromShortlist } = await import("@/lib/services/shortlist");

function dbUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "emp_1",
    fullName: "[Fictional] Test Employer",
    email: "employer@example.test",
    role: "EMPLOYER",
    status: "ACTIVE",
    sessionVersion: 0,
    // Phase 8: an EMPLOYER now needs an unexpired accessExpiresAt to pass
    // requireEmployer() — see lib/auth/authorize.ts.
    accessExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("shortlist service authorization boundary", () => {
  it("1. an unauthenticated caller cannot retrieve the shortlist", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(getEmployerShortlist()).rejects.toThrow(/REDIRECT:\/login/);
    expect(mockPrisma.shortlist.findMany).not.toHaveBeenCalled();
  });

  it("2. a PENDING user cannot retrieve the shortlist", async () => {
    mockAuth.mockResolvedValue({ user: { id: "emp_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser({ status: "PENDING" }));

    await expect(getEmployerShortlist()).rejects.toThrow(/REDIRECT:\/login/);
    expect(mockPrisma.shortlist.findMany).not.toHaveBeenCalled();
  });

  it("3. a SUSPENDED user cannot retrieve the shortlist", async () => {
    mockAuth.mockResolvedValue({ user: { id: "emp_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser({ status: "SUSPENDED" }));

    await expect(getEmployerShortlist()).rejects.toThrow(/REDIRECT:\/login/);
    expect(mockPrisma.shortlist.findMany).not.toHaveBeenCalled();
  });
});

describe("visibility enforcement on add", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ user: { id: "emp_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser());
  });

  it("8. a DRAFT profile cannot be newly shortlisted", async () => {
    // employerVisibleMaidWhere() excludes DRAFT, so the lookup finds nothing.
    mockPrisma.maidProfile.findFirst.mockResolvedValue(null);

    const result = await addToShortlist("draft-maid-id");

    expect(result).toEqual({ ok: false, reason: "NOT_VISIBLE" });
    expect(mockPrisma.shortlist.upsert).not.toHaveBeenCalled();
  });

  it("9. an INACTIVE profile cannot be newly shortlisted", async () => {
    mockPrisma.maidProfile.findFirst.mockResolvedValue(null);

    const result = await addToShortlist("inactive-maid-id");

    expect(result).toEqual({ ok: false, reason: "NOT_VISIBLE" });
    expect(mockPrisma.shortlist.upsert).not.toHaveBeenCalled();
  });

  it("10. a hidden-availability (PLACED/UNAVAILABLE) profile cannot be newly shortlisted", async () => {
    mockPrisma.maidProfile.findFirst.mockResolvedValue(null);

    const result = await addToShortlist("placed-maid-id");

    expect(result).toEqual({ ok: false, reason: "NOT_VISIBLE" });
    expect(mockPrisma.shortlist.upsert).not.toHaveBeenCalled();
  });

  it("15. a malformed maid id fails safely without ever reaching Prisma", async () => {
    const result = await addToShortlist("../../etc/passwd; DROP TABLE users;--");

    expect(result).toEqual({ ok: false, reason: "INVALID_ID" });
    expect(mockPrisma.maidProfile.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.shortlist.upsert).not.toHaveBeenCalled();
  });

  it("15. a malformed maid id fails safely on remove too", async () => {
    const result = await removeFromShortlist("");

    expect(result).toEqual({ ok: false, reason: "INVALID_ID" });
    expect(mockPrisma.shortlist.deleteMany).not.toHaveBeenCalled();
  });
});

describe("shortlist DTO privacy", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ user: { id: "emp_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser());
  });

  it("13. internalNotes never appears in the shortlist DTO, even if the row carries one", async () => {
    mockPrisma.shortlist.findMany.mockResolvedValue([
      {
        id: "sl_1",
        maidId: "m1",
        createdAt: new Date("2024-01-01"),
        maid: {
          profileCode: "SG-00001",
          name: "[Fictional] Test Maid",
          photoUrl: null,
          nationality: "Indonesian",
          dateOfBirth: new Date("1990-01-01"),
          yearsExperience: 5,
          profileStatus: "ACTIVE",
          availabilityStatus: "AVAILABLE",
          skills: [],
          documents: [],
          internalNotes: "[SECRET STAFF-ONLY NOTE]",
        },
      },
    ]);

    const result = await getEmployerShortlist();

    expect(JSON.stringify(result)).not.toContain("SECRET STAFF-ONLY NOTE");
    expect(JSON.stringify(result)).not.toContain("internalNotes");
  });

  it("14. a shortlisted maid that has become hidden (PLACED) exposes no profile details", async () => {
    mockPrisma.shortlist.findMany.mockResolvedValue([
      {
        id: "sl_1",
        maidId: "m1",
        createdAt: new Date("2024-01-01"),
        maid: {
          profileCode: "SG-00004",
          name: "[Fictional] Now Placed",
          photoUrl: "https://example.test/photo.jpg",
          nationality: "Indonesian",
          dateOfBirth: new Date("1990-01-01"),
          yearsExperience: 5,
          profileStatus: "ACTIVE",
          availabilityStatus: "PLACED", // hidden availability
          skills: [{ skill: { name: "General Housekeeping" } }],
        },
      },
    ]);

    const [item] = await getEmployerShortlist();

    expect(item.visible).toBe(false);
    expect(item.nationality).toBeNull();
    expect(item.age).toBeNull();
    expect(item.yearsExperience).toBeNull();
    expect(item.skills).toEqual([]);
    expect(item.photoUrl).toBeNull();
    // The internal reason (PLACED) itself must never surface anywhere in the DTO.
    expect(JSON.stringify(item)).not.toContain("PLACED");
    // Identity is intentionally kept — see lib/services/shortlist.ts.
    expect(item.name).toBe("[Fictional] Now Placed");
    expect(item.maidId).toBe("m1");
  });

  it("14b. a shortlisted DRAFT/INACTIVE maid also exposes no profile details", async () => {
    mockPrisma.shortlist.findMany.mockResolvedValue([
      {
        id: "sl_1",
        maidId: "m1",
        createdAt: new Date("2024-01-01"),
        maid: {
          profileCode: "SG-00007",
          name: "[Fictional] Now Inactive",
          photoUrl: null,
          nationality: "Indonesian",
          dateOfBirth: null,
          yearsExperience: 0,
          profileStatus: "INACTIVE",
          availabilityStatus: "UNAVAILABLE",
          skills: [],
        },
      },
    ]);

    const [item] = await getEmployerShortlist();

    expect(item.visible).toBe(false);
    expect(JSON.stringify(item)).not.toContain("INACTIVE");
    expect(JSON.stringify(item)).not.toContain("UNAVAILABLE");
  });
});
