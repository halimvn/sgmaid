import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for Phase 4.6's secure biodata PDF access
 * (lib/services/maid-documents.ts), against a MOCKED Prisma client and a
 * MOCKED Supabase Storage admin client — no real database, no real
 * Storage calls, and no real personal data anywhere in this file (every
 * fixture below is fictional).
 *
 * "Supabase service-role key never enters the client bundle" (spec test
 * #10) is not something a unit test can meaningfully assert on its own —
 * it's enforced structurally by lib/storage/supabase-admin.ts's
 * `import "server-only"`, the same mechanism proven every phase by a
 * successful `npm run build` (which would fail if any Client Component
 * ever imported it). What *is* tested here is everything about the
 * authorization ordering around it: a signed URL is never even requested
 * from Supabase until both requireEmployer() and the Phase 3 visibility
 * check succeed.
 */

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  maidProfile: { findFirst: vi.fn() },
  maidDocument: { findUnique: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockCreateSignedUrl = vi.hoisted(() => vi.fn());
vi.mock("@/lib/storage/supabase-admin", () => ({
  getSupabaseStorageAdmin: () => ({
    storage: { from: () => ({ createSignedUrl: mockCreateSignedUrl }) },
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

const { getBiodataSignedUrl, hasBiodataDocument, getMaidPhotoSignedUrl, hasMaidPhoto } = await import(
  "@/lib/services/maid-documents"
);

function dbUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "emp_1",
    fullName: "[Fictional] Test Employer",
    email: "employer@example.test",
    role: "EMPLOYER",
    status: "ACTIVE",
    sessionVersion: 0,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateSignedUrl.mockResolvedValue({ data: { signedUrl: "https://example.test/signed" }, error: null });
});

describe("biodata access — authorization boundary", () => {
  it("1. an unauthenticated caller cannot request biodata", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(getBiodataSignedUrl("fict_maid_1")).rejects.toThrow(/REDIRECT:\/login/);
    expect(mockPrisma.maidProfile.findFirst).not.toHaveBeenCalled();
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("2. a PENDING user cannot request biodata", async () => {
    mockAuth.mockResolvedValue({ user: { id: "emp_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser({ status: "PENDING" }));

    await expect(getBiodataSignedUrl("fict_maid_1")).rejects.toThrow(/REDIRECT:\/login/);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("3. a SUSPENDED user cannot request biodata", async () => {
    mockAuth.mockResolvedValue({ user: { id: "emp_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser({ status: "SUSPENDED" }));

    await expect(getBiodataSignedUrl("fict_maid_1")).rejects.toThrow(/REDIRECT:\/login/);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });
});

describe("biodata access — visibility + document lookup", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ user: { id: "emp_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser());
  });

  it("4. an ACTIVE employer can request biodata for a visible fictional maid", async () => {
    mockPrisma.maidProfile.findFirst.mockResolvedValue({ id: "fict_maid_1" });
    mockPrisma.maidDocument.findUnique.mockResolvedValue({ storagePath: "FICT-001/biodata.pdf" });

    const result = await getBiodataSignedUrl("fict_maid_1");

    expect(result).toEqual({ ok: true, url: "https://example.test/signed", expiresInSeconds: 120 });
  });

  it("5. a DRAFT maid's biodata cannot be requested", async () => {
    // employerVisibleMaidWhere() excludes DRAFT — the lookup finds nothing.
    mockPrisma.maidProfile.findFirst.mockResolvedValue(null);

    const result = await getBiodataSignedUrl("fict_draft_maid");

    expect(result).toEqual({ ok: false, reason: "NOT_VISIBLE" });
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("6. an INACTIVE maid's biodata cannot be requested", async () => {
    mockPrisma.maidProfile.findFirst.mockResolvedValue(null);

    const result = await getBiodataSignedUrl("fict_inactive_maid");

    expect(result).toEqual({ ok: false, reason: "NOT_VISIBLE" });
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("7. a PLACED/UNAVAILABLE (hidden) maid's biodata cannot be requested", async () => {
    mockPrisma.maidProfile.findFirst.mockResolvedValue(null);

    const result = await getBiodataSignedUrl("fict_placed_maid");

    expect(result).toEqual({ ok: false, reason: "NOT_VISIBLE" });
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("8. a visible maid with no biodata document on file returns safe not-found", async () => {
    mockPrisma.maidProfile.findFirst.mockResolvedValue({ id: "fict_maid_2" });
    mockPrisma.maidDocument.findUnique.mockResolvedValue(null);

    const result = await getBiodataSignedUrl("fict_maid_2");

    expect(result).toEqual({ ok: false, reason: "NO_DOCUMENT" });
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("11. a signed URL is only ever requested from Storage after both auth checks pass", async () => {
    mockPrisma.maidProfile.findFirst.mockResolvedValue({ id: "fict_maid_1" });
    mockPrisma.maidDocument.findUnique.mockResolvedValue({ storagePath: "FICT-001/biodata.pdf" });

    await getBiodataSignedUrl("fict_maid_1");

    expect(mockCreateSignedUrl).toHaveBeenCalledTimes(1);
    expect(mockCreateSignedUrl).toHaveBeenCalledWith("FICT-001/biodata.pdf", expect.any(Number));
  });

  it("12. the signed URL has a short expiry (within the 60-300s range)", async () => {
    mockPrisma.maidProfile.findFirst.mockResolvedValue({ id: "fict_maid_1" });
    mockPrisma.maidDocument.findUnique.mockResolvedValue({ storagePath: "FICT-001/biodata.pdf" });

    const result = await getBiodataSignedUrl("fict_maid_1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.expiresInSeconds).toBeGreaterThanOrEqual(60);
      expect(result.expiresInSeconds).toBeLessThanOrEqual(300);
    }
  });

  it("malformed maid id fails safely without ever reaching Prisma or Storage", async () => {
    const result = await getBiodataSignedUrl("../../etc/passwd");

    expect(result).toEqual({ ok: false, reason: "INVALID_ID" });
    expect(mockPrisma.maidProfile.findFirst).not.toHaveBeenCalled();
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });
});

describe("hasBiodataDocument()", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ user: { id: "emp_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser());
  });

  it("returns true only when a visible maid has a document on file", async () => {
    mockPrisma.maidProfile.findFirst.mockResolvedValue({ id: "fict_maid_1" });
    mockPrisma.maidDocument.findUnique.mockResolvedValue({ id: "doc_1" });

    expect(await hasBiodataDocument("fict_maid_1")).toBe(true);
  });

  it("returns false for a hidden maid, without ever calling Storage", async () => {
    mockPrisma.maidProfile.findFirst.mockResolvedValue(null);

    expect(await hasBiodataDocument("fict_hidden_maid")).toBe(false);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });
});

/**
 * Phase 4.6.2 — candidate photo access. Same authorization ordering and
 * private-storage/signed-URL pattern as the biodata PDF above; these
 * tests mirror that suite exactly, just for getMaidPhotoSignedUrl()/
 * hasMaidPhoto() and the PROFILE_PHOTO document type.
 */
describe("photo access — authorization boundary", () => {
  it("an unauthenticated caller cannot request a candidate photo", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(getMaidPhotoSignedUrl("fict_maid_1")).rejects.toThrow(/REDIRECT:\/login/);
    expect(mockPrisma.maidProfile.findFirst).not.toHaveBeenCalled();
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("a SUSPENDED user cannot request a candidate photo", async () => {
    mockAuth.mockResolvedValue({ user: { id: "emp_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser({ status: "SUSPENDED" }));

    await expect(getMaidPhotoSignedUrl("fict_maid_1")).rejects.toThrow(/REDIRECT:\/login/);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });
});

describe("photo access — visibility + document lookup", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ user: { id: "emp_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser());
  });

  it("an ACTIVE employer can request the photo for a visible fictional maid", async () => {
    mockPrisma.maidProfile.findFirst.mockResolvedValue({ id: "fict_maid_1" });
    mockPrisma.maidDocument.findUnique.mockResolvedValue({ storagePath: "FICT-001/photo.jpg" });

    const result = await getMaidPhotoSignedUrl("fict_maid_1");

    expect(result).toEqual({ ok: true, url: "https://example.test/signed", expiresInSeconds: 120 });
  });

  it("a DRAFT/hidden maid's photo cannot be requested", async () => {
    mockPrisma.maidProfile.findFirst.mockResolvedValue(null);

    const result = await getMaidPhotoSignedUrl("fict_draft_maid");

    expect(result).toEqual({ ok: false, reason: "NOT_VISIBLE" });
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("a visible maid with no photo on file returns safe not-found", async () => {
    mockPrisma.maidProfile.findFirst.mockResolvedValue({ id: "fict_maid_2" });
    mockPrisma.maidDocument.findUnique.mockResolvedValue(null);

    const result = await getMaidPhotoSignedUrl("fict_maid_2");

    expect(result).toEqual({ ok: false, reason: "NO_DOCUMENT" });
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("a signed URL is only ever requested from Storage after both auth checks pass", async () => {
    mockPrisma.maidProfile.findFirst.mockResolvedValue({ id: "fict_maid_1" });
    mockPrisma.maidDocument.findUnique.mockResolvedValue({ storagePath: "FICT-001/photo.jpg" });

    await getMaidPhotoSignedUrl("fict_maid_1");

    expect(mockCreateSignedUrl).toHaveBeenCalledTimes(1);
    expect(mockCreateSignedUrl).toHaveBeenCalledWith("FICT-001/photo.jpg", expect.any(Number));
  });
});

describe("hasMaidPhoto()", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ user: { id: "emp_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser());
  });

  it("returns true only when a visible maid has an approved photo on file", async () => {
    mockPrisma.maidProfile.findFirst.mockResolvedValue({ id: "fict_maid_1" });
    mockPrisma.maidDocument.findUnique.mockResolvedValue({ id: "doc_1" });

    expect(await hasMaidPhoto("fict_maid_1")).toBe(true);
  });

  it("returns false for a hidden maid, without ever calling Storage", async () => {
    mockPrisma.maidProfile.findFirst.mockResolvedValue(null);

    expect(await hasMaidPhoto("fict_hidden_maid")).toBe(false);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });
});
