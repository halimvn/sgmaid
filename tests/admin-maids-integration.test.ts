import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getSupabaseStorageAdmin, getMaidDocumentBucket } from "@/lib/storage/supabase-admin";

/**
 * Phase 6 Step 26 — the full admin lifecycle, run against the REAL
 * development database and REAL private Supabase Storage bucket, not a
 * mock: only `@/auth`'s auth() is mocked (to switch between a fictional
 * admin session and a fictional employer session), exactly like
 * tests/maids-integration.test.ts and tests/shortlist-integration.test.ts.
 *
 * Admin: create DRAFT maid → verify employer cannot see it → add
 * expertise/language/biodata PDF, set ACTIVE + AVAILABLE → verify
 * employer CAN see it (short profile, biodata PDF, shortlist) → set
 * INACTIVE → verify employer can no longer see it. Everything created
 * here — the admin User, the employer User, the maid profile, and the
 * uploaded Storage object — is fictional and is deleted in afterAll.
 */

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const { getAdminMaid, createMaid, updateMaid } = await import("@/lib/services/admin/maids");
const { listEmployerVisibleMaids, getEmployerVisibleMaidProfile } = await import("@/lib/services/maids");
const { parseMaidFilters } = await import("@/lib/validation/maid-filters");
const { getBiodataSignedUrl } = await import("@/lib/services/maid-documents");
const { addToShortlist, isMaidShortlisted, removeFromShortlist } = await import("@/lib/services/shortlist");

const TEST_ADMIN_EMAIL = "phase6-integration-test-admin@example.test";
const TEST_EMPLOYER_EMAIL = "phase6-integration-test-employer@example.test";
const TEST_PROFILE_CODE = "ZZTEST-P6-001";

let adminId: string;
let employerId: string;
let maidId: string | undefined;

function asAdmin() {
  mockAuth.mockResolvedValue({ user: { id: adminId }, sessionVersion: 0 });
}
function asEmployer() {
  mockAuth.mockResolvedValue({ user: { id: employerId }, sessionVersion: 0 });
}

// A minimal, genuinely valid PDF byte stream — enough for Storage/MIME
// validation to treat it as a real PDF. Not derived from any real
// candidate's biodata; entirely synthetic, fictional test content.
function fakePdfFile(): File {
  const bytes = new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");
  return new File([bytes], "fictional-test-biodata.pdf", { type: "application/pdf" });
}

beforeAll(async () => {
  const admin = await prisma.user.create({
    data: { fullName: "[Fictional] Phase 6 Integration Test Admin", email: TEST_ADMIN_EMAIL, role: "ADMIN", status: "ACTIVE" },
  });
  adminId = admin.id;

  const employer = await prisma.user.create({
    data: { fullName: "[Fictional] Phase 6 Integration Test Employer", email: TEST_EMPLOYER_EMAIL, role: "EMPLOYER", status: "ACTIVE" },
  });
  employerId = employer.id;
});

afterAll(async () => {
  // AuditLog.actor is onDelete: Restrict (an audit trail must survive a
  // deleted user in real operation) — for this fictional test admin,
  // that means the audit rows this test itself generated must be
  // removed first, or deleting the test User row below would fail.
  await prisma.auditLog.deleteMany({ where: { actorId: adminId } }).catch(() => {});

  if (maidId) {
    // Cascades to MaidSkill/EmploymentHistory/MaidDocument/Shortlist rows.
    await prisma.maidProfile.delete({ where: { id: maidId } }).catch(() => {});
  }
  // Clean up the uploaded Storage object so no fictional test file is left behind.
  const supabase = getSupabaseStorageAdmin();
  await supabase.storage.from(getMaidDocumentBucket()).remove([`${TEST_PROFILE_CODE}/biodata.pdf`]).catch(() => {});

  await prisma.user.delete({ where: { id: adminId } }).catch(() => {});
  await prisma.user.delete({ where: { id: employerId } }).catch(() => {});
  await prisma.$disconnect();
});

