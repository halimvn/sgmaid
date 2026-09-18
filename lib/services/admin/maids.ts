import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/authorize";
import { getSupabaseStorageAdmin, getMaidDocumentBucket } from "@/lib/storage/supabase-admin";
import { parseAndNormalizeLanguages } from "@/lib/language-taxonomy";
import { parseMaidId } from "@/lib/validation/maid-id";
import {
  ADMIN_PAGE_SIZE,
  type AdminMaidFormData,
  type ExpertiseOptionValue,
  type ParsedAdminMaidFilters,
  validatePdfFile,
  validatePhotoFile,
} from "@/lib/validation/admin-maid";

/**
 * Admin maid-management data layer — Phase 6.
 *
 * Same privacy-boundary pattern as lib/services/maids.ts and
 * lib/services/shortlist.ts: every exported function here calls
 * requireAdmin() itself, first, and derives the acting admin's identity
 * only from that call — never from a client-supplied id. This is what
 * makes the /admin/* pages' own requireAdmin() layout guard defense in
 * depth rather than the only check; a future caller that skips the page
 * (a script, a different route) still can't use these functions without
 * a real, ACTIVE, ADMIN session.
 *
 * Storage cannot participate in a Postgres transaction (Step 18), so the
 * write order here is deliberate: Storage upload (keyed by profileCode,
 * doesn't need a MaidProfile id yet) → Prisma transaction (MaidProfile +
 * MaidSkill + EmploymentHistory) → MaidDocument upsert (needs the row's
 * id) → audit log. A failed file upload never blocks the rest of the
 * save — it's surfaced back to the admin as a warning so they can retry
 * from Edit, per "handle failure gracefully".
 */

// ------------------------------------------------------------
// Expertise <-> Skill mapping
// ------------------------------------------------------------
// Admin-entered profiles only ever need a category-level Expertise, not
// a specific cuisine/age-range skill (real biodata imports still use
// those fine-grained Skill rows — this doesn't touch them). One
// "generic" Skill per approved category; general-housekeeping already
// exists from prisma/seed.ts and is reused as-is rather than duplicated.
const EXPERTISE_SKILL_DEFS: Record<ExpertiseOptionValue, { slug: string; name: string; category: string }> = {
  cooking: { slug: "cooking-general", name: "Cooking (General)", category: "COOKING" },
  eldercare: { slug: "eldercare-general", name: "Elderly Care (General)", category: "ELDERLY_CARE" },
  childcare: { slug: "childcare-general", name: "Childcare (General)", category: "CHILDCARE" },
  infantcare: { slug: "infantcare-general", name: "Infant Care (General)", category: "INFANT_CARE" },
  "general-housekeeping": { slug: "general-housekeeping", name: "General Housekeeping", category: "HOUSEKEEPING" },
  "care-of-disabled": { slug: "disability-care-general", name: "Care of Disabled (General)", category: "DISABILITY_CARE" },
};

async function resolveExpertiseSkillIds(values: ExpertiseOptionValue[]): Promise<string[]> {
  const ids: string[] = [];
  for (const value of values) {
    const def = EXPERTISE_SKILL_DEFS[value];
    // Idempotent — if the skill already exists (e.g. general-housekeeping
    // from the fictional seed data), its existing name/category are left
    // untouched; only a genuinely missing generic skill is created.
    const skill = await prisma.skill.upsert({
      where: { slug: def.slug },
      update: {},
      create: { slug: def.slug, name: def.name, category: def.category as Prisma.SkillCreateInput["category"] },
    });
    ids.push(skill.id);
  }
  return ids;
}

// ------------------------------------------------------------
// Audit log
// ------------------------------------------------------------

type AuditAction =
  | "MAID_CREATED"
  | "MAID_UPDATED"
  | "PROFILE_STATUS_CHANGED"
  | "AVAILABILITY_CHANGED"
  | "BIODATA_UPLOADED"
  | "PROFILE_PHOTO_UPLOADED";

