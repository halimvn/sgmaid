import "server-only";
import { z } from "zod";
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH } from "@/lib/auth/constants";
import { normalizeUsername } from "@/lib/auth/username";

/**
 * Shared validation for a client/employer User id passed into any
 * admin operation — same "reject anything that couldn't possibly be a
 * cuid before it ever reaches Prisma" rule as lib/validation/maid-id.ts
 * (a separate copy, not a shared import, since a maid id and a User id
 * are different identifier spaces that just happen to use the same
 * cuid() shape). Fails safe (returns null) rather than throwing.
 */
const clientIdSchema = z.string().trim().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/);
export function parseClientId(value: unknown): string | null {
  const result = clientIdSchema.safeParse(value);
  return result.success ? result.data : null;
}

/**
 * Validation for the admin "Create/Edit Client Access" forms — Phase 8.
 *
 * Mirrors lib/validation/admin-maid.ts's conventions (plain zod schemas,
 * a parse*Form() helper that never throws — safeParse only, per the
 * project's "do not trust browser input" rule).
 */

export const CLIENT_PAGE_SIZE = 20;

export const clientNameSchema = z.string().trim().min(1, "Client name is required.").max(200, "Client name is too long.");

export const usernameInputSchema = z
  .string()
  .trim()
  .min(1, "Username is required.")
  .transform((v) => normalizeUsername(v))
  .refine((v): v is string => v !== null, {
    message: `Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters — lowercase letters, numbers, and . _ - only.`,
  });

// Deliberately loose: digits, spaces, +, -, parentheses, dots — same
// pattern as lib/validation/account.ts's mobileNumberSchema (kept as a
// separate copy rather than importing that employer-self-service file
// from the admin surface, to keep the two forms' validation independently
// editable).
const MOBILE_NUMBER_PATTERN = /^[0-9+()\-.\s]*$/;
export const clientMobileSchema = z
  .string()
  .trim()
  .max(30, "Mobile number is too long.")
  .regex(MOBILE_NUMBER_PATTERN, "Please enter a valid mobile number.")
  .transform((v) => (v.length > 0 ? v : undefined));

// Optional contact info only — never the login identifier (see
// lib/auth/credentials.ts). Empty input is valid (undefined); a non-empty
// value must be a real email shape.
export const clientEmailSchema = z.preprocess(
  (v) => (typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined),
  z.email("Please enter a valid email address.").max(255, "Email is too long.").optional()
);

export const clientPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Please choose a password with at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, "That password is too long.");

export const CLIENT_STATUS_OPTIONS = ["ACTIVE", "SUSPENDED", "INACTIVE"] as const;
export type ClientStatusOption = (typeof CLIENT_STATUS_OPTIONS)[number];

export const createClientFormSchema = z
  .object({
    fullName: clientNameSchema,
    username: usernameInputSchema,
    password: clientPasswordSchema,
    confirmPassword: z.string(),
    mobileNumber: clientMobileSchema,
    email: clientEmailSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Those passwords don't match.",
    path: ["confirmPassword"],
  });
export type CreateClientFormInput = z.input<typeof createClientFormSchema>;
export type CreateClientFormData = z.output<typeof createClientFormSchema>;

export function parseCreateClientForm(formData: FormData) {
  return createClientFormSchema.safeParse({
    fullName: formData.get("fullName")?.toString() ?? "",
    username: formData.get("username")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
    confirmPassword: formData.get("confirmPassword")?.toString() ?? "",
    mobileNumber: formData.get("mobileNumber")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
  });
}

export const editClientDetailsSchema = z.object({
  fullName: clientNameSchema,
  mobileNumber: clientMobileSchema,
  email: clientEmailSchema,
  status: z.enum(CLIENT_STATUS_OPTIONS),
});
export type EditClientDetailsData = z.output<typeof editClientDetailsSchema>;

export function parseEditClientDetailsForm(formData: FormData) {
  return editClientDetailsSchema.safeParse({
    fullName: formData.get("fullName")?.toString() ?? "",
    mobileNumber: formData.get("mobileNumber")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    status: formData.get("status")?.toString() ?? "ACTIVE",
  });
}

export const resetClientPasswordSchema = z
  .object({
    newPassword: clientPasswordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Those passwords don't match.",
    path: ["confirmNewPassword"],
  });
export type ResetClientPasswordData = z.output<typeof resetClientPasswordSchema>;

export function parseResetClientPasswordForm(formData: FormData) {
  return resetClientPasswordSchema.safeParse({
    newPassword: formData.get("newPassword")?.toString() ?? "",
    confirmNewPassword: formData.get("confirmNewPassword")?.toString() ?? "",
  });
}
