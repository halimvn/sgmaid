"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { updateProfileSchema, changePasswordSchema } from "@/lib/validation/account";
import { updateEmployerProfile, changeEmployerPassword } from "@/lib/services/account";

/**
 * Server Actions backing the employer "My Account" forms — Phase 7.
 *
 * `useActionState`-compatible (state, formData) => state signatures —
 * same pattern as app/reset-password/actions.ts and
 * app/setup-password/actions.ts. Deliberately NOT the admin form's
 * redirect-based convention: a redirect always drops whatever the
 * employer typed, and Step 4's "do not reset the form" requirement
 * needs the same mounted <form> to stay in place on a validation error
 * (an uncontrolled input's value survives a useActionState re-render;
 * it does not survive a redirect). A "use server" module may only
 * export async functions, so each form's initial state constant lives
 * in its own component file, not here.
 */

export type UpdateProfileState = {
  error: string | null;
  fieldErrors: { fullName?: string; mobileNumber?: string };
  success: boolean;
};

export async function updateProfileAction(_prevState: UpdateProfileState, formData: FormData): Promise<UpdateProfileState> {
  const parsed = updateProfileSchema.safeParse({
    fullName: formData.get("fullName")?.toString() ?? "",
    mobileNumber: formData.get("mobileNumber")?.toString() ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: UpdateProfileState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "fullName" || key === "mobileNumber") fieldErrors[key] = issue.message;
    }
    return { error: "Please check the highlighted fields.", fieldErrors, success: false };
  }

  await updateEmployerProfile({ fullName: parsed.data.fullName, mobileNumber: parsed.data.mobileNumber ?? null });
  revalidatePath("/dashboard/account");

  return { error: null, fieldErrors: {}, success: true };
}

export type ChangePasswordState = {
  error: string | null;
  fieldErrors: { currentPassword?: string; newPassword?: string; confirmNewPassword?: string };
};

export async function changePasswordAction(_prevState: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword")?.toString() ?? "",
    newPassword: formData.get("newPassword")?.toString() ?? "",
    confirmNewPassword: formData.get("confirmNewPassword")?.toString() ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: ChangePasswordState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "currentPassword" || key === "newPassword" || key === "confirmNewPassword") fieldErrors[key] = issue.message;
    }
    return { error: "Please check the highlighted fields.", fieldErrors };
  }

  const result = await changeEmployerPassword(parsed.data.currentPassword, parsed.data.newPassword);

  if (!result.ok) {
    // Generic per Step "wrong current password" — never a different
    // message that would hint at anything else being wrong, and the
    // other two fields are left exactly as typed (no redirect happened).
    return {
      error: "Current password is incorrect.",
      fieldErrors: { currentPassword: "Current password is incorrect." },
    };
  }

  // Session revocation — see lib/services/account.ts changeEmployerPassword()
  // and lib/auth/password-reset.ts's identical precedent: sessionVersion
  // was just bumped, so this session's own JWT is now stale too. Sign out
  // immediately (server-side signOut(), not the client next-auth/react
  // one — this runs inside a Server Action) and reuse the exact same
  // "password changed, sign in again" banner the token-based reset flow
  // already shows, rather than inventing a second one.
  await signOut({ redirectTo: "/login?reset=success" });

  // signOut() above always redirects (throws internally) — this line is
  // unreachable, kept only so the function's return type is honest.
  redirect("/login?reset=success");
}