async function logAudit(actorId: string, action: AuditAction, maidId: string) {
  // Best-effort: a failed audit write must never block or roll back the
  // actual maid save it's describing.
  try {
    await prisma.auditLog.create({ data: { actorId, action, maidId } });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

// ------------------------------------------------------------
// DTOs
// ------------------------------------------------------------

export type AdminMaidListItem = {
  id: string;
  profileCode: string;
  name: string;
  maidType: string | null;
  maritalStatus: string | null;
  availabilityStatus: string;
  profileStatus: string;
  hasPhoto: boolean;
  hasBiodata: boolean;
  updatedAt: string;
};

export type AdminMaidListResult = {
  items: AdminMaidListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type AdminMaidStats = {
  total: number;
  draft: number;
  active: number;
  inactive: number;
  available: number;
  reserved: number;
  placed: number;
};

export type AdminMaidDetail = {
  id: string;
  profileCode: string;
  name: string;
  nationality: string;
  dateOfBirth: string | null;
  age: number | null;
  maidType: string | null;
  maritalStatus: string | null;
  languages: string[];
  heightCm: number | null;
  weightKg: number | null;
  yearsExperience: number;
  expertise: ExpertiseOptionValue[];
  employmentHistory: { country: string; startYear: number | null; endYear: number | null; duties: string | null }[];
  profileStatus: string;
  availabilityStatus: string;
  hasPhoto: boolean;
  hasBiodata: boolean;
  updatedAt: string;
};

function deriveAge(dateOfBirth: Date | null): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) age--;
  return age;
}

// ------------------------------------------------------------
// Read operations
// ------------------------------------------------------------

export async function getAdminMaidStats(): Promise<AdminMaidStats> {
  await requireAdmin();

  const [total, draft, active, inactive, available, reserved, placed] = await Promise.all([
    prisma.maidProfile.count(),
    prisma.maidProfile.count({ where: { profileStatus: "DRAFT" } }),
    prisma.maidProfile.count({ where: { profileStatus: "ACTIVE" } }),
    prisma.maidProfile.count({ where: { profileStatus: "INACTIVE" } }),
    prisma.maidProfile.count({ where: { availabilityStatus: "AVAILABLE" } }),
    prisma.maidProfile.count({ where: { availabilityStatus: "RESERVED" } }),
    prisma.maidProfile.count({ where: { availabilityStatus: "PLACED" } }),
  ]);

  return { total, draft, active, inactive, available, reserved, placed };
}

export async function getAdminMaidList(filters: ParsedAdminMaidFilters): Promise<AdminMaidListResult> {
  await requireAdmin();

  const where: Prisma.MaidProfileWhereInput = {};
  if (filters.profileStatus) where.profileStatus = filters.profileStatus;
  if (filters.availabilityStatus) where.availabilityStatus = filters.availabilityStatus;
  if (filters.maidType) where.maidType = filters.maidType as Prisma.MaidProfileWhereInput["maidType"];
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { profileCode: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const skip = (filters.page - 1) * ADMIN_PAGE_SIZE;

  const [rows, totalCount] = await Promise.all([
    prisma.maidProfile.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: ADMIN_PAGE_SIZE,
      select: {
        id: true,
        profileCode: true,
        name: true,
        maidType: true,
        maritalStatus: true,
        availabilityStatus: true,
        profileStatus: true,
        updatedAt: true,
        documents: { select: { type: true } },
      },
    }),
    prisma.maidProfile.count({ where }),
  ]);

  const items: AdminMaidListItem[] = rows.map((row) => ({
    id: row.id,
    profileCode: row.profileCode,
    name: row.name,
    maidType: row.maidType,
    maritalStatus: row.maritalStatus,
    availabilityStatus: row.availabilityStatus,
    profileStatus: row.profileStatus,
    hasPhoto: row.documents.some((d) => d.type === "PROFILE_PHOTO"),
    hasBiodata: row.documents.some((d) => d.type === "BIODATA_PDF"),
    updatedAt: row.updatedAt.toISOString(),
  }));

  return {
    items,
    page: filters.page,
    pageSize: ADMIN_PAGE_SIZE,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / ADMIN_PAGE_SIZE)),
  };
}

