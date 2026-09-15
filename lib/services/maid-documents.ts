import "server-only";
import { prisma } from "@/lib/db";
import { requireEmployer } from "@/lib/auth/authorize";
import { employerVisibleMaidWhere } from "@/lib/maid-visibility";
import { parseMaidId } from "@/lib/validation/maid-id";
import { getSupabaseStorageAdmin, getMaidDocumentBucket } from "@/lib/storage/supabase-admin";

/**
 * Secure biodata PDF access — Phase 4.6.
 *
 * Authorization order is deliberate and matters: requireEmployer() runs
 * first, then the exact same employerVisibleMaidWhere() policy used by
 * lib/services/maids.ts, and ONLY THEN is a document looked up and a
 * signed URL generated. A signed URL is never created before
 * authorization succeeds — there is no code path here that can produce
 * one for a DRAFT/INACTIVE/PLACED/UNAVAILABLE maid, regardless of what
 * document id or maid id is supplied.
 *
 * The signed URL itself is short-lived (see SIGNED_URL_TTL_SECONDS) and
 * generated fresh on every request — never cached, never persisted to
 * PostgreSQL or anywhere else. Losing/forwarding a link only grants
 * temporary access, not standing access to the file.
 */

const SIGNED_URL_TTL_SECONDS = 120; // 2 minutes — long enough to load, short enough to not be a standing link

export type DocumentAccessResult =
  | { ok: true; url: string; expiresInSeconds: number }
  | { ok: false; reason: "INVALID_ID" | "NOT_VISIBLE" | "NO_DOCUMENT" };

export type BiodataAccessResult = DocumentAccessResult;

/**
 * Shared implementation behind getBiodataSignedUrl()/getMaidPhotoSignedUrl()
 * — same authorization order for every document type: requireEmployer(),
 * then employerVisibleMaidWhere(), then (and only then) a document lookup
 * and a freshly-generated signed URL.
 */
async function getSignedUrlForDocument(
  rawMaidId: string,
  type: "BIODATA_PDF" | "PROFILE_PHOTO"
): Promise<DocumentAccessResult> {
  await requireEmployer();

  const maidId = parseMaidId(rawMaidId);
  if (!maidId) return { ok: false, reason: "INVALID_ID" };

  // Same visibility policy as the profile itself — a maid that isn't
  // employer-visible has no accessible document either, full stop.
  const maid = await prisma.maidProfile.findFirst({
    where: { id: maidId, ...employerVisibleMaidWhere() },
    select: { id: true },
  });
  if (!maid) return { ok: false, reason: "NOT_VISIBLE" };

  const document = await prisma.maidDocument.findUnique({
    where: { maidId_type: { maidId: maid.id, type } },
    select: { storagePath: true },
  });
  if (!document) return { ok: false, reason: "NO_DOCUMENT" };

  const supabase = getSupabaseStorageAdmin();
  const { data, error } = await supabase.storage
    .from(getMaidDocumentBucket())
    .createSignedUrl(document.storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.error(`Failed to create signed URL for ${type} document:`, error);
    return { ok: false, reason: "NO_DOCUMENT" };
  }

  return { ok: true, url: data.signedUrl, expiresInSeconds: SIGNED_URL_TTL_SECONDS };
}

async function hasDocument(rawMaidId: string, type: "BIODATA_PDF" | "PROFILE_PHOTO"): Promise<boolean> {
  await requireEmployer();

  const maidId = parseMaidId(rawMaidId);
  if (!maidId) return false;

  const maid = await prisma.maidProfile.findFirst({
    where: { id: maidId, ...employerVisibleMaidWhere() },
    select: { id: true },
  });
  if (!maid) return false;

  const document = await prisma.maidDocument.findUnique({
    where: { maidId_type: { maidId: maid.id, type } },
    select: { id: true },
  });
  return document !== null;
}

export function getBiodataSignedUrl(rawMaidId: string): Promise<BiodataAccessResult> {
  return getSignedUrlForDocument(rawMaidId, "BIODATA_PDF");
}

/** Whether the given (employer-visible) maid has a biodata PDF at all — used to decide whether to render the button. */
export function hasBiodataDocument(rawMaidId: string): Promise<boolean> {
  return hasDocument(rawMaidId, "BIODATA_PDF");
}

/**
 * Secure candidate photo access — Phase 4.6.2. Same private-storage,
 * signed-URL-on-demand pattern as the biodata PDF. Only ever populated for
 * a maid whose photo was explicitly supplied and approved (see
 * scripts/upload-maid-photo.ts) — never auto-extracted or generated.
 */
export function getMaidPhotoSignedUrl(rawMaidId: string): Promise<DocumentAccessResult> {
  return getSignedUrlForDocument(rawMaidId, "PROFILE_PHOTO");
}

/** Whether the given (employer-visible) maid has an approved photo on file — used to decide whether to render an <img> or the placeholder. */
export function hasMaidPhoto(rawMaidId: string): Promise<boolean> {
  return hasDocument(rawMaidId, "PROFILE_PHOTO");
}
