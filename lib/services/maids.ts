import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireEmployer } from "@/lib/auth/authorize";
import { employerVisibleMaidWhere, isEmployerVisibleAvailability } from "@/lib/maid-visibility";
import { normalizeLanguageLabel, slugifyLanguage } from "@/lib/language-taxonomy";
import {
  AGE_BUCKETS,
  EXPERIENCE_BUCKETS,
  EXPERTISE_CATEGORIES,
  MAID_TYPES,
  MARITAL_STATUSES,
  PAGE_SIZE,
  type ParsedMaidFilters,
} from "@/lib/validation/maid-filters";

/**
 * Employer-safe maid data layer — Phase 3.
 *
 * Every exported function here calls requireEmployer() itself, first —
 * this is the actual privacy boundary, not the dashboard layout guard
 * (which stays in place too, defense in depth). A future page or script
 * that imports this service without an active, ACTIVE, EMPLOYER-role
 * session gets rejected here regardless of how it was reached.
 *
 * Nothing in this file returns a raw Prisma model. Every query uses an
 * explicit `select` so fields that were never fetched (internalNotes,
 * above all) cannot leak by omission-at-render-time — they're not in the
 * object at all, not just hidden from the JSX.
 */

// ------------------------------------------------------------
// DTOs — what an employer is allowed to see. Not the Prisma model.
// ------------------------------------------------------------

export type EmployerMaidListItem = {
  id: string;
  profileCode: string;
  name: string;
  photoUrl: string | null;
  nationality: string;
  age: number | null;
  yearsExperience: number;
  availabilityStatus: "AVAILABLE" | "RESERVED";
  skills: string[];
};

export type EmployerMaidProfile = {
  id: string;
  profileCode: string;
  name: string;
  photoUrl: string | null;
  nationality: string;
  age: number | null;
  languages: string[];
  yearsExperience: number;
  availabilityStatus: "AVAILABLE" | "RESERVED";
  // Phase 4.6 — sourced from real biodata; null for fictional records
  // that never set them (existing seed data is unaffected).
  heightCm: number | null;
  weightKg: number | null;
  maritalStatus: string | null;
  maidType: string | null;
  // Phase 4.6.5 — the "short profile" product rule: the employer-facing
  // page shows only a short Expertise summary using the approved
  // categories (see lib/validation/maid-filters.ts EXPERTISE_CATEGORIES),
  // deduplicated — never individual skill names, experience levels, or
  // assessment notes, and never a category outside the approved set
  // (e.g. PET_CARE is real data but isn't shown here). Full skill detail,
  // MaidTraining, and EmploymentHistory all remain in PostgreSQL,
  // untouched — this DTO simply no longer selects or exposes them to the
  // employer-facing profile page. A future admin/internal service can
  // still query those tables directly.
  expertise: string[];
};

export type MaidListResult = {
  items: EmployerMaidListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

/** Age derived at read time from dateOfBirth — never persisted redundantly (see prisma/schema.prisma). */
function deriveAge(dateOfBirth: Date | null): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) age--;
  return age;
}

// Phase 4.6.5 — reverse lookup (Prisma SkillCategory -> approved display
// label) built from the same EXPERTISE_CATEGORIES map the filter uses, so
// the profile page's Expertise summary and the Expertise filter can never
// drift out of sync with each other.
const EXPERTISE_LABEL_BY_PRISMA_CATEGORY: Record<string, string> = Object.fromEntries(
  Object.values(EXPERTISE_CATEGORIES).map((c) => [c.prismaCategory, c.label])
);

/**
 * Maps a maid's raw skill categories down to the short, deduplicated
 * Expertise summary — only the approved categories ever appear
 * here (see EXPERTISE_LABEL_BY_PRISMA_CATEGORY); any other category
 * (e.g. PET_CARE) is silently excluded from this summary, not
 * mistranslated or invented a label for.
 */
function resolveExpertise(skillCategories: string[]): string[] {
  const labels = skillCategories.map((c) => EXPERTISE_LABEL_BY_PRISMA_CATEGORY[c]).filter((l): l is string => Boolean(l));
  return Array.from(new Set(labels));
}

/**
 * Phase 4.6.2 — if an explicitly-approved candidate photo exists
 * (MaidDocument type PROFILE_PHOTO), point the DTO at the secure,
 * authenticated route (/dashboard/maids/[id]/photo) rather than any raw
 * storage path or public URL. Falls back to the plain photoUrl column
 * (currently unused by every real record) so nothing regresses if that
 * column is ever populated directly for a genuinely public-safe image.
 */
function resolvePhotoUrl(maidId: string, rawPhotoUrl: string | null, documents: { type: string }[]): string | null {
  const hasApprovedPhoto = documents.some((d) => d.type === "PROFILE_PHOTO");
  return hasApprovedPhoto ? `/dashboard/maids/${maidId}/photo` : rawPhotoUrl;
}

