import "server-only";
import { z } from "zod";

/**
 * Validation for the admin "Add/Edit Maid" form — Phase 6.
 *
 * Deliberately a small subset of the full biodata form: only the fields
 * the employer-facing short profile actually needs (search, filters,
 * matching, profile summary) plus a light-touch, optional Employment
 * History for internal use. This is NOT a reproduction of the FDW
 * biodata questionnaire — the original PDF remains the source of truth
 * for full detail, uploaded as-is via Section E.
 */

export const MAID_TYPE_OPTIONS = [
  { value: "NEW", label: "New Maid" },
  { value: "TRANSFER", label: "Transfer Maid" },
  { value: "EX_SINGAPORE", label: "Ex-Singapore Maid" },
  { value: "EX_OTHERS", label: "Ex-Others Maid" },
] as const;

export const MARITAL_STATUS_OPTIONS = [
  { value: "SINGLE", label: "Single" },
  { value: "MARRIED", label: "Married" },
  { value: "DIVORCED", label: "Divorced" },
  { value: "WIDOWED", label: "Widowed" },
] as const;

// The five approved employer-facing Expertise categories — same set as
// lib/validation/maid-filters.ts EXPERTISE_CATEGORIES, and each maps to
// exactly one "generic" Skill row (see
// lib/services/admin/maids.ts ensureExpertiseSkills()) rather than any
// of the fine-grained, cuisine/age-specific skills real biodata imports
// use — an admin-entered profile only ever needs the category.
export const EXPERTISE_OPTIONS = [
  { value: "cooking", label: "Cooking" },
  { value: "eldercare", label: "Eldercare" },
  { value: "childcare", label: "Childcare" },
  { value: "infantcare", label: "Infantcare" },
  { value: "general-housekeeping", label: "General Housekeeping" },
] as const;
export type ExpertiseOptionValue = (typeof EXPERTISE_OPTIONS)[number]["value"];

export const PROFILE_STATUS_OPTIONS = ["DRAFT", "ACTIVE", "INACTIVE"] as const;
export const AVAILABILITY_STATUS_OPTIONS = ["AVAILABLE", "RESERVED", "PLACED", "UNAVAILABLE"] as const;

// Number of Employment History row slots rendered on the form. Fixed
// rather than dynamically add-able so the form stays a plain server
// <form> + Server Action with no client JS — an empty row (no country)
// is simply not saved. Matches the project's established "zero-client-JS
// form" convention (see app/dashboard/maids/page.tsx's filter sidebar).
export const EMPLOYMENT_HISTORY_ROW_COUNT = 4;

const profileCodeSchema = z
  .string()
  .trim()
  .min(1, "Profile Code is required.")
  .max(30, "Profile Code is too long.")
  .regex(/^[A-Za-z0-9-]+$/, "Profile Code can only contain letters, numbers, and hyphens.");

const nameSchema = z.string().trim().min(1, "Name is required.").max(200);

const dateOfBirthSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => v === undefined || !Number.isNaN(Date.parse(v)), { message: "Invalid date of birth." });

const maidTypeSchema = z.enum(MAID_TYPE_OPTIONS.map((o) => o.value) as [string, ...string[]]);
const maritalStatusSchema = z.enum(MARITAL_STATUS_OPTIONS.map((o) => o.value) as [string, ...string[]]);
const expertiseSchema = z.enum(EXPERTISE_OPTIONS.map((o) => o.value) as [ExpertiseOptionValue, ...ExpertiseOptionValue[]]);
const profileStatusSchema = z.enum(PROFILE_STATUS_OPTIONS);
const availabilityStatusSchema = z.enum(AVAILABILITY_STATUS_OPTIONS);

const optionalPositiveInt = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? Number(v) : undefined))
  .refine((v) => v === undefined || (Number.isInteger(v) && v > 0), { message: "Must be a positive whole number." });

const yearSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? Number(v) : undefined))
  .refine((v) => v === undefined || (Number.isInteger(v) && v >= 1980 && v <= new Date().getFullYear() + 1), {
    message: "Enter a realistic year.",
  });

const employmentHistoryRowSchema = z
  .object({
    country: z.string().trim().max(100).optional().default(""),
    startYear: yearSchema,
    endYear: yearSchema,
    duties: z.string().trim().max(1000).optional().default(""),
  })
  // A row is only kept if a country was actually entered — this is what
  // makes the fixed-row-count form work without JS: blank slots vanish.
  .transform((row) => (row.country.length > 0 ? row : null));

export const adminMaidFormSchema = z.object({
  profileCode: profileCodeSchema,
  name: nameSchema,
  dateOfBirth: dateOfBirthSchema,
  maidType: maidTypeSchema,
  maritalStatus: z.union([maritalStatusSchema, z.literal("")]).optional(),
  languagesRaw: z.string().trim().max(500).optional().default(""),
  heightCm: optionalPositiveInt,
  weightKg: optionalPositiveInt,
  yearsExperience: optionalPositiveInt,
  expertise: z.array(expertiseSchema).default([]),
  employmentHistory: z.array(employmentHistoryRowSchema).default([]),
  profileStatus: profileStatusSchema,
  availabilityStatus: availabilityStatusSchema,
});

