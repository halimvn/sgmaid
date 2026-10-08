import "server-only";
import { z } from "zod";
import { explainDayFirstDateProblem, parseDayFirstDate } from "@/lib/format-date";
import { UPLOAD_TOTAL_MAX_BYTES, UPLOAD_TOTAL_MAX_LABEL } from "@/lib/upload-limits";

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

import {
  MAID_TYPE_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  EXPERTISE_OPTIONS,
  PROFILE_STATUS_OPTIONS,
  AVAILABILITY_STATUS_OPTIONS,
  EMPLOYMENT_HISTORY_ROW_COUNT,
  type ExpertiseOptionValue,
} from "@/lib/validation/maid-form-options";

// Re-exported so existing imports from this module keep working; the definitions live in a
// client-safe file because the Add/Edit form (a client component) needs them too.
export {
  MAID_TYPE_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  EXPERTISE_OPTIONS,
  PROFILE_STATUS_OPTIONS,
  AVAILABILITY_STATUS_OPTIONS,
  EMPLOYMENT_HISTORY_ROW_COUNT,
  type ExpertiseOptionValue,
};

const profileCodeSchema = z
  .string()
  .trim()
  .min(1, "Profile Code is required.")
  .max(30, "Profile Code is too long.")
  .regex(/^[A-Za-z0-9-]+$/, "Profile Code can only contain letters, numbers, and hyphens.");

const nameSchema = z.string().trim().min(1, "Name is required.").max(200);

// Entered as dd/mm/yyyy (see lib/format-date.ts for why this is a text field, not
// <input type="date">) and normalised here to the ISO yyyy-mm-dd string the rest of
// the app already stores/reads. Blank = not provided.
const dateOfBirthSchema = z
  .string()
  .optional()
  .superRefine((v, ctx) => {
    const problem = explainDayFirstDateProblem(v ?? "");
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  })
  .transform((v) => {
    const r = parseDayFirstDate(v ?? "");
    return r.ok && r.iso ? r.iso : undefined;
  });

const maidTypeSchema = z.enum(MAID_TYPE_OPTIONS.map((o) => o.value) as [string, ...string[]], {
  message: "Select a maid type.",
});
const maritalStatusSchema = z.enum(MARITAL_STATUS_OPTIONS.map((o) => o.value) as [string, ...string[]], {
  message: "Select a marital status, or leave it as Not Provided.",
});
const expertiseSchema = z.enum(EXPERTISE_OPTIONS.map((o) => o.value) as [ExpertiseOptionValue, ...ExpertiseOptionValue[]]);
const profileStatusSchema = z.enum(PROFILE_STATUS_OPTIONS, { message: "Select a profile status." });
const availabilityStatusSchema = z.enum(AVAILABILITY_STATUS_OPTIONS, { message: "Select an availability status." });

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

// Years of experience may be a part-year (2.5), unlike height/weight which
// stay whole numbers — hence its own schema rather than optionalPositiveInt.
// 0 is allowed (a brand-new maid); the upper bound is just a sanity ceiling.
const yearsExperienceSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? Number(v) : undefined))
  .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0 && v <= 60), {
    message: "Enter years of experience as a number, e.g. 2 or 2.5.",
  });

// End of an employment period is free text, not a year number: staff need to
// be able to enter "Current" / "Now" for a role that has not ended, as well as
// a plain year ("2025"). Blank means not provided. Deliberately not validated
// against a year range or keyword list — it is internal-use detail.
const endYearSchema = z
  .string()
  .trim()
  .max(30, "End year is too long.")
  .optional()
  .transform((v) => (v ? v : undefined));

