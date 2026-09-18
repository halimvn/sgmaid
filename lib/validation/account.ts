import "server-only";
import { z } from "zod";
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from "@/lib/auth/constants";

/**
 * Validation for the employer "My Account" forms — Phase 7.
 *
 * Password rules are deliberately imported from lib/auth/constants.ts
 * rather than redefined here — the exact same PASSWORD_MIN_LENGTH/
 * PASSWORD_MAX_LENGTH already enforced by setup-password and
 * reset-password, so this flow can never drift into a third, slightly
 * different password policy.
 */

export const fullNameSchema = z.string().trim().min(1, "Full name is required.").max(200, "Full name is too long.");

// Deliberately loose: digits, spaces, +, -, parentheses, dots — enough to
// accept a Singapore local number ("9123 4567") or an international one
// ("+65 9123 4567", "+1 415-555-0132") without pretending to enforce
// real-world phone-number correctness (no per-country length/carrier
// rules). Empty is allowed — mobile number is optional, matching the
// nullable `mobileNumber` column.
const MOBILE_NUMBER_PATTERN = /^[0-9+()\-.\s]*$/;
export const mobileNumberSchema = z
  .string()
  .trim()
  .max(30, "Mobile number is too long.")
  .regex(MOBILE_NUMBER_PATTERN, "Please enter a valid mobile number.")
  .transform((v) => (v.length > 0 ? v : undefined));

export const updateProfileSchema = z.object({
  fullName: fullNameSchema,
  mobileNumber: mobileNumberSchema,
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Please choose a password with at least ${PASSWORD_MIN_LENGTH} characters.`)
      .max(PASSWORD_MAX_LENGTH, "That password is too long."),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Those passwords don't match.",
    path: ["confirmNewPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
