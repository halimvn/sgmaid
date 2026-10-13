import "server-only";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { evaluateAccess, type RequiredRole } from "@/lib/auth/authorize";
import { employerVisibleMaidWhere } from "@/lib/maid-visibility";
import { parseMaidId } from "@/lib/validation/maid-id";

/**
 * "Employers viewing biodata right now" — live presence, shown on the admin and employer
 * dashboards.
 *
 * What counts as viewing: an employer has a helper's profile page open (that page is where
 * the biodata is reached) and is looking at it, OR has opened that helper's biodata PDF in the
 * last few minutes (the PDF opens in a separate tab, which pauses the profile page's heartbeat,
 * so the open itself is remembered for a short while). Each employer counts once, however many
 * tabs they have open.
 *
 * How: the profile page sends a heartbeat every HEARTBEAT_SECONDS; a row is "live" while its
 * last heartbeat is younger than LIVE_WINDOW_SECONDS. Nothing needs cleaning up — stale rows
 * simply stop counting. Only a COUNT ever leaves this module; who is viewing what is never
 * exposed to other employers (or to the dashboards).
 */

export const HEARTBEAT_SECONDS = 20;
export const LIVE_WINDOW_SECONDS = 45;
export const BIODATA_OPEN_WINDOW_SECONDS = 180;

type Viewer = { id: string; kind: "EMPLOYER" | "BACK_OFFICE" };

/**
 * The caller, if they may use presence at all (an active employer or admin/staff) — without
 * redirecting, so API routes can answer 401 instead of bouncing to a login page.
 */
async function getViewer(): Promise<Viewer | null> {
  const session = await auth();
  if (!session?.user?.id || typeof session.sessionVersion !== "number") return null;

  for (const [required, kind] of [["EMPLOYER", "EMPLOYER"], ["BACK_OFFICE", "BACK_OFFICE"]] as [RequiredRole, Viewer["kind"]][]) {
    const result = await evaluateAccess({
      userId: session.user.id,
      tokenSessionVersion: session.sessionVersion,
      requiredRole: required,
    });
    if (result.allowed) return { id: result.user.id, kind };
  }
  return null;
}

async function getEmployerId(): Promise<string | null> {
  const viewer = await getViewer();
  return viewer?.kind === "EMPLOYER" ? viewer.id : null;
}

/**
 * Heartbeat from an employer's helper-profile page. Only for a profile that employer is
 * actually allowed to see, so a made-up id records nothing.
 */
export async function recordProfileView(rawMaidId: unknown): Promise<boolean> {
  const employerId = await getEmployerId();
  const maidId = parseMaidId(rawMaidId);
  if (!employerId || !maidId) return false;

  const visible = await prisma.maidProfile.findFirst({ where: { id: maidId, ...employerVisibleMaidWhere() }, select: { id: true } });
  if (!visible) return false;

  const now = new Date();
  await prisma.biodataPresence.upsert({
    where: { employerId },
    create: { employerId, maidId, lastSeenAt: now },
    update: { maidId, lastSeenAt: now },
  });
  return true;
}

/** The employer left the profile page: stop counting the page itself (a recent PDF open still counts briefly). */
export async function clearProfileView(): Promise<void> {
  const employerId = await getEmployerId();
  if (!employerId) return;
  await prisma.biodataPresence.updateMany({ where: { employerId }, data: { lastSeenAt: new Date(0) } });
}

/**
 * Called by the biodata PDF route after it has authorised the request: the employer is now
 * reading that helper's biodata. Never throws — presence must never get in the way of the PDF.
 */
export async function recordBiodataOpened(maidId: string, employerId: string): Promise<void> {
  try {
    const now = new Date();
    await prisma.biodataPresence.upsert({
      where: { employerId },
      create: { employerId, maidId, lastSeenAt: now, biodataOpenedAt: now },
      update: { maidId, lastSeenAt: now, biodataOpenedAt: now },
    });
  } catch (err) {
    console.error("recordBiodataOpened failed:", err);
  }
}

/** How many employers are viewing biodata right now. Null when the caller isn't allowed to ask. */
export async function getLiveBiodataViewerCount(): Promise<number | null> {
  const viewer = await getViewer();
  if (!viewer) return null;

  const now = Date.now();
  return prisma.biodataPresence.count({
    where: {
      OR: [
        { lastSeenAt: { gt: new Date(now - LIVE_WINDOW_SECONDS * 1000) } },
        { biodataOpenedAt: { gt: new Date(now - BIODATA_OPEN_WINDOW_SECONDS * 1000) } },
      ],
    },
  });
}
