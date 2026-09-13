import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Shortlist — SG Maid Employer Portal" };

/**
 * Employer's shortlist — placeholder for Phase 0.
 *
 * The original static dashboard only showed a summary banner ("My
 * Shortlist — 3 Candidates") with a dead "View Shortlist" link; this
 * route is new, prepared so Phase 4 can render the real, per-employer
 * shortlist once Shortlist/ShortlistItem exist in the database.
 */
export default function ShortlistPage() {
  return (
    <section className="sec-dash">
      <div className="wrap-dash">
        <div className="card placeholder-card">
          <span className="eyebrow">My Shortlist</span>
          <h2>Your shortlisted candidates will appear here</h2>
          <p style={{ marginTop: 12 }}>
            This page is prepared for Phase 4, once shortlist data is stored per employer with proper ownership
            checks — only your own shortlist will ever be shown here.
          </p>
          <div className="btn-row" style={{ justifyContent: "center" }}>
            <Link className="btn btn--secondary" href="/dashboard/maids">Browse helpers</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
