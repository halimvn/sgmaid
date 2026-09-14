"use server";

import { revalidatePath } from "next/cache";
import { addToShortlist, removeFromShortlist } from "@/lib/services/shortlist";

/**
 * Server Actions backing every "Shortlist" / "Remove from Shortlist"
 * button (MaidCard, the maid detail page, and the shortlist page
 * itself) — Phase 4.
 *
 * Bound with the target maid id via `.bind(null, maid.id)` in the
 * calling component, so the form itself only ever submits its own
 * built-in CSRF-protected Server Action request — no employerId is
 * accepted from the client anywhere in this file; every write is scoped
 * to whichever employer's session is doing the request (see
 * lib/services/shortlist.ts, which is where that's actually enforced).
 *
 * Errors are deliberately swallowed here rather than surfaced as a raw
 * exception: an invalid id or a maid that's no longer visible just
 * results in no change (the button reverts to its real state on
 * revalidation) instead of a scary error page. Unexpected failures are
 * logged server-side, never shown to the employer with stack traces or
 * database details.
 */

const REVALIDATE_PATHS = ["/dashboard/maids", "/dashboard/shortlist", "/dashboard"] as const;

function revalidateShortlistViews(maidId: string) {
  for (const path of REVALIDATE_PATHS) revalidatePath(path);
  revalidatePath(`/dashboard/maids/${maidId}`);
}

export async function addMaidToShortlist(maidId: string): Promise<void> {
  try {
    await addToShortlist(maidId);
  } catch (err) {
    console.error("addMaidToShortlist failed:", err);
  }
  revalidateShortlistViews(maidId);
}

export async function removeMaidFromShortlist(maidId: string): Promise<void> {
  try {
    await removeFromShortlist(maidId);
  } catch (err) {
    console.error("removeMaidFromShortlist failed:", err);
  }
  revalidateShortlistViews(maidId);
}
