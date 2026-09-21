import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { prisma } from "@/lib/db";

/**
 * Homepage "Meet available helpers" section — public, unauthenticated
 * maid-preview service (lib/services/public-maids.ts) and the homepage
 * that renders it. Runs against the REAL development database, with only
 * throwaway, clearly fictional fixtures (profileCode prefix ZZTEST-PUB-)
 * created in beforeAll and deleted in afterAll (children cascade).
 *
 * Real pilot profiles may be present and ACTIVE+AVAILABLE while this runs,
 * so no assertion depends on the whole result set: they check that
 * specific fixtures are included/excluded and on the DTO's shape. The real
 * profiles are never read for their content or modified.
 *
 * Only `@/auth` is mocked (used solely by the "protected routes stay
 * protected" checks — the public service itself never calls auth()).
 */

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

// Storage is mocked for the photo tests: no real object is uploaded, we only
// assert WHEN a signed URL is requested and for WHICH path.
const mockCreateSignedUrl = vi.hoisted(() => vi.fn());
vi.mock("@/lib/storage/supabase-admin", () => ({
  getMaidDocumentBucket: () => "test-bucket",
  getSupabaseStorageAdmin: () => ({ storage: { from: () => ({ createSignedUrl: mockCreateSignedUrl }) } }),
}));

const { getPublicMaidPreviews, getPublicMaidPhotoSignedUrl } = await import("@/lib/services/public-maids");

const P = "ZZTEST-PUB-";
const EXCLUDED = {
  DRAFT: `${P}DRAFT`,
  INACTIVE: `${P}INACTIVE`,
  RESERVED: `${P}RESERVED`,
  PLACED: `${P}PLACED`,
  UNAVAILABLE: `${P}UNAVAIL`,
};
// Created LAST (so newest by updatedAt): five is more than the 4-card limit,
// which makes both the cap and the oldest-drops-off behaviour observable.
const AVAILABLE = [1, 2, 3, 4, 5].map((n) => `${P}OK${n}`);
const PHOTO_PATH = "maid-photos/ZZTEST-PUB-OK5/photo.jpg";
const EXCLUDED_PHOTO_PATH = "maid-photos/ZZTEST-PUB-RESERVED/photo.jpg";
const ALL_CODES = [...Object.values(EXCLUDED), ...AVAILABLE];

const SECRET_NOTE = "ZZTEST-PUB-SECRET-INTERNAL-NOTE";
const SECRET_PATH = "maid-biodata/ZZTEST-PUB-OK5/biodata-secret.pdf";
const FULL_NAME_SURNAME = "Surnameonly";

type Spec = { code: string; profileStatus: "DRAFT" | "ACTIVE" | "INACTIVE"; availabilityStatus: "AVAILABLE" | "RESERVED" | "PLACED" | "UNAVAILABLE" };

const EXCLUDED_SPECS: Spec[] = [
  { code: EXCLUDED.DRAFT, profileStatus: "DRAFT", availabilityStatus: "AVAILABLE" },
  { code: EXCLUDED.INACTIVE, profileStatus: "INACTIVE", availabilityStatus: "AVAILABLE" },
  { code: EXCLUDED.RESERVED, profileStatus: "ACTIVE", availabilityStatus: "RESERVED" },
  { code: EXCLUDED.PLACED, profileStatus: "ACTIVE", availabilityStatus: "PLACED" },
  { code: EXCLUDED.UNAVAILABLE, profileStatus: "ACTIVE", availabilityStatus: "UNAVAILABLE" },
];

async function createFixture(spec: Spec, extra: { withSecrets?: boolean; photoPath?: string } = {}) {
  await prisma.maidProfile.create({
    data: {
      profileCode: spec.code,
      name: `[Fictional] ${spec.code} ${FULL_NAME_SURNAME}`,
      nationality: "Indonesian",
      dateOfBirth: new Date("1990-01-01"),
      yearsExperience: 4,
      profileStatus: spec.profileStatus,
      availabilityStatus: spec.availabilityStatus,
      internalNotes: extra.withSecrets ? SECRET_NOTE : null,
      documents: {
        create: [
          ...(extra.withSecrets ? [{ type: "BIODATA_PDF" as const, storagePath: SECRET_PATH, mimeType: "application/pdf" }] : []),
          ...(extra.photoPath ? [{ type: "PROFILE_PHOTO" as const, storagePath: extra.photoPath, mimeType: "image/jpeg" }] : []),
        ],
      },
    },
  });
}

