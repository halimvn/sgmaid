"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { signOut } from "@/auth";
import {
  parseCreateAdminUserForm,
  parseUpdateAdminStatusForm,
  parseResetAdminPasswordForm,
} from "@/lib/validation/admin-user";
import { createAdminUser, updateAdminUserStatus, resetAdminUserPassword } from "@/lib/services/admin/admins";

/**
 * Server Actions for the admin "Staff accounts" screens. createAdminUserAction is
 * useActionState-shaped (returns state, never redirects) for the same reason as
 * lib/actions/admin/clients.ts's createClientAction: the one-time success screen shows
 * the just-set password from this request's own in-memory state, never a URL or cookie.
 * The others follow the admin redirect-with-a-short-status convention — no field of
 * theirs is secret.
 */

export type CreateAdminUserState = {
  error: string | null;
  fieldErrors: Record<string, string>;
  // Preserved on a validation error — never includes either password field.
  values: { fullName: string; username: string; email: string };
  success: { fullName: string; username: string; password: string } | null;
};

export async function createAdminUserAction(
  _prev: CreateAdminUserState,
  formData: FormData
): Promise<CreateAdminUserState> {
  const rawValues = {
    fullName: formData.get("fullName")?.toString() ?? "",
    username: formData.get("username")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
  };

  const parsed = parseCreateAdminUserForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !(key in fieldErrors)) fieldErrors[key] = issue.message;
    }
    return { error: "Please check the highlighted fields.", fieldErrors, values: rawValues, success: null };
  }

  const password = parsed.data.password; // lives only in this request; never persisted in recoverable form
  const result = await createAdminUser(parsed.data);
  if (!result.ok) {
    const field = result.reason === "DUPLICATE_USERNAME" ? "username" : "email";
    const message = result.reason === "DUPLICATE_USERNAME" ? "This username is already in use." : "This email is already in use.";
    return { error: message, fieldErrors: { [field]: message }, values: rawValues, success: null };
  }

  revalidatePath("/admin/admins");
  return {
    error: null,
    fieldErrors: {},
    values: { fullName: "", username: "", email: "" },
    success: { fullName: parsed.data.fullName, username: result.username, password },
  };
}

export async function updateAdminUserStatusAction(adminId: string, formData: FormData): Promise<void> {
  const parsed = parseUpdateAdminStatusForm(formData);
  if (!parsed.success) redirect(`/admin/admins/${adminId}/edit?error=VALIDATION_FAILED`);

  const result = await updateAdminUserStatus(adminId, parsed.data.status);
  if (!result.ok) redirect(`/admin/admins/${adminId}/edit?error=${result.reason}`);

  revalidatePath("/admin/admins");
  revalidatePath(`/admin/admins/${adminId}/edit`);
  redirect(`/admin/admins/${adminId}/edit?saved=1`);
}

export async function resetAdminUserPasswordAction(adminId: string, formData: FormData): Promise<void> {
  const parsed = parseResetAdminPasswordForm(formData);
  if (!parsed.success) redirect(`/admin/admins/${adminId}/edit?error=VALIDATION_FAILED`);

  const result = await resetAdminUserPassword(adminId, parsed.data.newPassword);
  if (!result.ok) redirect(`/admin/admins/${adminId}/edit?error=${result.reason}`);

  revalidatePath("/admin/admins");
  if (result.signedOut) {
    // The caller changed their own password: their session was just revoked, so sign out
    // cleanly (clears the cookie) and send them to log in with the new one.
    await signOut({ redirectTo: "/login?reset=success" });
  }
  redirect(`/admin/admins/${adminId}/edit?passwordReset=1`);
}