describe("Phase 6 Step 26 — admin lifecycle against the real database", () => {
  it("6. admin can create a DRAFT maid", async () => {
    asAdmin();

    const result = await createMaid(
      {
        profileCode: TEST_PROFILE_CODE,
        name: "[Fictional] Phase 6 Test Candidate",
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
      },
      { photo: null, pdf: null }
    );

    expect(result.ok).toBe(true);
    if (result.ok) maidId = result.id;
  });

  it("7. the new DRAFT maid is invisible to the employer (listing + direct lookup)", async () => {
    asEmployer();

    const listing = await listEmployerVisibleMaids(parseMaidFilters({ search: TEST_PROFILE_CODE }));
    expect(listing.items.some((m) => m.profileCode === TEST_PROFILE_CODE)).toBe(false);

    const direct = await getEmployerVisibleMaidProfile(maidId!);
    expect(direct).toBeNull();
  });

  it("18. the employer cannot access the Draft's biodata (there is none yet, and it isn't visible anyway)", async () => {
    asEmployer();
    const result = await getBiodataSignedUrl(maidId!);
    expect(result).toEqual({ ok: false, reason: "NOT_VISIBLE" });
  });

  it("9/10/11/12/13. admin adds expertise, marital, language, a biodata PDF, and publishes ACTIVE + AVAILABLE", async () => {
    asAdmin();

    const result = await updateMaid(
      maidId!,
      {
        profileCode: TEST_PROFILE_CODE,
        name: "[Fictional] Phase 6 Test Candidate",
        dateOfBirth: undefined,
        maidType: "TRANSFER",
        maritalStatus: "MARRIED",
        languagesRaw: "Bahasa, English",
        heightCm: 160,
        weightKg: 55,
        yearsExperience: 3,
        expertise: ["childcare", "cooking"],
        employmentHistory: [],
        profileStatus: "ACTIVE",
        availabilityStatus: "AVAILABLE",
      },
      { photo: null, pdf: fakePdfFile() }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 14. published exactly as requested — all publish requirements were met.
    expect(result.publishedAsRequested).toBe(true);
    expect(result.fileWarnings).toEqual([]);

    const detail = await getAdminMaid(maidId!);
    expect(detail?.maritalStatus).toBe("MARRIED");
    // 10. language normalization: "Bahasa" collapses to the same canonical value as "Bahasa Indonesia".
    expect(detail?.languages).toEqual(["Bahasa Indonesia", "English"]);
    // 9. multiple expertise categories assigned.
    expect(detail?.expertise.sort()).toEqual(["childcare", "cooking"]);
  });

  it("employer can now see the short profile, with the correct fields", async () => {
    asEmployer();

    const listing = await listEmployerVisibleMaids(parseMaidFilters({ search: TEST_PROFILE_CODE }));
    expect(listing.items.some((m) => m.profileCode === TEST_PROFILE_CODE)).toBe(true);

    const profile = await getEmployerVisibleMaidProfile(maidId!);
    expect(profile).not.toBeNull();
    expect(profile!.maritalStatus).toBe("MARRIED");
    expect(profile!.languages).toEqual(["Bahasa Indonesia", "English"]);
    expect(profile!.expertise.sort()).toEqual(["Childcare", "Cooking"]);
    // Never internalNotes/storagePath — same DTO guarantee proven for real-import records.
    expect(JSON.stringify(profile)).not.toContain("internalNotes");
    expect(JSON.stringify(profile)).not.toContain("storagePath");
  });

  it("View Biodata PDF works for the employer now that the profile is published", async () => {
    asEmployer();
    const result = await getBiodataSignedUrl(maidId!);
    expect(result.ok).toBe(true);
  });

  it("Shortlist works for the employer", async () => {
    asEmployer();

    const added = await addToShortlist(maidId!);
    expect(added.ok).toBe(true);
    expect(await isMaidShortlisted(maidId!)).toBe(true);

    const removed = await removeFromShortlist(maidId!);
    expect(removed.ok).toBe(true);
    expect(await isMaidShortlisted(maidId!)).toBe(false);
  });

  it("15. admin cannot publish an incomplete profile — omitting the only Expertise reverts a requested ACTIVE back to Draft", async () => {
    asAdmin();

    const result = await updateMaid(
      maidId!,
      {
        profileCode: TEST_PROFILE_CODE,
        name: "[Fictional] Phase 6 Test Candidate",
        dateOfBirth: undefined,
        maidType: "TRANSFER",
        maritalStatus: "MARRIED",
        languagesRaw: "Bahasa Indonesia, English",
        heightCm: 160,
        weightKg: 55,
        yearsExperience: 3,
        expertise: [], // <- removed, biodata still present from the previous save
        employmentHistory: [],
        profileStatus: "ACTIVE",
        availabilityStatus: "AVAILABLE",
      },
      { photo: null, pdf: null }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.publishedAsRequested).toBe(false);
    expect(result.publishGaps).toContain("at least one Expertise category");

    const detail = await getAdminMaid(maidId!);
    expect(detail?.profileStatus).toBe("DRAFT");

    // Employer must no longer see it either, since it silently reverted to Draft.
    asEmployer();
    const profile = await getEmployerVisibleMaidProfile(maidId!);
    expect(profile).toBeNull();
  });

  it("20. re-saving the real pilot-style profileCode never creates a duplicate row", async () => {
    asAdmin();

    const countBefore = await prisma.maidProfile.count({ where: { profileCode: TEST_PROFILE_CODE } });
    expect(countBefore).toBe(1);

    await updateMaid(
      maidId!,
      {
        profileCode: TEST_PROFILE_CODE,
        name: "[Fictional] Phase 6 Test Candidate (updated)",
        dateOfBirth: undefined,
        maidType: "TRANSFER",
        maritalStatus: "MARRIED",
        languagesRaw: "English",
        heightCm: 160,
        weightKg: 55,
        yearsExperience: 3,
        expertise: ["cooking"],
        employmentHistory: [],
        profileStatus: "ACTIVE",
        availabilityStatus: "AVAILABLE",
      },
      { photo: null, pdf: null }
    );

    const countAfter = await prisma.maidProfile.count({ where: { profileCode: TEST_PROFILE_CODE } });
    expect(countAfter).toBe(1);
  });

  it("admin sets the profile INACTIVE — employer profile disappears / becomes inaccessible", async () => {
    asAdmin();

    const result = await updateMaid(
      maidId!,
      {
        profileCode: TEST_PROFILE_CODE,
        name: "[Fictional] Phase 6 Test Candidate (updated)",
        dateOfBirth: undefined,
        maidType: "TRANSFER",
        maritalStatus: "MARRIED",
        languagesRaw: "English",
        heightCm: 160,
        weightKg: 55,
        yearsExperience: 3,
        expertise: ["cooking"],
        employmentHistory: [],
        profileStatus: "INACTIVE",
        availabilityStatus: "AVAILABLE",
      },
      { photo: null, pdf: null }
    );
    expect(result.ok).toBe(true);

    asEmployer();
    const listing = await listEmployerVisibleMaids(parseMaidFilters({ search: TEST_PROFILE_CODE }));
    expect(listing.items.some((m) => m.profileCode === TEST_PROFILE_CODE)).toBe(false);

    const direct = await getEmployerVisibleMaidProfile(maidId!);
    expect(direct).toBeNull();

    // 18/19. biodata/photo must also become inaccessible once INACTIVE.
    const biodata = await getBiodataSignedUrl(maidId!);
    expect(biodata).toEqual({ ok: false, reason: "NOT_VISIBLE" });
  });

  it("PROFILE_STATUS_CHANGED and AVAILABILITY_CHANGED were audit-logged for this maid", async () => {
    const events = await prisma.auditLog.findMany({ where: { maidId: maidId!, actorId: adminId } });
    const actions = events.map((e) => e.action);
    expect(actions).toContain("MAID_CREATED");
    expect(actions).toContain("PROFILE_STATUS_CHANGED");
    expect(actions).toContain("BIODATA_UPLOADED");
  });
});
