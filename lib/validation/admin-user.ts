import "server-only";
import { z } from "zod";
import {
  clientNameSchema,
  usernameInputSchema,
  clientEmailSchema,
  clientPasswordSchema,
  CLIENT_STATUS_OPTIONS,
  parseClientId,
  resetClientPasswordSchema,
} from "@/lib/validation/client";

/**
 * Validation for the admin "Staff accounts" forms — creating other ADMIN users
 * and managing them. Deliberately reuses the client form's field rules (same
 * username shape, same password length policy, same optional-contact-email
 * rule) so the two screens can never drift into different policies.
 */

export const ADMIN_USERS_PAGE_SIZE = 20;

/** Same cuid-shape guard as a client id — an admin is also just a User row. */
export const parseAdminUserId = parseClientId;

export const ADMIN_STATUS_OPTIONS = CLIENT_STATUS_OPTIONS; // ACTIVE | SUSPENDED | INACTIVE

export const createAdminUserFormSchema = z
  .object({
    fullName: clientNameSchema,
    username: usernameInputSchema,
    password: clientPasswordSchema,
    confirmPassword: z.string(),
    email: clientEmailSchema,
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Those passwords don't match.",
    path: ["confirmPassword"],
  });
export type CreateAdminUserFormData = z.output<typeof createAdminUserFormSchema>;

export function parseCreateAdminUserForm(formData: FormData) {
  return createAdminUserFormSchema.safeParse({
    fullName: formData.get("fullName")?.toString() ?? "",
    username: formData.get("username")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
    confirmPassword: formData.get("confirmPassword")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
  });
}

export const updateAdminStatusSchema = z.object({ status: z.enum(ADMIN_STATUS_OPTIONS) });

export function parseUpdateAdminStatusForm(formData: FormData) {
  return updateAdminStatusSchema.safeParse({ status: formData.get("status")?.toString() ?? "" });
}

export function parseResetAdminPasswordForm(formData: FormData) {
  return resetClientPasswordSchema.safeParse({
    newPassword: formData.get("newPassword")?.toString() ?? "",
    confirmNewPassword: formData.get("confirmNewPassword")?.toString() ?? "",
  });
}