/** Full admin detail for the edit form. Unlike the employer DTO, this is allowed to include everything needed to populate every form field — it's already admin-gated. Still never returns internalNotes, Storage paths, or raw file bytes. */
export async function getAdminMaid(rawId: string): Promise<AdminMaidDetail | null> {
  await requireAdmin();

  const id = parseMaidId(rawId);
  if (!id) return null;

  const row = await prisma.maidProfile.findUnique({
    where: { id },
    select: {
      id: true,
      profileCode: true,
      name: true,
      nationality: true,
      dateOfBirth: true,
      maidType: true,
      maritalStatus: true,
      languages: true,
      heightCm: true,
      weightKg: true,
      yearsExperience: true,
      profileStatus: true,
      availabilityStatus: true,
      updatedAt: true,
      skills: { select: { skill: { select: { slug: true, category: true } } } },
      employmentHistory: {
        orderBy: { displayOrder: "asc" },
        select: { country: true, startYear: true, endYear: true, duties: true },
      },
      documents: { select: { type: true } },
    },
  });

  if (!row) return null;

  // Map back from the stored Skill slugs to which Expertise checkboxes
  // should be pre-checked — a generic skill (cooking-general, etc.) maps
  // 1:1; any fine-grained real-import skill (e.g. indonesian-home-cooking)
  // still maps by category, so editing a real pilot profile shows its
  // true expertise even though it wasn't entered through this form.
  const categoryToExpertise = new Map(
    Object.entries(EXPERTISE_SKILL_DEFS).map(([value, def]) => [def.category, value as ExpertiseOptionValue])
  );
  const expertise = Array.from(
    new Set(row.skills.map((s) => categoryToExpertise.get(s.skill.category)).filter((v): v is ExpertiseOptionValue => Boolean(v)))
  );

  return {
    id: row.id,
    profileCode: row.profileCode,
    name: row.name,
    nationality: row.nationality,
    dateOfBirth: row.dateOfBirth ? row.dateOfBirth.toISOString().slice(0, 10) : null,
    age: deriveAge(row.dateOfBirth),
    maidType: row.maidType,
    maritalStatus: row.maritalStatus,
    languages: row.languages,
    heightCm: row.heightCm,
    weightKg: row.weightKg,
    yearsExperience: row.yearsExperience,
    expertise,
    employmentHistory: row.employmentHistory,
    profileStatus: row.profileStatus,
    availabilityStatus: row.availabilityStatus,
    hasPhoto: row.documents.some((d) => d.type === "PROFILE_PHOTO"),
    hasBiodata: row.documents.some((d) => d.type === "BIODATA_PDF"),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ------------------------------------------------------------
// Publish-readiness validation
// ------------------------------------------------------------

/** Minimum requirements before a profile may be ACTIVE — see Phase 6 Step 9. Profile Photo is required alongside the Biodata PDF. */
function publishRequirementGaps(data: {
  profileCode: string;
  name: string;
  maidType: string;
  expertiseCount: number;
  hasBiodata: boolean;
  hasPhoto: boolean;
}): string[] {
  const gaps: string[] = [];
  if (!data.profileCode) gaps.push("Profile Code");
  if (!data.name) gaps.push("Name");
  if (!data.maidType) gaps.push("Maid Type");
  if (data.expertiseCount === 0) gaps.push("at least one Expertise category");
  if (!data.hasBiodata) gaps.push("Biodata PDF");
  if (!data.hasPhoto) gaps.push("Profile Photo");
  return gaps;
}

// ------------------------------------------------------------
// Write operations
// ------------------------------------------------------------

export type SaveMaidResult =
  | {
      ok: true;
      id: string;
      profileCode: string;
      /** True if saved exactly as requested; false if ACTIVE was requested but requirements weren't met, so it was kept/reverted to DRAFT instead. */
      publishedAsRequested: boolean;
      publishGaps: string[];
      fileWarnings: string[];
    }
  | { ok: false; reason: "DUPLICATE_PROFILE_CODE" };

async function uploadFileIfProvided(
  profileCode: string,
  photo: File | null,
  pdf: File | null
): Promise<{ photoPath: string | null; photoMime: string | null; pdfPath: string | null; warnings: string[] }> {
  const warnings: string[] = [];
  let photoPath: string | null = null;
  let photoMime: string | null = null;
  let pdfPath: string | null = null;

  const supabase = getSupabaseStorageAdmin();
  const bucket = getMaidDocumentBucket();

  if (photo && photo.size > 0) {
    const check = validatePhotoFile(photo);
    if (!check.ok) {
      warnings.push(`Photo not saved: ${check.message}`);
    } else {
      const ext = photo.type === "image/png" ? ".png" : photo.type === "image/webp" ? ".webp" : ".jpg";
      const path = `${profileCode}/photo${ext}`;
      const buffer = Buffer.from(await photo.arrayBuffer());
      const { error } = await supabase.storage.from(bucket).upload(path, buffer, { contentType: photo.type, upsert: true });
      if (error) {
        warnings.push(`Photo upload failed: ${error.message}`);
      } else {
        photoPath = path;
        photoMime = photo.type;
      }
    }
  }

  if (pdf && pdf.size > 0) {
    const check = validatePdfFile(pdf);
    if (!check.ok) {
      warnings.push(`Biodata PDF not saved: ${check.message}`);
    } else {
      const path = `${profileCode}/biodata.pdf`;
      const buffer = Buffer.from(await pdf.arrayBuffer());
      const { error } = await supabase.storage.from(bucket).upload(path, buffer, { contentType: "application/pdf", upsert: true });
      if (error) {
        warnings.push(`Biodata PDF upload failed: ${error.message}`);
      } else {
        pdfPath = path;
      }
    }
  }

  return { photoPath, photoMime, pdfPath, warnings };
}

/**
 * Creates a new DRAFT-or-requested-status maid profile. Files are
 * optional at creation time — Section D/E both say photo/PDF can be
 * added now or later from Edit.
 */
export async function createMaid(
  data: AdminMaidFormData,
  files: { photo: File | null; pdf: File | null }
): Promise<SaveMaidResult> {
  const admin = await requireAdmin();

  const existing = await prisma.maidProfile.findUnique({ where: { profileCode: data.profileCode }, select: { id: true } });
  if (existing) return { ok: false, reason: "DUPLICATE_PROFILE_CODE" };

  const { photoPath, photoMime, pdfPath, warnings: fileWarnings } = await uploadFileIfProvided(
    data.profileCode,
    files.photo,
    files.pdf
  );

  const expertiseSkillIds = await resolveExpertiseSkillIds(data.expertise);
  const languages = parseAndNormalizeLanguages(data.languagesRaw);

  const hasBiodataAfterThisSave = pdfPath !== null;
  const hasPhotoAfterThisSave = photoPath !== null;
  const gaps =
    data.profileStatus === "ACTIVE"
      ? publishRequirementGaps({
          profileCode: data.profileCode,
          name: data.name,
          maidType: data.maidType,
          expertiseCount: data.expertise.length,
          hasBiodata: hasBiodataAfterThisSave,
          hasPhoto: hasPhotoAfterThisSave,
        })
      : [];
  const finalProfileStatus = gaps.length > 0 ? "DRAFT" : data.profileStatus;

  const maid = await prisma.$transaction(async (tx) => {
    const created = await tx.maidProfile.create({
      data: {
        profileCode: data.profileCode,
        name: data.name,
        nationality: "Indonesian",
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        languages,
        yearsExperience: data.yearsExperience ?? 0,
        heightCm: data.heightCm ?? null,
        weightKg: data.weightKg ?? null,
        maritalStatus: (data.maritalStatus || null) as Prisma.MaidProfileCreateInput["maritalStatus"],
        maidType: data.maidType as Prisma.MaidProfileCreateInput["maidType"],
        profileStatus: finalProfileStatus as Prisma.MaidProfileCreateInput["profileStatus"],
        availabilityStatus: data.availabilityStatus as Prisma.MaidProfileCreateInput["availabilityStatus"],
      },
    });

    if (expertiseSkillIds.length > 0) {
      await tx.maidSkill.createMany({
        data: expertiseSkillIds.map((skillId) => ({ maidId: created.id, skillId })),
        skipDuplicates: true,
      });
    }

    for (const [index, entry] of data.employmentHistory.entries()) {
      if (!entry) continue;
      await tx.employmentHistory.create({
        data: {
          maidId: created.id,
          country: entry.country,
          startYear: entry.startYear ?? null,
          endYear: entry.endYear ?? null,
          duties: entry.duties || null,
          displayOrder: index,
        },
      });
    }

    return created;
  });

  if (photoPath) {
    await upsertMaidDocument(maid.id, "PROFILE_PHOTO", photoPath, photoMime ?? "image/jpeg");
    await logAudit(admin.id, "PROFILE_PHOTO_UPLOADED", maid.id);
  }
  if (pdfPath) {
    await upsertMaidDocument(maid.id, "BIODATA_PDF", pdfPath, "application/pdf");
    await logAudit(admin.id, "BIODATA_UPLOADED", maid.id);
  }

  await logAudit(admin.id, "MAID_CREATED", maid.id);

  return {
    ok: true,
    id: maid.id,
    profileCode: maid.profileCode,
    publishedAsRequested: finalProfileStatus === data.profileStatus,
    publishGaps: gaps,
    fileWarnings,
  };
}

/** Small helper — upserts a MaidDocument row. Not exported; only used after a Storage upload has already succeeded and we know the maid's id. */
async function upsertMaidDocument(maidId: string, type: "PROFILE_PHOTO" | "BIODATA_PDF", storagePath: string, mimeType: string) {
  await prisma.maidDocument.upsert({
    where: { maidId_type: { maidId, type } },
    update: { storagePath, mimeType },
    create: { maidId, type, storagePath, mimeType },
  });
}

export async function updateMaid(
  rawId: string,
  data: AdminMaidFormData,
  files: { photo: File | null; pdf: File | null }
): Promise<SaveMaidResult | { ok: false; reason: "NOT_FOUND" }> {
  const admin = await requireAdmin();

  const id = parseMaidId(rawId);
  if (!id) return { ok: false, reason: "NOT_FOUND" };

  const existing = await prisma.maidProfile.findUnique({
    where: { id },
    select: { id: true, profileCode: true, profileStatus: true, availabilityStatus: true, documents: { select: { type: true } } },
  });
  if (!existing) return { ok: false, reason: "NOT_FOUND" };

  if (data.profileCode !== existing.profileCode) {
    const clash = await prisma.maidProfile.findUnique({ where: { profileCode: data.profileCode }, select: { id: true } });
    if (clash && clash.id !== id) return { ok: false, reason: "DUPLICATE_PROFILE_CODE" };
  }

  const { photoPath, photoMime, pdfPath, warnings: fileWarnings } = await uploadFileIfProvided(
    data.profileCode,
    files.photo,
    files.pdf
  );

  const willHaveBiodata = pdfPath !== null || existing.documents.some((d) => d.type === "BIODATA_PDF");
  const willHavePhoto = photoPath !== null || existing.documents.some((d) => d.type === "PROFILE_PHOTO");
  const gaps =
    data.profileStatus === "ACTIVE"
      ? publishRequirementGaps({
          profileCode: data.profileCode,
          name: data.name,
          maidType: data.maidType,
          expertiseCount: data.expertise.length,
          hasBiodata: willHaveBiodata,
          hasPhoto: willHavePhoto,
        })
      : [];
  const finalProfileStatus = gaps.length > 0 ? "DRAFT" : data.profileStatus;

  const expertiseSkillIds = await resolveExpertiseSkillIds(data.expertise);
  const languages = parseAndNormalizeLanguages(data.languagesRaw);

  const maid = await prisma.$transaction(async (tx) => {
    const updated = await tx.maidProfile.update({
      where: { id },
      data: {
        profileCode: data.profileCode,
        name: data.name,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        languages,
        yearsExperience: data.yearsExperience ?? 0,
        heightCm: data.heightCm ?? null,
        weightKg: data.weightKg ?? null,
        maritalStatus: (data.maritalStatus || null) as Prisma.MaidProfileUpdateInput["maritalStatus"],
        maidType: data.maidType as Prisma.MaidProfileUpdateInput["maidType"],
        profileStatus: finalProfileStatus as Prisma.MaidProfileUpdateInput["profileStatus"],
        availabilityStatus: data.availabilityStatus as Prisma.MaidProfileUpdateInput["availabilityStatus"],
      },
    });

    // Idempotent replace — same delete-then-recreate convention as
    // scripts/import-real-maid.ts and prisma/seed.ts.
    await tx.maidSkill.deleteMany({ where: { maidId: id } });
    if (expertiseSkillIds.length > 0) {
      await tx.maidSkill.createMany({
        data: expertiseSkillIds.map((skillId) => ({ maidId: id, skillId })),
        skipDuplicates: true,
      });
    }

    await tx.employmentHistory.deleteMany({ where: { maidId: id } });
    for (const [index, entry] of data.employmentHistory.entries()) {
      if (!entry) continue;
      await tx.employmentHistory.create({
        data: {
          maidId: id,
          country: entry.country,
          startYear: entry.startYear ?? null,
          endYear: entry.endYear ?? null,
          duties: entry.duties || null,
          displayOrder: index,
        },
      });
    }

    return updated;
  });

  if (photoPath) {
    await upsertMaidDocument(maid.id, "PROFILE_PHOTO", photoPath, photoMime ?? "image/jpeg");
    await logAudit(admin.id, "PROFILE_PHOTO_UPLOADED", maid.id);
  }
  if (pdfPath) {
    await upsertMaidDocument(maid.id, "BIODATA_PDF", pdfPath, "application/pdf");
    await logAudit(admin.id, "BIODATA_UPLOADED", maid.id);
  }

  if (existing.profileStatus !== finalProfileStatus) await logAudit(admin.id, "PROFILE_STATUS_CHANGED", maid.id);
  if (existing.availabilityStatus !== data.availabilityStatus) await logAudit(admin.id, "AVAILABILITY_CHANGED", maid.id);
  await logAudit(admin.id, "MAID_UPDATED", maid.id);

  return {
    ok: true,
    id: maid.id,
    profileCode: maid.profileCode,
    publishedAsRequested: finalProfileStatus === data.profileStatus,
    publishGaps: gaps,
    fileWarnings,
  };
}

/**
 * Lightweight status-only update — Step 15. Not currently wired to a
 * dedicated inline UI control (Step 6 prefers status changes to happen
 * from Edit), but available as its own service function/Server Action.
 * Re-validates publish requirements exactly like the full form does.
 */
export async function updateMaidStatus(
  rawId: string,
  next: { profileStatus: "DRAFT" | "ACTIVE" | "INACTIVE"; availabilityStatus: "AVAILABLE" | "RESERVED" | "PLACED" | "UNAVAILABLE" }
): Promise<{ ok: true; publishedAsRequested: boolean; publishGaps: string[] } | { ok: false; reason: "NOT_FOUND" }> {
  const admin = await requireAdmin();

  const id = parseMaidId(rawId);
  if (!id) return { ok: false, reason: "NOT_FOUND" };

  const existing = await prisma.maidProfile.findUnique({
    where: { id },
    select: {
      profileCode: true,
      name: true,
      maidType: true,
      profileStatus: true,
      availabilityStatus: true,
      skills: { select: { id: true } },
      documents: { select: { type: true } },
    },
  });
  if (!existing) return { ok: false, reason: "NOT_FOUND" };

  const gaps =
    next.profileStatus === "ACTIVE"
      ? publishRequirementGaps({
          profileCode: existing.profileCode,
          name: existing.name,
          maidType: existing.maidType ?? "",
          expertiseCount: existing.skills.length,
          hasBiodata: existing.documents.some((d) => d.type === "BIODATA_PDF"),
          hasPhoto: existing.documents.some((d) => d.type === "PROFILE_PHOTO"),
        })
      : [];
  const finalProfileStatus = gaps.length > 0 ? "DRAFT" : next.profileStatus;

  await prisma.maidProfile.update({
    where: { id },
    data: { profileStatus: finalProfileStatus, availabilityStatus: next.availabilityStatus },
  });

  if (existing.profileStatus !== finalProfileStatus) await logAudit(admin.id, "PROFILE_STATUS_CHANGED", id);
  if (existing.availabilityStatus !== next.availabilityStatus) await logAudit(admin.id, "AVAILABILITY_CHANGED", id);

  return { ok: true, publishedAsRequested: finalProfileStatus === next.profileStatus, publishGaps: gaps };
}

// ------------------------------------------------------------
// Admin document preview — Step 12 ("Preview Employer Profile")
// ------------------------------------------------------------
// Deliberately a separate accessor from lib/services/maid-documents.ts,
// not a modification of it: that file is gated by requireEmployer() +
// the employer visibility policy specifically, and a DRAFT profile
// (which an admin very much needs to preview before publishing) would
// never pass that check. Same private-Storage, signed-URL-on-demand
// pattern and the same Storage client/bucket helpers — just gated by
// requireAdmin() and with no visibility filter, since an admin may
// legitimately preview any profile regardless of status.
const SIGNED_URL_TTL_SECONDS = 120;

export async function getAdminDocumentSignedUrl(
  rawMaidId: string,
  type: "BIODATA_PDF" | "PROFILE_PHOTO"
): Promise<{ ok: true; url: string } | { ok: false; reason: "INVALID_ID" | "NOT_FOUND" }> {
  await requireAdmin();

  const maidId = parseMaidId(rawMaidId);
  if (!maidId) return { ok: false, reason: "INVALID_ID" };

  const document = await prisma.maidDocument.findUnique({
    where: { maidId_type: { maidId, type } },
    select: { storagePath: true },
  });
  if (!document) return { ok: false, reason: "NOT_FOUND" };

  const supabase = getSupabaseStorageAdmin();
  const { data, error } = await supabase.storage
    .from(getMaidDocumentBucket())
    .createSignedUrl(document.storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.error(`Failed to create admin-preview signed URL for ${type}:`, error);
    return { ok: false, reason: "NOT_FOUND" };
  }

  return { ok: true, url: data.signedUrl };
}
