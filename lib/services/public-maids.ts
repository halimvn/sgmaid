import "server-only";
import { prisma } from "@/lib/db";

/**
 * Public, unauthenticated maid-preview data layer — for the marketing
 * homepage's "Meet available helpers" teaser only.
 *
 * Deliberately NOT lib/services/maids.ts: that file's every export calls
 * requireEmployer() first, because it exists specifically for the
 * logged-in employer experience. This section renders before login, so
 * reusing that service would either reject the request outright or
 * (worse) require weakening requireEmployer() just to let an anonymous
 * visitor through — this file exists instead, with its own much
 * smaller DTO and no auth boundary to weaken because it never touches
 * anything sensitive in the first place.
 *
 * Visibility: ACTIVE + AVAILABLE only, same as the employer listing's
 * default policy (see lib/maid-visibility.ts) minus RESERVED — a public,
 * pre-login visitor sees a narrower slice than a logged-in employer, not
 * a wider one. DRAFT/INACTIVE/PLACED/UNAVAILABLE/RESERVED are all
 * excluded.
 *
 * The DTO is intentionally minimal — no id, no photo, no expertise/
 * skills, no marital status, and the displayed name is first-name-only
 * (a private individual's full name isn't put on an unauthenticated,
 * search-engine-crawlable page just because an employer-gated view
 * already shows it to logged-in employers). Full details remain behind
 * /login, exactly like the real employer profile page and its secure
 * biodata/photo routes.
 */

export type PublicMaidPreview = {
  profileCode: string;
  displayName: string;
  nationality: string;
  age: number | null;
  yearsExperience: number;
};

const HOMEPAGE_PREVIEW_LIMIT = 4;

function deriveAge(dateOfBirth: Date | null): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) age--;
  return age;
}

/** First name only — see file header for why the full name isn't shown publicly. */
function toDisplayName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0];
  return first || "Helper";
}

/**
 * Up to HOMEPAGE_PREVIEW_LIMIT ACTIVE+AVAILABLE profiles, most-recently-
 * updated first — a deterministic order (never random), so the same
 * visitor sees the same cards on repeated loads rather than the set
 * reshuffling on every render.
 *
 * Never throws: a database failure is logged server-side only and
 * resolves to an empty array, which the homepage already renders as a
 * graceful "check back soon" empty state — the public marketing page
 * must never 500, and must never leak a raw Prisma/database error to
 * the client.
 */
export async function getPublicMaidPreviews(): Promise<PublicMaidPreview[]> {
  try {
    const rows = await prisma.maidProfile.findMany({
      where: { profileStatus: "ACTIVE", availabilityStatus: "AVAILABLE" },
      orderBy: { updatedAt: "desc" },
      take: HOMEPAGE_PREVIEW_LIMIT,
      select: {
        profileCode: true,
        name: true,
        nationality: true,
        dateOfBirth: true,
        yearsExperience: true,
      },
    });

    return rows.map((row) => ({
      profileCode: row.profileCode,
      displayName: toDisplayName(row.name),
      nationality: row.nationality,
      age: deriveAge(row.dateOfBirth),
      yearsExperience: row.yearsExperience,
    }));
  } catch (err) {
    console.error("getPublicMaidPreviews: failed to load homepage helper previews:", err);
    return [];
  }
}
