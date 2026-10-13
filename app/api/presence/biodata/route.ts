import { NextResponse } from "next/server";
import { clearProfileView, getLiveBiodataViewerCount, recordProfileView } from "@/lib/services/presence";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * GET /api/presence/biodata — the live "employers viewing biodata right now" count, polled by
 * the dashboards' pill. Only a number is returned; 401 unless the caller is a signed-in employer
 * or admin/staff (an API route answers 401, it does not redirect to a login page).
 */
export async function GET() {
  const count = await getLiveBiodataViewerCount();
  if (count === null) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  return NextResponse.json({ count }, { headers: NO_STORE });
}

/**
 * POST /api/presence/biodata — heartbeat from an employer's helper-profile page:
 *   { maidId }                 "I'm looking at this profile"
 *   { leave: true }            "I've left" (sent with sendBeacon on page hide)
 * Employer-only; an unknown / not-visible maidId records nothing.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 400, headers: NO_STORE });
  }
  const { maidId, leave } = (body ?? {}) as { maidId?: unknown; leave?: unknown };

  if (leave === true) {
    await clearProfileView();
    return new NextResponse(null, { status: 204, headers: NO_STORE });
  }

  const recorded = await recordProfileView(maidId);
  return new NextResponse(null, { status: recorded ? 204 : 403, headers: NO_STORE });
}
