"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { parseAdminMaidForm, collectMaidFormErrors, collectMaidFormValues } from "@/lib/validation/admin-maid";
import type { MaidFormState } from "@/lib/validation/maid-form-state";
import { createMaid, updateMaid, updateMaidStatus } from "@/lib/services/admin/maids";

/**
 * Server Actions backing the admin Add/Edit Maid forms — Phase 6.
 *
 * Create/Edit are used with useActionState (components/admin/MaidForm.tsx): a failed save
 * returns a MaidFormState — field-level messages plus everything the admin typed — so the
 * form says exactly what is wrong and loses nothing. A successful save redirects with a
 * short status in the query string, which the page turns into a banner. No admin data —
 * form values, file names, validation detail — is ever put in a URL.
 */

function revalidateMaidViews(maidId?: string) {
  revalidatePath("/admin/maids");
  revalidatePath("/admin");
  revalidatePath("/dashboard/maids");
  if (maidId) {
    revalidatePath(`/admin/maids/${maidId}/edit`);
    revalidatePath(`/dashboard/maids/${maidId}`);
  }
}

function successQuery(result: { publishedAsRequested: boolean; publishGaps: string[]; fileWarnings: string[] }): string {
  const params = new URLSearchParams();
  params.set("saved", "1");
  if (!result.publishedAsRequested) {
    params.set("publishGaps", result.publishGaps.join(", "));
  }
  if (result.fileWarnings.length > 0) {
    params.set("fileWarnings", result.fileWarnings.join(" | "));
  }
  return params.toString();
}

/** Re-fillable failure state handed back to the form (see components/admin/MaidForm.tsx). */
function failure(
  prev: MaidFormState,
  formData: FormData,
  problems: { fieldErrors?: Record<string, string>; errorList?: { label: string; message: string }[]; message?: string }
): MaidFormState {
  const photo = formData.get("photo");
  const pdf = formData.get("biodataPdf");
  return {
    message: problems.message,
    fieldErrors: problems.fieldErrors ?? {},
    errorList: problems.errorList ?? [],
    values: collectMaidFormValues(formData),
    filesDropped: (photo instanceof File && photo.size > 0) || (pdf instanceof File && pdf.size > 0),
    attempt: (prev?.attempt ?? 0) + 1,
  };
}

const DUPLICATE_CODE_MESSAGE = "A helper with this Profile Code already exists. Use a different code.";

export async function createMaidAction(prev: MaidFormState, formData: FormData): Promise<MaidFormState> {
  const parsed = parseAdminMaidForm(formData);
  if (!parsed.success) {
    return failure(prev, formData, collectMaidFormErrors(parsed.error));
  }

  const photo = formData.get("photo");
  const pdf = formData.get("biodataPdf");

  const result = await createMaid(parsed.data, {
    photo: photo instanceof File && photo.size > 0 ? photo : null,
    pdf: pdf instanceof File && pdf.size > 0 ? pdf : null,
  });

  if (!result.ok) {
    return failure(prev, formData, {
      fieldErrors: { profileCode: DUPLICATE_CODE_MESSAGE },
      errorList: [{ label: "Profile Code", message: DUPLICATE_CODE_MESSAGE }],
    });
  }

  revalidateMaidViews(result.id);
  redirect(`/admin/maids/${result.id}/edit?${successQuery(result)}`);
}

export async function updateMaidAction(maidId: string, prev: MaidFormState, formData: FormData): Promise<MaidFormState> {
  const parsed = parseAdminMaidForm(formData);
  if (!parsed.success) {
    return failure(prev, formData, collectMaidFormErrors(parsed.error));
  }

  const photo = formData.get("photo");
  const pdf = formData.get("biodataPdf");

  const result = await updateMaid(maidId, parsed.data, {
    photo: photo instanceof File && photo.size > 0 ? photo : null,
    pdf: pdf instanceof File && pdf.size > 0 ? pdf : null,
  });

  if (!result.ok) {
    if (result.reason === "NOT_FOUND") {
      return failure(prev, formData, { message: "This profile could not be found. It may have been removed." });
    }
    return failure(prev, formData, {
      fieldErrors: { profileCode: DUPLICATE_CODE_MESSAGE },
      errorList: [{ label: "Profile Code", message: DUPLICATE_CODE_MESSAGE }],
    });
  }

  revalidateMaidViews(result.id);
  redirect(`/admin/maids/${result.id}/edit?${successQuery(result)}`);
}

/**
 * Not currently wired to a UI control (Step 6 prefers status changes to
 * happen from the full Edit form) — kept available as its own action
 * for a possible future inline control, per Step 15.
 */
export async function updateMaidStatusAction(
  maidId: string,
  next: { profileStatus: "DRAFT" | "ACTIVE" | "INACTIVE"; availabilityStatus: "AVAILABLE" | "RESERVED" | "PLACED" | "UNAVAILABLE" }
): Promise<void> {
  await updateMaidStatus(maidId, next);
  revalidateMaidViews(maidId);
}
