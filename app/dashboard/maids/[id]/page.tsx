import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Maid Profile — SG Maid Employer Portal" };

/**
 * Full maid profile detail — placeholder for Phase 0.
 *
 * The original static dashboard had no detail page at all ("View
 * Profile" was a dead `href="#"` link); this route is new, prepared
 * so Phase 3 can render the real profile (employment history,
 * skills, training modules) once the database exists.
 */
export default async function MaidProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <section className="sec-dash">
      <div className="wrap-dash">
        <div className="card placeholder-card">
          <span className="eyebrow">Candidate {id}</span>
          <h2>Full profile — coming in Phase 3</h2>
          <p style={{ marginTop: 12 }}>
            This is where the complete biodata will render once the maid database is connected: employment history,
            specialised skills and the One-Day Training Handbook modules completed by this candidate.
          </p>
          <div className="btn-row" style={{ justifyContent: "center" }}>
            <Link className="btn btn--secondary" href="/dashboard/maids">← Back to helpers</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
