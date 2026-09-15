import { NextResponse } from "next/server";
import { getAdminDocumentSignedUrl } from "@/lib/services/admin/maids";

/**
 * GET /admin/maids/[id]/biodata — Phase 6.
 *
 * Same shape as the employer /dashboard/maids/[id]/biodata route: only
 * requireAdmin() + a signed URL, generated fresh, never persisted, never
 * before authorization succeeds. No visibility check (a DRAFT profile's
 * biodata must be previewable by admin before it's ever publishable).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getAdminDocumentSignedUrl(id, "BIODATA_PDF");

  if (!result.ok) {
    return new NextResponse("Not found.", { status: 404 });
  }

  return NextResponse.redirect(result.url);
}
