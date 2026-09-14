import Link from "next/link";
import type { Metadata } from "next";
import ShortlistCard from "@/components/dashboard/ShortlistCard";
import { getEmployerShortlist } from "@/lib/services/shortlist";

export const metadata: Metadata = { title: "My Shortlist — SG Maid Employer Portal" };

/**
 * Employer's shortlist — Phase 4. Real, per-employer data via
 * getEmployerShortlist() (lib/services/shortlist.ts), which derives the
 * employer from requireEmployer() — never from anything in this
 * request's URL, body, or client state. Only ever shows the
 * authenticated employer's own rows.
 */
export default async function ShortlistPage() {
  const shortlist = await getEmployerShortlist();

  return (
    <section className="sec-dash">
      <div className="wrap-dash">
        <div className="listing-head">
          <h2>My Shortlist</h2>
          <span className="resultcount">
            {shortlist.length} candidate{shortlist.length === 1 ? "" : "s"} shortlisted
          </span>
        </div>

        {shortlist.length > 0 ? (
          <div className="helpers-grid-app">
            {shortlist.map((item) => (
              <ShortlistCard key={item.shortlistId} maid={item} />
            ))}
          </div>
        ) : (
          <div className="card placeholder-card">
            <span className="eyebrow">My Shortlist</span>
            <h2>You haven&rsquo;t shortlisted any helpers yet</h2>
            <p style={{ marginTop: 12 }}>
              Browse available helpers and save the candidates you&rsquo;d like to discuss with our consultant.
            </p>
            <div className="btn-row" style={{ justifyContent: "center" }}>
              <Link className="btn btn--secondary" href="/dashboard/maids">Browse Helpers</Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