function ageBucketToDateOfBirthRange(bucket: keyof typeof AGE_BUCKETS): { gte?: Date; lte?: Date } {
  const { minAge, maxAge } = AGE_BUCKETS[bucket];
  const today = new Date();
  // A person aged `maxAge` was born on or after (today - maxAge - 1 years + 1 day);
  // a person aged `minAge` was born on or before (today - minAge years). Using
  // year-only boundaries keeps this simple and matches the bucket's intent
  // (a coarse browse filter, not a precise age calculator).
  const lte = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
  const gte = maxAge == null ? undefined : new Date(today.getFullYear() - maxAge - 1, today.getMonth(), today.getDate() + 1);
  return { gte, lte };
}

function buildFilterWhere(filters: ParsedMaidFilters): Prisma.MaidProfileWhereInput {
  const where: Prisma.MaidProfileWhereInput = { ...employerVisibleMaidWhere() };

  // Defense in depth: filters.availability is already typed to only ever
  // be AVAILABLE/RESERVED by lib/validation/maid-filters.ts, but this
  // service does not simply trust that type — it re-checks at runtime
  // before ever letting a caller's value replace the base `in [...]`
  // clause from employerVisibleMaidWhere(). A filter value outside the
  // visible set (however it got here — validation bypass, a future
  // caller that skips parseMaidFilters, a bug) is silently ignored
  // rather than narrowing the query to something hidden.
  if (filters.availability && isEmployerVisibleAvailability(filters.availability)) {
    where.availabilityStatus = filters.availability;
  }

  if (filters.nationality) {
    where.nationality = { equals: filters.nationality, mode: "insensitive" };
  }

  if (filters.age) {
    const { gte, lte } = ageBucketToDateOfBirthRange(filters.age);
    where.dateOfBirth = { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
  }

  if (filters.experience) {
    const { min, max } = EXPERIENCE_BUCKETS[filters.experience];
    where.yearsExperience = { gte: min, ...(max != null ? { lte: max } : {}) };
  }

  // Phase 4.6.3 — Expertise: multi-select, OR semantics (a candidate
  // matches if they have a skill in ANY of the selected categories),
  // same convention as every other multi-select facet here. A single
  // `some` with `category: { in: [...] }` expresses that directly.
  if (filters.expertise && filters.expertise.length > 0) {
    const prismaCategories = filters.expertise.map((key) => EXPERTISE_CATEGORIES[key].prismaCategory);
    where.skills = { some: { skill: { category: { in: prismaCategories } } } };
  }

  // Phase 4.6.3 — Maid Type: multi-select, OR semantics.
  if (filters.maidType && filters.maidType.length > 0) {
    where.maidType = { in: filters.maidType.map((key) => MAID_TYPES[key].prismaValue) };
  }

  // Phase 4.6.3 — Marital: multi-select, OR semantics. A null
  // maritalStatus (unknown/not stated) never matches a specific filter —
  // `in: [...]` against a set of non-null enum values already excludes
  // NULL rows in SQL, so this needs no extra guard.
  if (filters.marital && filters.marital.length > 0) {
    where.maritalStatus = { in: filters.marital.map((key) => MARITAL_STATUSES[key].prismaValue) };
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { profileCode: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return where;
}

// ------------------------------------------------------------
// Public service functions
// ------------------------------------------------------------

/**
 * Listing query for /dashboard/maids. Loads only what MaidCard needs —
 * no employment history, no training records, no full skill detail — in
 * one query with a nested `select` (not a per-row loop), avoiding N+1.
 */
export async function listEmployerVisibleMaids(filters: ParsedMaidFilters): Promise<MaidListResult> {
  await requireEmployer();

  const where = buildFilterWhere(filters);

  // Phase 4.6.3 — Language: multi-select, OR semantics, matched against
  // real normalized data (see getLanguageIndex() below), never a
  // hardcoded list. Requested slug(s) that don't correspond to any real
  // employer-visible language narrow the result to zero rows — this is a
  // filter the employer explicitly applied, so it must never silently
  // degrade to "no filter".
  if (filters.language && filters.language.length > 0) {
    const { rawValuesBySlug } = await getLanguageIndex();
    const rawValues = Array.from(new Set(filters.language.flatMap((slug) => rawValuesBySlug[slug] ?? [])));
    if (rawValues.length > 0) {
      where.languages = { hasSome: rawValues };
    } else {
      where.id = { in: [] }; // guaranteed-empty match, not "no filter"
    }
  }

  const skip = (filters.page - 1) * PAGE_SIZE;

  const [rows, totalCount] = await Promise.all([
    prisma.maidProfile.findMany({
      where,
      orderBy: { profileCode: "asc" }, // stable, predictable default — no sort UI exists to drive anything else
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        profileCode: true,
        name: true,
        photoUrl: true,
        nationality: true,
        dateOfBirth: true,
        yearsExperience: true,
        availabilityStatus: true,
        skills: { select: { skill: { select: { name: true } } } },
        documents: { select: { type: true } },
      },
    }),
    prisma.maidProfile.count({ where }),
  ]);

  const items: EmployerMaidListItem[] = rows.map((row) => ({
    id: row.id,
    profileCode: row.profileCode,
    name: row.name,
    photoUrl: resolvePhotoUrl(row.id, row.photoUrl, row.documents),
    nationality: row.nationality,
    age: deriveAge(row.dateOfBirth),
    yearsExperience: row.yearsExperience,
    // Safe cast: buildFilterWhere() always ANDs employerVisibleMaidWhere(),
    // so every row's availabilityStatus is guaranteed AVAILABLE or RESERVED.
    availabilityStatus: row.availabilityStatus as "AVAILABLE" | "RESERVED",
    skills: row.skills.map((s) => s.skill.name),
  }));

  return {
    items,
    page: filters.page,
    pageSize: PAGE_SIZE,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
  };
}

/**
 * Detail query for /dashboard/maids/[id]. Returns null for anything not
 * employer-visible — a DRAFT profile, an INACTIVE one, a PLACED/
 * UNAVAILABLE one, or an id that doesn't exist at all — so the caller can
 * (and must) treat every one of those identically via notFound(). Never
 * reveals which specific reason caused the miss.
 */
export async function getEmployerVisibleMaidProfile(id: string): Promise<EmployerMaidProfile | null> {
  await requireEmployer();

  const row = await prisma.maidProfile.findFirst({
    where: { id, ...employerVisibleMaidWhere() },
    select: {
      id: true,
      profileCode: true,
      name: true,
      photoUrl: true,
      nationality: true,
      dateOfBirth: true,
      languages: true,
      yearsExperience: true,
      availabilityStatus: true,
      heightCm: true,
      weightKg: true,
      maritalStatus: true,
      maidType: true,
      // Only the category is selected — never the individual skill name,
      // experience level, or notes (Phase 4.6.5: the employer-facing
      // profile shows a short Expertise summary, not an assessment
      // table). Detailed MaidSkill data stays in Postgres and can still
      // be selected by a future admin/internal query.
      skills: {
        select: { skill: { select: { category: true } } },
      },
      documents: { select: { type: true } },
    },
  });

  if (!row) return null;

  return {
    id: row.id,
    profileCode: row.profileCode,
    name: row.name,
    photoUrl: resolvePhotoUrl(row.id, row.photoUrl, row.documents),
    nationality: row.nationality,
    age: deriveAge(row.dateOfBirth),
    languages: row.languages,
    yearsExperience: row.yearsExperience,
    availabilityStatus: row.availabilityStatus as "AVAILABLE" | "RESERVED",
    heightCm: row.heightCm,
    weightKg: row.weightKg,
    maritalStatus: row.maritalStatus,
    maidType: row.maidType,
    expertise: resolveExpertise(row.skills.map((s) => s.skill.category)),
  };
}

/**
 * Distinct nationalities among employer-visible profiles. Not currently
 * called by any page — Phase 4.6.3 removed the Nationality filter from
 * the employer UI (every current candidate is Indonesian, so a
 * single-option filter had no value), but `nationality` remains real
 * profile data, and this query capability is kept ready rather than
 * deleted in case it's needed again once other nationalities exist.
 */
export async function getEmployerVisibleNationalities(): Promise<string[]> {
  await requireEmployer();

  const rows = await prisma.maidProfile.findMany({
    where: employerVisibleMaidWhere(),
    distinct: ["nationality"],
    select: { nationality: true },
    orderBy: { nationality: "asc" },
  });

  return rows.map((r) => r.nationality);
}

// ------------------------------------------------------------
// Language filter — Phase 4.6.3
// ------------------------------------------------------------

/**
 * Builds the Language filter's option list AND the slug→raw-value lookup
 * used to actually query Postgres, from one pass over every
 * employer-visible maid's real `languages` array — never a hardcoded
 * list. If two raw spellings normalize to the same canonical label (e.g.
 * a future "Bahasa" alongside an existing "Bahasa Indonesia"), they
 * collapse into one filter option, and selecting it matches every raw
 * variant.
 */
async function getLanguageIndex(): Promise<{
  options: { slug: string; label: string }[];
  rawValuesBySlug: Record<string, string[]>;
}> {
  const rows = await prisma.maidProfile.findMany({
    where: employerVisibleMaidWhere(),
    select: { languages: true },
  });

  const rawValuesBySlug: Record<string, string[]> = {};
  const labelBySlug: Record<string, string> = {};

  for (const row of rows) {
    for (const raw of row.languages) {
      const label = normalizeLanguageLabel(raw);
      const slug = slugifyLanguage(label);
      labelBySlug[slug] = label;
      const bucket = (rawValuesBySlug[slug] ??= []);
      if (!bucket.includes(raw)) bucket.push(raw);
    }
  }

  const options = Object.entries(labelBySlug)
    .map(([slug, label]) => ({ slug, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return { options, rawValuesBySlug };
}

/**
 * Distinct, normalized languages among employer-visible profiles, for
 * the Language filter's option list — same "queried from real data, only
 * shows what's actually browsable" principle as
 * getEmployerVisibleNationalities().
 */
export async function getEmployerVisibleLanguages(): Promise<{ slug: string; label: string }[]> {
  await requireEmployer();
  const { options } = await getLanguageIndex();
  return options;
}
