import { describe, it, expect, vi, beforeEach } from "vitest";
import { validatePhotoFile, validatePdfFile, type AdminMaidFormData } from "@/lib/validation/admin-maid";
import { parseAndNormalizeLanguages } from "@/lib/language-taxonomy";

/**
 * Phase 6 unit tests: the admin maid service's authorization boundary
 * (mocked Prisma — proves every exported function rejects before ever
 * reaching the database, mirroring tests/maids-service.test.ts's own
 * pattern) plus the pure validation helpers (file MIME/size, language
 * normalization) that don't need a database at all. The full
 * create-draft → publish → deactivate lifecycle (Phase 6 spec #6, 7, 9,
 * 10, 11, 12, 13, 14, 15, 18, 19, 20) is proven against the real
 * database in tests/admin-maids-integration.test.ts — a mock can assert
 * shape and ordering, not that Postgres/Storage actually behaved.
 */

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  maidProfile: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  maidDocument: { findUnique: vi.fn(), upsert: vi.fn() },
  maidSkill: { createMany: vi.fn(), deleteMany: vi.fn() },
  employmentHistory: { create: vi.fn(), deleteMany: vi.fn() },
  skill: { upsert: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockCreateSignedUrl = vi.hoisted(() => vi.fn());
vi.mock("@/lib/storage/supabase-admin", () => ({
  getSupabaseStorageAdmin: () => ({
    storage: { from: () => ({ createSignedUrl: mockCreateSignedUrl, upload: vi.fn() }) },
  }),
  getMaidDocumentBucket: () => "maid-biodata-test",
}));

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

const {
  getAdminMaidStats,
  getAdminMaidList,
  getAdminMaid,
  createMaid,
  updateMaid,
  getAdminDocumentSignedUrl,
} = await import("@/lib/services/admin/maids");

function dbUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "adm_1",
    fullName: "[Fictional] Test Admin",
    email: "admin@example.test",
    role: "ADMIN",
    status: "ACTIVE",
    sessionVersion: 0,
    ...overrides,
  };
}

const emptyFormData: AdminMaidFormData = {
  profileCode: "TEST-1",
  name: "[Fictional] Test",
  dateOfBirth: undefined,
  maidType: "NEW",
  maritalStatus: "",
  languagesRaw: "",
  heightCm: undefined,
  weightKg: undefined,
  yearsExperience: undefined,
  expertise: [],
  employmentHistory: [],
  profileStatus: "DRAFT",
  availabilityStatus: "UNAVAILABLE",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Phase 6 — admin maid service authorization boundary", () => {
  it("getAdminMaidStats rejects an unauthenticated caller before ever querying maid data", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(getAdminMaidStats()).rejects.toThrow(/REDIRECT:\/login/);
    expect(mockPrisma.maidProfile.count).not.toHaveBeenCalled();
  });

  it("getAdminMaidList rejects a non-admin (EMPLOYER) session", async () => {
    mockAuth.mockResolvedValue({ user: { id: "emp_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser({ id: "emp_1", role: "EMPLOYER" }));

    await expect(getAdminMaidList({ page: 1 })).rejects.toThrow(/REDIRECT:\/login/);
    expect(mockPrisma.maidProfile.findMany).not.toHaveBeenCalled();
  });

  it("getAdminMaid rejects an unauthenticated caller", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await getAdminMaid("some-id").catch((e) => e);
    expect(result).toBeInstanceOf(RedirectSignal);
    expect(mockPrisma.maidProfile.findUnique).not.toHaveBeenCalled();
  });

  it("createMaid rejects an unauthenticated caller before ever touching the database or Storage", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(createMaid(emptyFormData, { photo: null, pdf: null })).rejects.toThrow(/REDIRECT:\/login/);
    expect(mockPrisma.maidProfile.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("updateMaid rejects a PENDING admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "adm_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser({ status: "PENDING" }));

    await expect(updateMaid("some-id", emptyFormData, { photo: null, pdf: null })).rejects.toThrow(/REDIRECT:\/login/);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("getAdminDocumentSignedUrl rejects a SUSPENDED admin and never calls Storage", async () => {
    mockAuth.mockResolvedValue({ user: { id: "adm_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser({ status: "SUSPENDED" }));

    await expect(getAdminDocumentSignedUrl("some-id", "BIODATA_PDF")).rejects.toThrow(/REDIRECT:\/login/);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });
});

describe("Phase 6 — createMaid duplicate profileCode handling", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ user: { id: "adm_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser());
  });

  it("8. a duplicate profileCode is rejected safely, without ever starting a transaction", async () => {
    mockPrisma.maidProfile.findUnique.mockResolvedValue({ id: "existing-id" });

    const result = await createMaid(emptyFormData, { photo: null, pdf: null });

    expect(result).toEqual({ ok: false, reason: "DUPLICATE_PROFILE_CODE" });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("Phase 6 — file validation (16, 17)", () => {
  function fakeFile(type: string, sizeBytes: number): File {
    return { type, size: sizeBytes } as File;
  }

  it("16. a non-PDF file is rejected for the biodata upload", () => {
    const result = validatePdfFile(fakeFile("image/png", 1000));
    expect(result.ok).toBe(false);
  });

  it("16. an oversized PDF is rejected", () => {
    const result = validatePdfFile(fakeFile("application/pdf", 20 * 1024 * 1024));
    expect(result.ok).toBe(false);
  });

  it("16. a valid PDF passes", () => {
    expect(validatePdfFile(fakeFile("application/pdf", 1000)).ok).toBe(true);
  });

  it("17. a non-image file is rejected for the photo upload", () => {
    expect(validatePhotoFile(fakeFile("application/pdf", 1000)).ok).toBe(false);
  });

  it("17. an oversized photo is rejected", () => {
    expect(validatePhotoFile(fakeFile("image/jpeg", 20 * 1024 * 1024)).ok).toBe(false);
  });

  it("17. each of the three approved image types passes", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(validatePhotoFile(fakeFile(type, 1000)).ok).toBe(true);
    }
  });
});

describe("Phase 6 — central language normalization strategy", () => {
  it("collapses known spelling variants into one canonical value", () => {
    expect(parseAndNormalizeLanguages("Bahasa, bahasa indonesia, Indonesian")).toEqual(["Bahasa Indonesia"]);
  });

  it("never invents a language when the input is blank", () => {
    expect(parseAndNormalizeLanguages("")).toEqual([]);
    expect(parseAndNormalizeLanguages("   ")).toEqual([]);
  });

  it("passes an unrecognized language through as typed, trimmed", () => {
    expect(parseAndNormalizeLanguages("  Vietnamese  ")).toEqual(["Vietnamese"]);
  });

  it("splits on commas and newlines and dedupes", () => {
    expect(parseAndNormalizeLanguages("English,English\nTagalog")).toEqual(["English", "Tagalog"]);
  });
});
