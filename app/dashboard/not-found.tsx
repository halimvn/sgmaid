import Link from "next/link";

/**
 * Dashboard-scoped 404 — Phase 3.
 *
 * Reached by notFound() from app/dashboard/maids/[id]/page.tsx for any
 * id that doesn't exist OR isn't employer-visible (DRAFT, INACTIVE, or a
 * hidden availability status) — deliberately identical for all of those
 * cases, revealing nothing about which one it was. Still rendered inside
 * the authenticated dashboard shell (app/dashboard/layout.tsx already
 * ran requireEmployer() before this can even be reached).
 */
export default function DashboardNotFound() {
  return (
    <section className="sec-dash">
      <div className="wrap-dash">
        <div className="card placeholder-card">
          <span className="eyebrow">Not found</span>
          <h2>We couldn&rsquo;t find that page</h2>
          <p style={{ marginTop: 12 }}>
            This profile may no longer be available, or the link may be incorrect.
          </p>
          <div className="btn-row" style={{ justifyContent: "center" }}>
            <Link className="btn btn--secondary" href="/dashboard/maids">← Back to helpers</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
