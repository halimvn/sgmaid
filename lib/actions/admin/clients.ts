"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  parseCreateClientForm,
  parseEditClientDetailsForm,
  parseResetClientPasswordForm,
} from "@/lib/validation/client";
import {
  createClient,
  updateClientDetails,
  extendClientAccess,
  resetClientPassword,
} from "@/lib/services/admin/clients";

/**
 * Server Actions backing the admin Client Management forms — Phase 8.
 *
 * createClientAction is deliberately `useActionState`-shaped (returns
 * state, never redirects) — see components/admin/CreateClientForm.tsx for
 * why: it's the only safe way to show the just-set plaintext password
 * back to staff exactly once, without ever putting it in a URL, a
 * cookie, or anywhere retrievable after this request. Every other action
 * here follows the project's existing admin "redirect with a short,
 * generic status in the query string" convention (see
 * lib/actions/admin/maids.ts) — none of their fields are secret.
 */

function revalidateClientViews(id?: string) {
  revalidatePath("/admin/clients");
  if (id) revalidatePath(`/admin/clients/${id}/edit`);
}

export type CreateClientState = {
  error: string | null;
  fieldErrors: Record<string, string>;
  // Preserved on a validation error so staff don't have to retype
  // everything except the password (see the Phase 8 spec's Step 29) —
  // never includes password/confirmPassword.
  values: { fullName: string; username: string; mobileNumber: string; email: string };
  success:
    | { fullName: string; username: string; password: string; accessExpiresAt: string }
    | null;
};

export async function createClientAction(prevState: CreateClientState, formData: FormData): Promise<CreateClientState> {
  const rawValues = {
    fullName: formData.get("fullName")?.toString() ?? "",
    username: formData.get("username")?.toString() ?? "",
    mobileNumber: formData.get("mobileNumber")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
  };

  const parsed = parseCreateClientForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !(key in fieldErrors)) fieldErrors[key] = issue.message;
    }
    return { error: "Please check the highlighted fields.", fieldErrors, values: rawValues, success: null };
  }

  // The plaintext password lives only in this request's FormData/local
  // variable — never written back to the DB in any recoverable form, and
  // never round-tripped through anything but this one function's return
  // value (which the calling Client Component holds in memory only).
  const password = parsed.data.password;

  const result = await createClient(parsed.data);
  if (!result.ok) {
    return {
      error: "This username is already in use.",
      fieldErrors: { username: "This username is already in use." },
      values: rawValues,
      success: null,
    };
  }

  revalidateClientViews(result.id);

  return {
    error: null,
    fieldErrors: {},
    values: { fullName: "", username: "", mobileNumber: "", email: "" },
    success: {
      fullName: parsed.data.fullName,
      username: result.username,
      password,
      accessExpiresAt: result.accessExpiresAt,
    },
  };
}

export async function updateClientDetailsAction(clientId: string, formData: FormData): Promise<void> {
  const parsed = parseEditClientDetailsForm(formData);
  if (!parsed.success) {
    redirect(`/admin/clients/${clientId}/edit?error=VALIDATION_FAILED`);
  }

  const result = await updateClientDetails(clientId, parsed.data);
  if (!result.ok) {
    redirect(`/admin/clients/${clientId}/edit?error=${result.reason}`);
  }

  revalidateClientViews(clientId);
  redirect(`/admin/clients/${clientId}/edit?saved=1`);
}

export async function extendClientAccessAction(clientId: string): Promise<void> {
  const result = await extendClientAccess(clientId);
  if (!result.ok) {
    redirect(`/admin/clients/${clientId}/edit?error=${result.reason}`);
  }

  revalidateClientViews(clientId);
  redirect(`/admin/clients/${clientId}/edit?extended=1`);
}

export async function resetClientPasswordAction(clientId: string, formData: FormData): Promise<void> {
  const parsed = parseResetClientPasswordForm(formData);
  if (!parsed.success) {
    redirect(`/admin/clients/${clientId}/edit?error=VALIDATION_FAILED`);
  }

  const result = await resetClientPassword(clientId, parsed.data.newPassword);
  if (!result.ok) {
    redirect(`/admin/clients/${clientId}/edit?error=${result.reason}`);
  }

  revalidateClientViews(clientId);
  redirect(`/admin/clients/${clientId}/edit?passwordReset=1`);
}
