import "server-only";
import { z } from "zod";
import { EMPLOYER_VISIBLE_AVAILABILITY_STATUSES, isEmployerVisibleAvailability } from "@/lib/maid-visibility";

/**
 * Validation for the /dashboard/maids query-string filters.
 *
 * Phase 3 shape: Nationality, Age, Experience, Skills, Availability, plus
 * search + pagination.
 *
 * Phase 4.6.3 revision: the Nationality filter is retired from the
 * employer-facing UI (every current candidate is Indonesian — a
 * single-option filter has no value to an employer) but the underlying
 * `nationality` field/query capability is deliberately left in place, not
 * deleted — it's still real profile data, and removing the capability
 * outright would also gut the existing Phase 3 nationality-filter
 * integration tests for no product benefit. Skills becomes "Expertise",
 * restricted to five approved employer-facing categories and — like Maid
 * Type and Marital — now multi-select. Language is a new multi-select
 * filter whose *options* are computed dynamically from real data (see
 * lib/services/maids.ts getEmployerVisibleLanguages()); this file only
 * validates the *shape* of an incoming language value (a normalized
 * slug), never a hardcoded list of "the" languages.
 *
 * Every value is parsed with safeParse and falls back to "no filter" on
 * anything invalid — malformed/forged query strings must never reach
 * Prisma or throw a server error. Availability is the one exception worth
 * calling out: it can only select a value already inside
 * EMPLOYER_VISIBLE_AVAILABILITY_STATUSES (see lib/maid-visibility.ts) —
 * there is no way to construct a filter value that reaches PLACED or
 * UNAVAILABLE profiles, by construction of the zod enum itself, not by a
 * runtime check that could be bypassed.
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

// Approved employer-facing "Expertise" categories (Phase 4.6.3) — exactly
// these five, mapped onto the existing Skill.category taxonomy
// (prisma/schema.prisma SkillCategory). PET_CARE is a real category with
// real Skill rows attached to it, but it is not on the approved list and
// is deliberately excluded here — do not add a sixth category without
// separate approval.
export const EXPERTISE_CATEGORIES = {
  cooking: { prismaCategory: "COOKING", label: "Cooking" },
  eldercare: { prismaCategory: "ELDERLY_CARE", label: "Eldercare" },
  childcare: { prismaCategory: "CHILDCARE", label: "Childcare" },
  infantcare: { prismaCategory: "INFANT_CARE", label: "Infantcare" },
  "general-housekeeping": { prismaCategory: "HOUSEKEEPING", label: "General Housekeeping" },
} as const;
export type ExpertiseKey = keyof typeof EXPERTISE_CATEGORIES;

// Maid Type (Phase 4.6.3) — matches prisma/schema.prisma MaidType exactly;
// see that enum's doc comment for what each value means.
export const MAID_TYPES = {
  "new-maid": { prismaValue: "NEW", label: "New Maid" },
  "transfer-maid": { prismaValue: "TRANSFER", label: "Transfer Maid" },
  "ex-singapore-maid": { prismaValue: "EX_SINGAPORE", label: "Ex-Singapore Maid" },
  "ex-others-maid": { prismaValue: "EX_OTHERS", label: "Ex-Others Maid" },
} as const;
export type MaidTypeKey = keyof typeof MAID_TYPES;

// Marital (Phase 4.6.3) — matches prisma/schema.prisma MaritalStatus.
export const MARITAL_STATUSES = {
  single: { prismaValue: "SINGLE", label: "Single" },
  married: { prismaValue: "MARRIED", label: "Married" },
  divorced: { prismaValue: "DIVORCED", label: "Divorced" },
  widowed: { prismaValue: "WIDOWED", label: "Widowed" },
} as const;
export type MaritalStatusKey = keyof typeof MARITAL_STATUSES;

const availabilitySchema = z
  .string()
  .toUpperCase()
  .refine(isEmployerVisibleAvailability, { message: "not an employer-visible availability value" });

const searchSchema = z.string().trim().min(1).max(100);
const nationalitySchema = z.string().trim().min(1).max(100);
const ageSchema = z.enum(Object.keys(AGE_BUCKETS) as [AgeBucketKey, ...AgeBucketKey[]]);
const experienceSchema = z.enum(Object.keys(EXPERIENCE_BUCKETS) as [ExperienceBucketKey, ...ExperienceBucketKey[]]);
const expertiseSchema = z.enum(Object.keys(EXPERTISE_CATEGORIES) as [ExpertiseKey, ...ExpertiseKey[]]);
const maidTypeSchema = z.enum(Object.keys(MAID_TYPES) as [MaidTypeKey, ...MaidTypeKey[]]);
const maritalSchema = z.enum(Object.keys(MARITAL_STATUSES) as [MaritalStatusKey, ...MaritalStatusKey[]]);
// Shape-only: a normalized, URL-safe slug. The actual set of *valid*
// languages is data-driven (lib/services/maids.ts
// getEmployerVisibleLanguages()) and deliberately not hardcoded here — an
// unrecognized slug simply matches zero rows in the query layer rather
// than being rejected here, same "degrade gracefully" philosophy as
// every other filter in this file.
const languageSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  .max(60);
const pageSchema = z.coerce.number().int().min(1).max(MAX_PAGE);

/** Parses one field independently — an invalid value on one filter must never discard the others. */
function safe<T>(schema: z.ZodType<T>, value: string | undefined): T | undefined {
  if (value === undefined) return undefined;
  const result = schema.safeParse(value);
  return result.success ? result.data : undefined;
}

/**
 * Parses a multi-select field (repeated query params, e.g.
 * ?expertise=childcare&expertise=cooking). Each value is validated
 * independently and invalid ones are dropped silently — one bad value
 * never discards the rest of a valid multi-select. Deduplicated. Returns
 * undefined (not an empty array) when nothing valid was supplied, so
 * "no filter" and "filter present but empty" are never conflated.
 */
function safeMulti<T>(schema: z.ZodType<T>, values: string[] | undefined): T[] | undefined {
  if (!values || values.length === 0) return undefined;
  const parsed = values
    .map((v) => schema.safeParse(v))
    .filter((r): r is { success: true; data: T } => r.success)
    .map((r) => r.data);
  const deduped = Array.from(new Set(parsed));
  return deduped.length > 0 ? deduped : undefined;
}

export type ParsedMaidFilters = {
  search?: string;
  nationality?: string;
  age?: AgeBucketKey;
  experience?: ExperienceBucketKey;
  expertise?: ExpertiseKey[];
  maidType?: MaidTypeKey[];
  marital?: MaritalStatusKey[];
  language?: string[]; // validated slugs — matched against real data in the service layer
  availability?: (typeof EMPLOYER_VISIBLE_AVAILABILITY_STATUSES)[number];
  page: number;
};

type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function allValues(v: string | string[] | undefined): string[] | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v : [v];
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
    expertise: safeMulti(expertiseSchema, allValues(rawSearchParams.expertise)),
    maidType: safeMulti(maidTypeSchema, allValues(rawSearchParams.maidType)),
    marital: safeMulti(maritalSchema, allValues(rawSearchParams.marital)),
    language: safeMulti(languageSlugSchema, allValues(rawSearchParams.language)),
    availability: safe(availabilitySchema, firstValue(rawSearchParams.availability)),
    page: safe(pageSchema, firstValue(rawSearchParams.page)) ?? 1,
  };
}
