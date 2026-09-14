"use server";

import { redirect } from "next/navigation";
import { completePasswordReset } from "@/lib/auth/password-reset";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/constants";

export type ResetPasswordState = { error: string | null };

/** Server Action backing /reset-password. Never logs the token or password. */
export async function submitPasswordReset(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) {
    return { error: "This link is missing required information. Please use the link you were sent." };
  }

  const result = await completePasswordReset(token, password, confirmPassword);

  if (!result.ok) {
    switch (result.reason) {
      case "PASSWORDS_DONT_MATCH":
        return { error: "Those passwords don't match." };
      case "WEAK_PASSWORD":
        return { error: `Please choose a password with at least ${PASSWORD_MIN_LENGTH} characters.` };
      case "INVALID_OR_EXPIRED":
        return { error: "This link is invalid, expired, or has already been used. Please request a new one." };
    }
  }

  redirect("/login?reset=success");
}
