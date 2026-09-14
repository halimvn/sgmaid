import "server-only";
import { prisma } from "@/lib/db";
import { requireEmployer } from "@/lib/auth/authorize";
import { employerVisibleMaidWhere, isEmployerVisibleAvailability } from "@/lib/maid-visibility";
import { parseMaidId } from "@/lib/validation/shortlist";

/**
 * Employer-safe shortlist data layer — Phase 4.
 *
 * Every exported function calls requireEmployer() itself, first — same
 * pattern as lib/services/maids.ts. The employer identity used in every
 * query below is ALWAYS `employer.id` from that call — never a value
 * accepted as a parameter, never read from a URL/body/hidden field. This
 * is what makes it structurally impossible for one employer to read,
 * add to, or remove from another employer's shortlist: there is no
 * function signature here that even accepts an employerId to spoof.
 */

export type AddToShortlistResult = { ok: true } | { ok: false; reason: "INVALID_ID" | "NOT_VISIBLE" };
export type RemoveFromShortlistResult = { ok: true } | { ok: false; reason: "INVALID_ID" };

export type ShortlistItem = {
  shortlistId: string;
  maidId: string;
  shortlistedAt: string;
  /**
   * False once the underlying maid is no longer employer-visible
   * (profileStatus left ACTIVE, or availabilityStatus moved to
   * PLACED/UNAVAILABLE, or the profile was retired to INACTIVE). The
   * Shortlist row itself is deliberately NOT deleted when this happens
   * (see lib/services/shortlist.ts header) — this flag is how the UI
   * knows to fall back to the generic unavailable presentation instead
   * of the real profile details, and to withhold the "View Profile"
   * link (Phase 3's visibility rule must not be bypassable via an old
   * shortlist entry).
   */
  visible: boolean;
  name: string;
  profileCode: string;
  photoUrl: string | null;
  nationality: string | null;
  age: number | null;
  yearsExperience: number | null;
  skills: string[];
  availabilityLabel: string;
};

function deriveAge(dateOfBirth: Date | null): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) age--;
  return age;
}

const AVAILABILITY_LABEL: Record<string, string> = { AVAILABLE: "Available", RESERVED: "Reserved" };

/**
 * The authenticated employer's shortlisted maid ids, as a Set — the one
 * query the maid listing page needs to mark every card's button state
 * without running a per-card shortlist lookup (see
 * app/dashboard/maids/page.tsx: one listing query + this one query,
 * never N+1).
 */
export async function getShortlistedMaidIds(): Promise<Set<string>> {
  const employer = await requireEmployer();

  const rows = await prisma.shortlist.findMany({
    where: { employerId: employer.id },
    select: { maidId: true },
  });

  return new Set(rows.map((r) => r.maidId));
}

/** Single-maid check for the detail page (one maid, one query — no loop involved). */
export async function isMaidShortlisted(maidId: string): Promise<boolean> {
  const employer = await requireEmployer();
  const parsedId = parseMaidId(maidId);
  if (!parsedId) return false;

  const row = await prisma.shortlist.findUnique({
    where: { employerId_maidId: { employerId: employer.id, maidId: parsedId } },
    select: { id: true },
  });
  return row !== null;
}

export async function getShortlistCount(): Promise<number> {
  const employer = await requireEmployer();
  return prisma.shortlist.count({ where: { employerId: employer.id } });
}

/**
 * Full shortlist DTO list for /dashboard/shortlist. One query joining
 * Shortlist -> MaidProfile -> skills (Prisma batches the relation, not
 * one query per row). profileStatus/availabilityStatus are selected
 * only to decide `visible` here — they are never included in the
 * returned DTO, and internalNotes is never selected at all.
 */
