import "server-only";
import { z } from "zod";
import { EMPLOYER_VISIBLE_AVAILABILITY_STATUSES, isEmployerVisibleAvailability } from "@/lib/maid-visibility";

/**
 * Validation for the /dashboard/maids query-string filters — Phase 3.
 *
 * Maps exactly to the five sidebar controls that already exist in
 * app/dashboard/maids/page.tsx (Nationality, Age, Experience, Skills,
 * Availability) plus the search box and pagination. No filter is added
 * here that doesn't already have a corresponding UI control.
 *
 * Every value is parsed with safeParse and falls back to "no filter"
 * on anything invalid — malformed/forged query strings must never reach
 * Prisma or throw a server error, they just behave as if that filter
 * wasn't set. Availability is the one exception worth calling out: it
 * can only select a value already inside EMPLOYER_VISIBLE_AVAILABILITY_STATUSES
 * (see lib/maid-visibility.ts) — there is no way to construct a filter
 * value that reaches PLACED or UNAVAILABLE profiles, by construction of
 * the zod enum itself, not by a runtime check that could be bypassed.
 */

export const PAGE_SIZE = 12;
const MAX_PAGE = 500; // sane ceiling — bounds how large an offset a request can ask for

export const AGE_BUCKETS = {
  "18-25": { minAge: 18, maxAge: 25, label: "18–25" },
  "26-35": { minAge: 26, maxAge: 35, label: "26–35" },
  "36-45": { minAge: 36, maxAge: 45, label: "36–45" },
  "46-plus": { minAge: 46, maxAge: null, label: "46+" },
} as const;
export type AgeBucketKey = keyof typeof AGE_BUCKETS;

export const EXPERIENCE_BUCKETS = {
  "0-2": { min: 0, max: 2, label: "0–2 years" },
  "3-5": { min: 3, max: 5, label: "3–5 years" },
  "5-plus": { min: 5, max: null, label: "5+ years" },
} as const;
export type ExperienceBucketKey = keyof typeof EXPERIENCE_BUCKETS;

// Matches Skill.category (prisma/schema.prisma SkillCategory) — a
// browse-level "Skills" filter groups by category, not by the ~10
// individual fine-grained Skill rows, since that's what the sidebar's
// single "Skills" dropdown is for (a broad category, not a specific
// skill pick-list) and matches the category language already used in
// the public site copy (services page: "childcare, elderly care, or
// housekeeping").
export const SKILL_CATEGORIES = {
  childcare: { prismaCategory: "CHILDCARE", label: "Childcare" },
  "elderly-care": { prismaCategory: "ELDERLY_CARE", label: "Elderly Care" },
  housekeeping: { prismaCategory: "HOUSEKEEPING", label: "Housekeeping" },
  cooking: { prismaCategory: "COOKING", label: "Cooking" },
  "pet-care": { prismaCategory: "PET_CARE", label: "Pet Care" },
} as const;
export type SkillCategoryKey = keyof typeof SKILL_CATEGORIES;

const availabilitySchema = z
  .string()
  .toUpperCase()
  .refine(isEmployerVisibleAvailability, { message: "not an employer-visible availability value" });

const searchSchema = z.string().trim().min(1).max(100);
const nationalitySchema = z.string().trim().min(1).max(100);
const ageSchema = z.enum(Object.keys(AGE_BUCKETS) as [AgeBucketKey, ...AgeBucketKey[]]);
const experienceSchema = z.enum(Object.keys(EXPERIENCE_BUCKETS) as [ExperienceBucketKey, ...ExperienceBucketKey[]]);
const skillSchema = z.enum(Object.keys(SKILL_CATEGORIES) as [SkillCategoryKey, ...SkillCategoryKey[]]);
const pageSchema = z.coerce.number().int().min(1).max(MAX_PAGE);

/** Parses one field independently — an invalid value on one filter must never discard the others. */
function safe<T>(schema: z.ZodType<T>, value: string | undefined): T | undefined {
  if (value === undefined) return undefined;
  const result = schema.safeParse(value);
  return result.success ? result.data : undefined;
}

export type ParsedMaidFilters = {
  search?: string;
  nationality?: string;
  age?: AgeBucketKey;
  experience?: ExperienceBucketKey;
  skill?: SkillCategoryKey;
  availability?: (typeof EMPLOYER_VISIBLE_AVAILABILITY_STATUSES)[number];
  page: number;
};

type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/**
 * Parses raw Next.js searchParams into a safe, typed filter object.
 * Never throws — anything that doesn't validate is simply omitted, so a
 * malformed or hand-crafted query string degrades to "show everything
 * (within the visibility policy)" rather than erroring.
 */
export function parseMaidFilters(rawSearchParams: RawSearchParams): ParsedMaidFilters {
  return {
    search: safe(searchSchema, firstValue(rawSearchParams.search)),
    nationality: safe(nationalitySchema, firstValue(rawSearchParams.nationality)),
    age: safe(ageSchema, firstValue(rawSearchParams.age)),
    experience: safe(experienceSchema, firstValue(rawSearchParams.experience)),
    skill: safe(skillSchema, firstValue(rawSearchParams.skill)),
    availability: safe(availabilitySchema, firstValue(rawSearchParams.availability)),
    page: safe(pageSchema, firstValue(rawSearchParams.page)) ?? 1,
  };
}
