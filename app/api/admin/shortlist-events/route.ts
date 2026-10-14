import { NextResponse } from "next/server";
import { getBackOfficeUserOrNull } from "@/lib/auth/authorize";
import { getShortlistEventsSince } from "@/lib/services/admin/shortlists";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * GET /api/admin/shortlist-events?since=<ISO time> — new "a client shortlisted a helper" events
 * for the admin dashboard's pop-up notifications. Admin/staff only (401 otherwise — an API route
 * answers 401, it does not redirect). Without `since` it just returns the cursor to start from.
 */
export async function GET(request: Request) {
  const user = await getBackOfficeUserOrNull();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });

  const raw = new URL(request.url).searchParams.get("since");
  const parsed = raw ? new Date(raw) : null;
  const since = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;

  const result = await getShortlistEventsSince(since);
  return NextResponse.json(result, { headers: NO_STORE });
}