export async function getEmployerShortlist(): Promise<ShortlistItem[]> {
  const employer = await requireEmployer();

  const rows = await prisma.shortlist.findMany({
    where: { employerId: employer.id },
    orderBy: { createdAt: "desc" }, // most recently shortlisted first
    select: {
      id: true,
      maidId: true,
      createdAt: true,
      maid: {
        select: {
          profileCode: true,
          name: true,
          photoUrl: true,
          nationality: true,
          dateOfBirth: true,
          yearsExperience: true,
          profileStatus: true,
          availabilityStatus: true,
          skills: { select: { skill: { select: { name: true } } } },
        },
      },
    },
  });

  return rows.map((row) => {
    const visible =
      row.maid.profileStatus === "ACTIVE" && isEmployerVisibleAvailability(row.maid.availabilityStatus);

    if (!visible) {
      // Generic, safe presentation — no DRAFT/INACTIVE/PLACED/UNAVAILABLE
      // ever reaches the client, and no other profile detail (nationality,
      // age, experience, skills) is exposed once a maid has left the
      // employer-visible set. Identity (name/profileCode) is kept: the
      // employer already knows exactly who they shortlisted, so showing
      // which saved entry has become unavailable isn't a new disclosure —
      // it's what lets them find and remove it.
      return {
        shortlistId: row.id,
        maidId: row.maidId,
        shortlistedAt: row.createdAt.toISOString(),
        visible: false,
        name: row.maid.name,
        profileCode: row.maid.profileCode,
        photoUrl: null,
        nationality: null,
        age: null,
        yearsExperience: null,
        skills: [],
        availabilityLabel: "No longer available",
      };
    }

    return {
      shortlistId: row.id,
      maidId: row.maidId,
      shortlistedAt: row.createdAt.toISOString(),
      visible: true,
      name: row.maid.name,
      profileCode: row.maid.profileCode,
      photoUrl: row.maid.photoUrl,
      nationality: row.maid.nationality,
      age: deriveAge(row.maid.dateOfBirth),
      yearsExperience: row.maid.yearsExperience,
      skills: row.maid.skills.map((s) => s.skill.name),
      availabilityLabel: AVAILABILITY_LABEL[row.maid.availabilityStatus] ?? "Available",
    };
  });
}

/**
 * Adds a maid to the authenticated employer's shortlist. Only a
 * currently employer-visible maid can be newly shortlisted — reuses the
 * exact same visibility policy as lib/services/maids.ts
 * (employerVisibleMaidWhere()), not a duplicated check. Idempotent: a
 * second add for the same (employer, maid) pair via `upsert` never
 * creates a duplicate row and never surfaces a raw Prisma P2002 error —
 * it's simply still shortlisted either way.
 */
export async function addToShortlist(rawMaidId: string): Promise<AddToShortlistResult> {
  const employer = await requireEmployer();

  const maidId = parseMaidId(rawMaidId);
  if (!maidId) return { ok: false, reason: "INVALID_ID" };

  const maid = await prisma.maidProfile.findFirst({
    where: { id: maidId, ...employerVisibleMaidWhere() },
    select: { id: true },
  });
  if (!maid) return { ok: false, reason: "NOT_VISIBLE" };

  await prisma.shortlist.upsert({
    where: { employerId_maidId: { employerId: employer.id, maidId } },
    create: { employerId: employer.id, maidId },
    update: {}, // already shortlisted — no-op, still a success
  });

  return { ok: true };
}

/**
 * Removes a maid from the authenticated employer's shortlist. The WHERE
 * clause is always (employerId = this employer's id) AND (maidId) —
 * never maidId alone — so this can never touch another employer's row,
 * regardless of what maidId is supplied. Idempotent: removing something
 * already absent (already removed, or never shortlisted) is still a
 * success, not an error.
 */
export async function removeFromShortlist(rawMaidId: string): Promise<RemoveFromShortlistResult> {
  const employer = await requireEmployer();

  const maidId = parseMaidId(rawMaidId);
  if (!maidId) return { ok: false, reason: "INVALID_ID" };

  await prisma.shortlist.deleteMany({
    where: { employerId: employer.id, maidId },
  });

  return { ok: true };
}
