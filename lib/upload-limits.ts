/**
 * Size limits for the admin Add/Edit Maid uploads (profile photo + biodata PDF).
 *
 * The photo and PDF travel to the server inside ONE form submission (a Server Action),
 * and two ceilings apply to that single request:
 *   1. Next.js's Server Action body limit — 1 MB by default, raised in next.config.ts.
 *      Hitting it is what produced "ERROR …@E394" for a 1.1 MB biodata PDF.
 *   2. Vercel's request-body cap for serverless functions — 4.5 MB, a platform limit that
 *      no app setting can raise.
 * So the usable budget is a little under 4.5 MB for the photo and PDF TOGETHER, which is
 * what UPLOAD_TOTAL_MAX_BYTES is: 4 MiB, leaving headroom for the other form fields and
 * multipart overhead. Each file individually is also capped at that same figure.
 *
 * Pure constants (no server-only import) so the browser-side size check in
 * components/admin/UploadSizeGuard.tsx and the server-side validators share one number.
 * Going beyond this would mean uploading files straight from the browser to storage
 * (signed upload URLs) instead of through the server, bypassing both ceilings.
 */
export const UPLOAD_TOTAL_MAX_BYTES = 4 * 1024 * 1024;
export const UPLOAD_TOTAL_MAX_LABEL = "4 MB";

export function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
