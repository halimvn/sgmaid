"use server";

import { redirect } from "next/navigation";
import { completeAccountSetup } from "@/lib/auth/account-setup";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/constants";

export type SetupPasswordState = { error: string | null };

/**
 * Server Action backing /setup-password. Never logs the token or
 * password. Every failure path returns the same shape of generic,
 * non-specific message — no hint about which validation step failed
 * beyond the broad category (password rules vs. link problem).
 */
export async function submitAccountSetup(
  _prevState: SetupPasswordState,
  formData: FormData
): Promise<SetupPasswordState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) {
    return { error: "This link is missing required information. Please use the link from your invitation." };
  }

  const result = await completeAccountSetup(token, password, confirmPassword);

  if (!result.ok) {
    switch (result.reason) {
      case "PASSWORDS_DONT_MATCH":
        return { error: "Those passwords don't match." };
      case "WEAK_PASSWORD":
        return { error: `Please choose a password with at least ${PASSWORD_MIN_LENGTH} characters.` };
      case "INVALID_OR_EXPIRED":
        return {
          error: "This link is invalid, expired, or has already been used. Please contact SG Maid for a new invitation.",
        };
    }
  }

  redirect("/login?setup=success");
}