const employmentHistoryRowSchema = z
  .object({
    country: z.string().trim().max(100).optional().default(""),
    startYear: yearSchema,
    endYear: endYearSchema,
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
  yearsExperience: yearsExperienceSchema,
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
// Turning a failed parse into per-field messages for the form
// ------------------------------------------------------------

const FIELD_LABELS: Record<string, string> = {
  profileCode: "Profile Code",
  name: "Name",
  dateOfBirth: "Date of Birth",
  maidType: "Maid Type",
  maritalStatus: "Marital Status",
  languages: "Languages",
  heightCm: "Height (cm)",
  weightKg: "Weight (kg)",
  yearsExperience: "Years of Experience",
  expertise: "Expertise",
  profileStatus: "Profile Status",
  availabilityStatus: "Availability Status",
};

const EMPLOYMENT_FIELD_LABELS: Record<string, string> = {
  country: "Country",
  startYear: "Start Year",
  endYear: "End Year",
  duties: "Duties",
};

/** The submitted form field name for a Zod issue path (schema key -> the input's `name`). */
function fieldNameForPath(path: PropertyKey[]): string {
  if (path[0] === "employmentHistory" && typeof path[1] === "number" && typeof path[2] === "string") {
    return `employmentHistory.${path[1]}.${path[2]}`;
  }
  const key = String(path[0] ?? "");
  return key === "languagesRaw" ? "languages" : key;
}

function labelForField(field: string): string {
  const row = /^employmentHistory\.(\d+)\.(\w+)$/.exec(field);
  if (row) return `Employment History, row ${Number(row[1]) + 1} — ${EMPLOYMENT_FIELD_LABELS[row[2]] ?? row[2]}`;
  return FIELD_LABELS[field] ?? field;
}

/** First problem per field, keyed by the input's name, plus the same list in form order for a summary. */
export function collectMaidFormErrors(error: z.ZodError): {
  fieldErrors: Record<string, string>;
  errorList: { label: string; message: string }[];
} {
  const fieldErrors: Record<string, string> = {};
  const errorList: { label: string; message: string }[] = [];
  for (const issue of error.issues) {
    const field = fieldNameForPath(issue.path);
    if (fieldErrors[field]) continue;
    fieldErrors[field] = issue.message;
    errorList.push({ label: labelForField(field), message: issue.message });
  }
  return { fieldErrors, errorList };
}

/** Everything typed into the form, as plain strings, so a failed save can re-fill it. Files are skipped. */
export function collectMaidFormValues(formData: FormData): Record<string, string | string[]> {
  const values: Record<string, string | string[]> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION")) continue; // Next.js's own hidden form fields
    const all = formData.getAll(key).filter((v): v is string => typeof v === "string");
    if (all.length === 0) continue; // a file input
    values[key] = key === "expertise" ? all : all[0];
  }
  return values;
}

// ------------------------------------------------------------
// File upload validation — Phase 6 (Sections D/E)
// ------------------------------------------------------------

export const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
// Per-file caps equal the combined cap (lib/upload-limits.ts): the photo and PDF share one
// request, so no single file can usefully be larger than the whole budget.
export const PHOTO_MAX_BYTES = UPLOAD_TOTAL_MAX_BYTES;
export const PDF_MIME_TYPE = "application/pdf";
export const PDF_MAX_BYTES = UPLOAD_TOTAL_MAX_BYTES; // the storage bucket itself would allow more; the request-size ceiling is what binds

export type FileValidationResult = { ok: true } | { ok: false; message: string };

/** Server-side MIME/size validation — never trust the browser's `accept=` alone. */
export function validatePhotoFile(file: File): FileValidationResult {
  if (!(PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, message: "Photo must be a JPEG, PNG, or WEBP image." };
  }
  if (file.size > PHOTO_MAX_BYTES) {
    return { ok: false, message: `Photo is too large (max ${UPLOAD_TOTAL_MAX_LABEL}).` };
  }
  return { ok: true };
}

export function validatePdfFile(file: File): FileValidationResult {
  if (file.type !== PDF_MIME_TYPE) {
    return { ok: false, message: "Biodata document must be a PDF file." };
  }
  if (file.size > PDF_MAX_BYTES) {
    return { ok: false, message: `PDF is too large (max ${UPLOAD_TOTAL_MAX_LABEL}).` };
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
