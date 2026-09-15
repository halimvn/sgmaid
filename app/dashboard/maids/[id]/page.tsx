import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEmployerVisibleMaidProfile } from "@/lib/services/maids";
import { isMaidShortlisted } from "@/lib/services/shortlist";
import { addMaidToShortlist, removeMaidFromShortlist } from "@/lib/actions/shortlist";
import { hasBiodataDocument } from "@/lib/services/maid-documents";
import MaidShortProfileCard from "@/components/MaidShortProfileCard";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const maid = await getEmployerVisibleMaidProfile(id);
  return { title: maid ? `${maid.name} — SG Maid Employer Portal` : "Profile Not Found — SG Maid Employer Portal" };
}

/**
 * Employer-facing maid profile — Phase 3, revised Phase 4.6.5.
 *
 * SHORT PROFILE ONLY: this page answers "is this candidate potentially
 * suitable?" — it does not reproduce the biodata form. The card itself
 * (photo, facts rows) is components/MaidShortProfileCard.tsx, shared
 * with the admin preview page (app/admin/maids/[id]/page.tsx — Phase 6)
 * so both render exactly the same short profile rather than two
 * hand-maintained copies. Full detail — individual skills, assessment
 * notes, training records, employment history — lives only in
 * PostgreSQL (for admin/internal use) and in the original biodata PDF
 * behind the secure View Biodata PDF flow; this page never queries or
 * renders it. See lib/services/maids.ts getEmployerVisibleMaidProfile()
 * for the DTO that enforces this at the data layer, not just in the JSX.
 *
 * Real Prisma-backed query via lib/services/maids.ts, which enforces the
 * same employer-visibility rule as the listing page. A DRAFT profile, an
 * INACTIVE one, a hidden-availability one, or an id that simply doesn't
 * exist all resolve to the exact same getEmployerVisibleMaidProfile() →
 * null → notFound() path — a manually guessed URL to any of those
 * behaves identically to a nonexistent page, revealing nothing about
 * which case it was.
 */
export default async function MaidProfilePage({ params }: Props) {
  const { id } = await params;
  const maid = await getEmployerVisibleMaidProfile(id);

  if (!maid) {
    notFound();
  }

  const [shortlisted, hasBiodata] = await Promise.all([
    isMaidShortlisted(maid.id),
    hasBiodataDocument(maid.id),
  ]);
  const shortlistAction = shortlisted
    ? removeMaidFromShortlist.bind(null, maid.id)
    : addMaidToShortlist.bind(null, maid.id);

  return (
    <section className="sec-dash">
      <div className="wrap-dash">
        <div className="btn-row" style={{ marginBottom: 20 }}>
          <Link className="btn btn--secondary btn--sm" href="/dashboard/maids">← Back to helpers</Link>
        </div>

        <div className="profile-layout-short">
          <MaidShortProfileCard
            fields={maid}
            actions={
              <>
                <form action={shortlistAction}>
                  <button type="submit" className={`btn btn--block ${shortlisted ? "btn--outline" : "btn--primary"}`}>
                    {shortlisted ? "✓ Shortlisted — Remove" : "Shortlist"}
                  </button>
                </form>
                {hasBiodata && (
                  <a
                    className="btn btn--secondary btn--block"
                    href={`/dashboard/maids/${maid.id}/biodata`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Biodata PDF
                  </a>
                )}
              </>
            }
          />
        </div>
      </div>
    </section>
  );
}
