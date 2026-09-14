import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireEmployer } from "@/lib/auth/authorize";
import { employerVisibleMaidWhere, isEmployerVisibleAvailability } from "@/lib/maid-visibility";
import {
  AGE_BUCKETS,
  EXPERIENCE_BUCKETS,
  PAGE_SIZE,
  SKILL_CATEGORIES,
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
  skills: { name: string; category: string; experienceLevel: string | null }[];
  trainings: { title: string; completed: boolean; completedAt: string | null }[];
  employmentHistory: {
    country: string;
    duties: string | null;
    householdDescription: string | null;
    startDate: string;
    endDate: string | null;
  }[];
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

  if (filters.skill) {
    const { prismaCategory } = SKILL_CATEGORIES[filters.skill];
    where.skills = { some: { skill: { category: prismaCategory } } };
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
      },
    }),
    prisma.maidProfile.count({ where }),
  ]);

  const items: EmployerMaidListItem[] = rows.map((row) => ({
    id: row.id,
    profileCode: row.profileCode,
    name: row.name,
    photoUrl: row.photoUrl,
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
      skills: {
        select: { experienceLevel: true, skill: { select: { name: true, category: true } } },
      },
      trainings: {
        select: { completed: true, completedAt: true, trainingModule: { select: { title: true } } },
      },
      employmentHistory: {
        orderBy: { displayOrder: "asc" },
        select: { country: true, duties: true, householdDescription: true, startDate: true, endDate: true },
      },
    },
  });

  if (!row) return null;

  return {
    id: row.id,
    profileCode: row.profileCode,
    name: row.name,
    photoUrl: row.photoUrl,
    nationality: row.nationality,
    age: deriveAge(row.dateOfBirth),
    languages: row.languages,
    yearsExperience: row.yearsExperience,
    availabilityStatus: row.availabilityStatus as "AVAILABLE" | "RESERVED",
    skills: row.skills.map((s) => ({
      name: s.skill.name,
      category: s.skill.category,
      experienceLevel: s.experienceLevel,
    })),
    trainings: row.trainings.map((t) => ({
      title: t.trainingModule.title,
      completed: t.completed,
      completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    })),
    employmentHistory: row.employmentHistory.map((e) => ({
      country: e.country,
      duties: e.duties,
      householdDescription: e.householdDescription,
      startDate: e.startDate.toISOString(),
      endDate: e.endDate ? e.endDate.toISOString() : null,
    })),
  };
}

/**
 * Distinct nationalities among employer-visible profiles, for the
 * Nationality filter's option list — queried from the database rather
 * than hardcoded, so it never drifts from what's actually browsable and
 * never lists a nationality that has zero visible profiles.
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