beforeAll(async () => {
  // Clear any leftovers from an aborted earlier run.
  await prisma.maidProfile.deleteMany({ where: { profileCode: { in: ALL_CODES } } });

  for (const spec of EXCLUDED_SPECS) {
    await createFixture(spec, { photoPath: spec.code === EXCLUDED.RESERVED ? EXCLUDED_PHOTO_PATH : undefined });
  }
  // Sequential awaits => strictly increasing updatedAt; OK5 is the newest.
  for (const code of AVAILABLE) {
    await createFixture(
      { code, profileStatus: "ACTIVE", availabilityStatus: "AVAILABLE" },
      { withSecrets: code === AVAILABLE[4], photoPath: code === AVAILABLE[4] ? PHOTO_PATH : undefined }
    );
    await new Promise((r) => setTimeout(r, 15));
  }
});

afterAll(async () => {
  await prisma.maidProfile.deleteMany({ where: { profileCode: { in: ALL_CODES } } });
});

describe("getPublicMaidPreviews — visibility", () => {
  it("returns ACTIVE + AVAILABLE profiles", async () => {
    const codes = (await getPublicMaidPreviews()).map((m) => m.profileCode);
    expect(codes).toContain(AVAILABLE[4]);
    expect(codes).toContain(AVAILABLE[3]);
  });

  it("never returns DRAFT, INACTIVE, RESERVED, PLACED or UNAVAILABLE profiles", async () => {
    const codes = (await getPublicMaidPreviews()).map((m) => m.profileCode);
    for (const excluded of Object.values(EXCLUDED)) expect(codes).not.toContain(excluded);
  });

  it("returns at most 4 profiles, and exactly 4 when more than 4 qualify", async () => {
    const result = await getPublicMaidPreviews();
    expect(result.length).toBe(4);
  });

  it("is deterministic (same order on repeated calls) and newest-updated first", async () => {
    const a = (await getPublicMaidPreviews()).map((m) => m.profileCode);
    const b = (await getPublicMaidPreviews()).map((m) => m.profileCode);
    expect(a).toEqual(b);
    // Our five fixtures are the five newest rows: the newest four are shown, the oldest is not.
    expect(a).toEqual([AVAILABLE[4], AVAILABLE[3], AVAILABLE[2], AVAILABLE[1]]);
    expect(a).not.toContain(AVAILABLE[0]);
  });
});

describe("getPublicMaidPreviews — DTO privacy", () => {
  it("exposes only the minimal public fields", async () => {
    const [first] = await getPublicMaidPreviews();
    expect(Object.keys(first).sort()).toEqual(
      ["age", "displayName", "hasPhoto", "nationality", "profileCode", "yearsExperience"].sort()
    );
  });

  it("shows the first name only — never the rest of the name", async () => {
    const result = await getPublicMaidPreviews();
    const fixture = result.find((m) => m.profileCode === AVAILABLE[4])!;
    expect(fixture.displayName).toBe("[Fictional]");
    expect(JSON.stringify(result)).not.toContain(FULL_NAME_SURNAME);
  });

  it("never exposes internalNotes, document/storage paths or photo data", async () => {
    const serialized = JSON.stringify(await getPublicMaidPreviews());
    expect(serialized).not.toContain(SECRET_NOTE);
    expect(serialized).not.toContain(SECRET_PATH);
    expect(serialized).not.toContain(PHOTO_PATH);
    expect(serialized).not.toMatch(/storagePath|internalNotes|photoUrl|documents|passport/i);
  });

  it("derives a plausible age from dateOfBirth", async () => {
    const fixture = (await getPublicMaidPreviews()).find((m) => m.profileCode === AVAILABLE[4])!;
    const expected = new Date().getFullYear() - 1990 - (new Date() < new Date(new Date().getFullYear(), 0, 1) ? 1 : 0);
    expect(fixture.age).toBe(expected);
    expect(fixture.yearsExperience).toBe(4);
  });
});

