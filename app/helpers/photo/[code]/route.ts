import { NextResponse } from "next/server";
import { getPublicMaidPhotoSignedUrl } from "@/lib/services/public-maids";

/**
 * GET /helpers/photo/[code] — public photo for the homepage "Meet available
 * helpers" teaser. Only resolves for a profile that is currently ACTIVE +
 * AVAILABLE and has an approved photo; redirects to a fresh short-lived
 * signed URL (the storage bucket itself stays private). Every failure mode
 * is the same generic 404, and nothing is cached so that retiring or placing
 * a maid stops the photo being served straight away.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const url = await getPublicMaidPhotoSignedUrl(code);

  if (!url) {
    return new NextResponse("Not found.", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