export type AdminMaidFormInput = z.input<typeof adminMaidFormSchema>;
export type AdminMaidFormData = z.output<typeof adminMaidFormSchema>;

/**
 * Parses a submitted admin maid form's FormData into the validated
 * shape above. Never throws on bad input — the caller (a Server Action)
 * checks `.success` and returns a field-level error list to re-render
 * the form with, per Section 17 ("do not trust browser input").
 */
export function parseAdminMaidForm(formData: FormData) {
  const employmentHistory = Array.from({ length: EMPLOYMENT_HISTORY_ROW_COUNT }, (_, i) => ({
    country: formData.get(`employmentHistory.${i}.country`)?.toString() ?? "",
    startYear: formData.get(`employmentHistory.${i}.startYear`)?.toString() ?? "",
    endYear: formData.get(`employmentHistory.${i}.endYear`)?.toString() ?? "",
    duties: formData.get(`employmentHistory.${i}.duties`)?.toString() ?? "",
  }));

  return adminMaidFormSchema.safeParse({
    profileCode: formData.get("profileCode")?.toString() ?? "",
    name: formData.get("name")?.toString() ?? "",
    dateOfBirth: formData.get("dateOfBirth")?.toString() ?? "",
    maidType: formData.get("maidType")?.toString() ?? "",
    maritalStatus: formData.get("maritalStatus")?.toString() ?? "",
    languagesRaw: formData.get("languages")?.toString() ?? "",
    heightCm: formData.get("heightCm")?.toString() ?? "",
    weightKg: formData.get("weightKg")?.toString() ?? "",
    yearsExperience: formData.get("yearsExperience")?.toString() ?? "",
    expertise: formData.getAll("expertise").map((v) => v.toString()),
    employmentHistory,
    profileStatus: formData.get("profileStatus")?.toString() ?? "DRAFT",
    availabilityStatus: formData.get("availabilityStatus")?.toString() ?? "UNAVAILABLE",
  });
}

// ------------------------------------------------------------
// File upload validation — Phase 6 (Sections D/E)
// ------------------------------------------------------------

export const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PHOTO_MAX_BYTES = 8 * 1024 * 1024; // 8MB
export const PDF_MIME_TYPE = "application/pdf";
export const PDF_MAX_BYTES = 10 * 1024 * 1024; // 10MB — matches the private bucket's own limit

export type FileValidationResult = { ok: true } | { ok: false; message: string };

/** Server-side MIME/size validation — never trust the browser's `accept=` alone. */
export function validatePhotoFile(file: File): FileValidationResult {
  if (!(PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, message: "Photo must be a JPEG, PNG, or WEBP image." };
  }
  if (file.size > PHOTO_MAX_BYTES) {
    return { ok: false, message: "Photo is too large (max 8MB)." };
  }
  return { ok: true };
}

export function validatePdfFile(file: File): FileValidationResult {
  if (file.type !== PDF_MIME_TYPE) {
    return { ok: false, message: "Biodata document must be a PDF file." };
  }
  if (file.size > PDF_MAX_BYTES) {
    return { ok: false, message: "PDF is too large (max 10MB)." };
  }
  return { ok: true };
}

// ------------------------------------------------------------
// Admin maid list filters — /admin/maids
// ------------------------------------------------------------
// Deliberately a different, staff-oriented shape from
// lib/validation/maid-filters.ts (the employer filter set) — see that
// file's own note on why Expertise/Language filters there don't apply
// here. Same "never throw, degrade to no-filter" convention.

const adminSearchSchema = z.string().trim().min(1).max(100);

export type ParsedAdminMaidFilters = {
  search?: string;
  profileStatus?: (typeof PROFILE_STATUS_OPTIONS)[number];
  availabilityStatus?: (typeof AVAILABILITY_STATUS_OPTIONS)[number];
  maidType?: (typeof MAID_TYPE_OPTIONS)[number]["value"];
  page: number;
};

const adminPageSchema = z.coerce.number().int().min(1).max(500);

export function parseAdminMaidFilters(raw: Record<string, string | string[] | undefined>): ParsedAdminMaidFilters {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const safeParse = <T>(schema: z.ZodType<T>, v: string | undefined): T | undefined => {
    if (v === undefined) return undefined;
    const r = schema.safeParse(v);
    return r.success ? r.data : undefined;
  };

  return {
    search: safeParse(adminSearchSchema, first(raw.search)),
    profileStatus: safeParse(profileStatusSchema, first(raw.profileStatus)) as ParsedAdminMaidFilters["profileStatus"],
    availabilityStatus: safeParse(availabilityStatusSchema, first(raw.availabilityStatus)) as ParsedAdminMaidFilters["availabilityStatus"],
    maidType: safeParse(maidTypeSchema, first(raw.maidType)) as ParsedAdminMaidFilters["maidType"],
    page: safeParse(adminPageSchema, first(raw.page)) ?? 1,
  };
}

export const ADMIN_PAGE_SIZE = 20;
