import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard — SG Maid Employer Portal" };

export default function DashboardHomePage() {
  return (
    <>
      {/* WELCOME */}
      <section className="sec-dash welcome">
        <svg className="rings" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="26" stroke="currentColor" />
          <circle cx="100" cy="100" r="46" stroke="currentColor" />
          <circle cx="100" cy="100" r="66" stroke="currentColor" />
        </svg>
        <div className="wrap-dash">
          <span className="eyebrow">Employer Dashboard</span>
          <h1>Welcome, [Employer Name]</h1>
          <p className="lead" style={{ marginTop: 10 }}>
            Browse available helper profiles and shortlist candidates for discussion with our consultant.
          </p>
          <div className="btns" style={{ marginTop: 24 }}>
            <Link className="btn btn--primary" href="/dashboard/maids">Browse Helpers</Link>
            <Link className="btn btn--secondary" href="/dashboard/shortlist">View My Shortlist</Link>
          </div>
        </div>
      </section>

      {/* SHORTLIST SUMMARY */}
      <section className="sec-dash" style={{ paddingTop: 0 }}>
        <div className="wrap-dash">
          <div className="shortlist">
            <div className="count">
              My Shortlist — 3 Candidates
              <span>Saved profiles are shared with your consultant ahead of your doorstep house call.</span>
            </div>
            <Link className="btn btn--secondary" href="/dashboard/shortlist">View Shortlist</Link>
          </div>
        </div>
      </section>
    </>
  );
}
