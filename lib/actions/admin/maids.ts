"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { parseAdminMaidForm } from "@/lib/validation/admin-maid";
import { createMaid, updateMaid, updateMaidStatus } from "@/lib/services/admin/maids";

/**
 * Server Actions backing the admin Add/Edit Maid forms — Phase 6.
 *
 * Deliberately plain `action={fn}` server functions (not
 * useActionState/a Client Component) — the whole admin form is a normal
 * progressively-enhanced <form>, matching this project's existing
 * "server-rendered form + redirect" convention (e.g. the employer filter
 * sidebar). Validation errors and success both redirect back with a
 * short, generic status in the query string; the page reads it and
 * shows a banner. No admin data — form values, file names, validation
 * detail — is ever put in a URL.
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

export async function createMaidAction(formData: FormData): Promise<void> {
  const parsed = parseAdminMaidForm(formData);
  if (!parsed.success) {
    redirect(`/admin/maids/new?error=VALIDATION_FAILED`);
  }

  const photo = formData.get("photo");
  const pdf = formData.get("biodataPdf");

  const result = await createMaid(parsed.data, {
    photo: photo instanceof File && photo.size > 0 ? photo : null,
    pdf: pdf instanceof File && pdf.size > 0 ? pdf : null,
  });

  if (!result.ok) {
    redirect(`/admin/maids/new?error=${result.reason}`);
  }

  revalidateMaidViews(result.id);
  redirect(`/admin/maids/${result.id}/edit?${successQuery(result)}`);
}

export async function updateMaidAction(maidId: string, formData: FormData): Promise<void> {
  const parsed = parseAdminMaidForm(formData);
  if (!parsed.success) {
    redirect(`/admin/maids/${maidId}/edit?error=VALIDATION_FAILED`);
  }

  const photo = formData.get("photo");
  const pdf = formData.get("biodataPdf");

  const result = await updateMaid(maidId, parsed.data, {
    photo: photo instanceof File && photo.size > 0 ? photo : null,
    pdf: pdf instanceof File && pdf.size > 0 ? pdf : null,
  });

  if (!result.ok) {
    redirect(`/admin/maids/${maidId}/edit?error=${result.reason}`);
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
