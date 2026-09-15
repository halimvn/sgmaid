import { NextResponse } from "next/server";
import { getBiodataSignedUrl } from "@/lib/services/maid-documents";

/**
 * GET /dashboard/maids/[id]/biodata — Phase 4.6.
 *
 * The "View Biodata PDF" button is a plain `<a target="_blank">` to this
 * route rather than a Server Action, specifically so the browser can open
 * it as a normal new-tab navigation. This route does the real work:
 * requireEmployer() + employer-visibility check (inside
 * getBiodataSignedUrl(), which never generates a signed URL before both
 * pass) and then redirects to a fresh, short-lived Supabase Storage
 * signed URL. Nothing here is cached — a repeated request always
 * re-authorizes and re-signs.
 *
 * Every failure mode (invalid id, maid not employer-visible, no document
 * on file, unauthenticated) renders the same generic 404 — never a
 * distinguishing message about which case it was.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getBiodataSignedUrl(id);

  if (!result.ok) {
    return new NextResponse("Not found.", { status: 404 });
  }

  return NextResponse.redirect(result.url);
}
