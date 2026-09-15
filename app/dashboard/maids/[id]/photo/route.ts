import { NextResponse } from "next/server";
import { getMaidPhotoSignedUrl } from "@/lib/services/maid-documents";

/**
 * GET /dashboard/maids/[id]/photo — Phase 4.6.2.
 *
 * Same shape as the biodata route: an <img src="..."> pointing here (a
 * same-origin request, so the browser attaches the session cookie
 * automatically) triggers requireEmployer() + the employer-visibility
 * check inside getMaidPhotoSignedUrl() before a signed URL is ever
 * generated, then redirects to it. A candidate photo is only ever
 * reachable by an authenticated employer for whom that maid is currently
 * visible — never a public/static asset.
 *
 * Every failure mode renders the same generic 404 — the caller (an <img>
 * tag) just shows nothing distinguishing, same as "no photo uploaded".
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getMaidPhotoSignedUrl(id);

  if (!result.ok) {
    return new NextResponse("Not found.", { status: 404 });
  }

  return NextResponse.redirect(result.url);
}