describe("public helper photos", () => {
  it("flags hasPhoto only for a profile with an approved photo — never a raw path", async () => {
    const result = await getPublicMaidPreviews();
    expect(result.find((m) => m.profileCode === AVAILABLE[4])!.hasPhoto).toBe(true);
    expect(result.find((m) => m.profileCode === AVAILABLE[3])!.hasPhoto).toBe(false);
  });

  it("issues a short-lived signed URL for a visible profile with a photo", async () => {
    mockCreateSignedUrl.mockResolvedValueOnce({ data: { signedUrl: "https://signed.example/photo" }, error: null });
    await expect(getPublicMaidPhotoSignedUrl(AVAILABLE[4])).resolves.toBe("https://signed.example/photo");
    expect(mockCreateSignedUrl).toHaveBeenLastCalledWith(PHOTO_PATH, expect.any(Number));
    expect(mockCreateSignedUrl.mock.lastCall![1]).toBeLessThanOrEqual(300);
  });

  it("issues NO signed URL (and never touches storage) for a non-visible profile, even with a photo on file", async () => {
    mockCreateSignedUrl.mockClear();
    await expect(getPublicMaidPhotoSignedUrl(EXCLUDED.RESERVED)).resolves.toBeNull();
    await expect(getPublicMaidPhotoSignedUrl(EXCLUDED.DRAFT)).resolves.toBeNull();
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("returns null for a visible profile with no photo, an unknown code, or a malformed code", async () => {
    mockCreateSignedUrl.mockClear();
    await expect(getPublicMaidPhotoSignedUrl(AVAILABLE[3])).resolves.toBeNull();
    await expect(getPublicMaidPhotoSignedUrl("ZZTEST-PUB-NOPE")).resolves.toBeNull();
    await expect(getPublicMaidPhotoSignedUrl("../etc/passwd")).resolves.toBeNull();
    await expect(getPublicMaidPhotoSignedUrl("x".repeat(80))).resolves.toBeNull();
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("returns null (no throw) when storage fails", async () => {
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockCreateSignedUrl.mockResolvedValueOnce({ data: null, error: new Error("storage down") });
    try {
      await expect(getPublicMaidPhotoSignedUrl(AVAILABLE[4])).resolves.toBeNull();
    } finally {
      logSpy.mockRestore();
    }
  });

  it("homepage uses the photo route (never a storage path) for a helper that has a photo", async () => {
    const { default: HomePage } = await import("@/app/(site)/page");
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain(`/helpers/photo/${AVAILABLE[4]}`);
    expect(html).not.toContain(PHOTO_PATH);
    expect(html).not.toMatch(/supabase|signedUrl|[?&]token=/i);
  });
});

describe("getPublicMaidPreviews — failure handling", () => {
  it("resolves to an empty array (never throws, never leaks the error) when the database fails", async () => {
    const dbError = new Error("connection refused: postgres://user:secret@host/db");
    const spy = vi.spyOn(prisma.maidProfile, "findMany").mockRejectedValueOnce(dbError);
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(getPublicMaidPreviews()).resolves.toEqual([]);
      expect(logSpy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
      logSpy.mockRestore();
    }
  });
});

describe("homepage rendering", () => {
  async function renderHome(): Promise<string> {
    const { default: HomePage } = await import("@/app/(site)/page");
    return renderToStaticMarkup(await HomePage());
  }

  it("renders a card per available helper with first-name-only text, and no biodata/photo/storage exposure", async () => {
    const html = await renderHome();
    expect(html).toContain("Meet available helpers");
    expect(html).toContain(AVAILABLE[4]);
    expect(html).not.toContain(AVAILABLE[0]); // beyond the 4-card cap
    for (const excluded of Object.values(EXCLUDED)) expect(html).not.toContain(excluded);
    expect(html).not.toContain(FULL_NAME_SURNAME);
    expect(html).not.toContain(SECRET_NOTE);
    expect(html).not.toContain(SECRET_PATH);
    expect(html).not.toMatch(/\/biodata|supabase|signedUrl|\.pdf/i);
  });

  it("View profile, Browse all helpers and Find Your Helper all point to /login", async () => {
    const html = await renderHome();
    const hrefFor = (label: string) => {
      const m = new RegExp(`<a[^>]*href="([^"]+)"[^>]*>\\s*${label}`).exec(html);
      return m?.[1];
    };
    expect(hrefFor("View profile")).toBe("/login");
    expect(hrefFor("Browse all helpers")).toBe("/login");
    expect(hrefFor("Find Your Helper")).toBe("/login");
    // No card links straight into the protected employer area.
    expect(html).not.toMatch(/href="\/dashboard\/maids/);
  });

  it("renders the empty state (and no cards) when there are no helpers to show", async () => {
    const spy = vi.spyOn(prisma.maidProfile, "findMany").mockResolvedValueOnce([]);
    try {
      const html = await renderHome();
      expect(html).toContain("Meet available helpers");
      expect(html).not.toContain("View profile");
      expect(html).toContain("New helper profiles are being added");
      // The path forward stays available (still gated behind /login).
      expect(html).toMatch(/<a[^>]*href="\/login"[^>]*>\s*Browse all helpers/);
    } finally {
      spy.mockRestore();
    }
  });
});

describe("protected employer routes stay protected", () => {
  it("employer maid services still reject a logged-out caller (the public service does not weaken them)", async () => {
    mockAuth.mockResolvedValue(null);
    const { listEmployerVisibleMaids, getEmployerVisibleMaidProfile } = await import("@/lib/services/maids");
    const { parseMaidFilters } = await import("@/lib/validation/maid-filters");
    await expect(listEmployerVisibleMaids(parseMaidFilters({}))).rejects.toBeDefined();
    await expect(getEmployerVisibleMaidProfile("does-not-matter")).rejects.toBeDefined();
  });
});
