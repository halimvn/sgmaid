import { NextResponse } from "next/server";
import { getAdminDocumentSignedUrl } from "@/lib/services/admin/maids";

/** GET /admin/maids/[id]/photo — Phase 6. Same shape as ./biodata/route.ts, for PROFILE_PHOTO. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getAdminDocumentSignedUrl(id, "PROFILE_PHOTO");

  if (!result.ok) {
    return new NextResponse("Not found.", { status: 404 });
  }

  return NextResponse.redirect(result.url);
}
