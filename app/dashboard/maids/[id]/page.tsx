import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEmployerVisibleMaidProfile } from "@/lib/services/maids";
import { isMaidShortlisted } from "@/lib/services/shortlist";
import { addMaidToShortlist, removeMaidFromShortlist } from "@/lib/actions/shortlist";
import { hasBiodataDocument } from "@/lib/services/maid-documents";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const maid = await getEmployerVisibleMaidProfile(id);
  return { title: maid ? `${maid.name} — SG Maid Employer Portal` : "Profile Not Found — SG Maid Employer Portal" };
}

const AVAILABILITY_LABEL: Record<"AVAILABLE" | "RESERVED", string> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
};

const MARITAL_STATUS_LABEL: Record<string, string> = {
  SINGLE: "Single",
  MARRIED: "Married",
  DIVORCED: "Divorced",
  WIDOWED: "Widowed",
};

const MAID_TYPE_LABEL: Record<string, string> = {
  NEW: "New Maid",
  TRANSFER: "Transfer Maid",
  EX_SINGAPORE: "Ex-Singapore Maid",
  EX_OTHERS: "Ex-Others Maid",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-SG", { year: "numeric", month: "short" });
}

/**
 * Full maid profile detail — Phase 3. Real Prisma-backed query via
 * lib/services/maids.ts, which enforces the same employer-visibility
 * rule as the listing page. A DRAFT profile, an INACTIVE one, a hidden-
 * availability one, or an id that simply doesn't exist all resolve to
 * the exact same getEmployerVisibleMaidProfile() → null → notFound()
 * path — a manually guessed URL to any of those behaves identically to
 * a nonexistent page, revealing nothing about which case it was.
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

        <div className="profile-layout">
          {/* Summary card */}
          <div className="card profile-summary">
            <div className="photo profile-summary__photo">
              {maid.photoUrl ? (
                <Image
                  src={maid.photoUrl}
                  alt=""
                  fill
                  sizes="280px"
                  style={{ objectFit: "cover" }}
                  // See components/dashboard/MaidCard.tsx — photoUrl may be
                  // an authenticated, cookie-gated route (Phase 4.6.2).
                  unoptimized
                />
              ) : (
                <div className="photo__inner">
                  <svg viewBox="0 0 24 24"><use href="#i-user" /></svg>
                  <span className="photo__cap">Photo</span>
                </div>
              )}
            </div>
            <span className="cid">Candidate ID · {maid.profileCode}</span>
            <h1 style={{ fontSize: "1.5rem", margin: "4px 0 6px" }}>{maid.name}</h1>
            <span className="chip chip--orange">{AVAILABILITY_LABEL[maid.availabilityStatus]}</span>

            <div className="profile-summary__facts">
              <div className="row"><span>Nationality</span><span>{maid.nationality}</span></div>
              {maid.maidType && (
                <div className="row"><span>Maid Type</span><span>{MAID_TYPE_LABEL[maid.maidType] ?? maid.maidType}</span></div>
              )}
              {maid.maritalStatus && (
                <div className="row"><span>Marital</span><span>{MARITAL_STATUS_LABEL[maid.maritalStatus] ?? maid.maritalStatus}</span></div>
              )}
              <div className="row"><span>Age</span><span>{maid.age ?? "—"}</span></div>
              <div className="row"><span>Experience</span><span>{maid.yearsExperience} yrs</span></div>
              {(maid.heightCm != null || maid.weightKg != null) && (
                <div className="row">
                  <span>Height / Weight</span>
                  <span>
                    {maid.heightCm != null ? `${maid.heightCm}cm` : "—"} / {maid.weightKg != null ? `${maid.weightKg}kg` : "—"}
                  </span>
                </div>
              )}
              <div className="row">
                <span>Languages</span>
                <span>{maid.languages.length > 0 ? maid.languages.join(", ") : "—"}</span>
              </div>
            </div>

            <div className="btns" style={{ marginTop: 16, flexDirection: "column" }}>
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
            </div>
          </div>

          {/* Detail sections */}
          <div className="profile-detail">
            <div className="card">
              <span className="eyebrow">Specialised skills</span>
              {maid.skills.length > 0 ? (
                <ul className="tag-list">
                  {maid.skills.map((skill) => (
                    <li key={skill.name} className="chip">
                      {skill.name}
                      {skill.experienceLevel && <span style={{ opacity: 0.7 }}> · {skill.experienceLevel.toLowerCase()}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: "var(--ink-45)", marginTop: 8 }}>No skills recorded yet.</p>
              )}
            </div>

            <div className="card">
              <span className="eyebrow">Training completed</span>
              {maid.trainings.length > 0 ? (
                <ul className="training-list">
                  {maid.trainings.map((training) => (
                    <li key={training.title} className="training-list__item">
                      <span className={training.completed ? "chip" : "chip chip--muted"}>
                        {training.completed ? "✓" : "—"}
                      </span>
                      <span>
                        {training.title}
                        {training.completed && training.completedAt && (
                          <span style={{ color: "var(--ink-45)" }}> — completed {formatDate(training.completedAt)}</span>
                        )}
                        {!training.completed && <span style={{ color: "var(--ink-45)" }}> — not yet completed</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: "var(--ink-45)", marginTop: 8 }}>No training records yet.</p>
              )}
            </div>

            <div className="card">
              <span className="eyebrow">Employment history</span>
              {maid.employmentHistory.length > 0 ? (
                <ul className="history-list">
                  {maid.employmentHistory.map((entry, i) => (
                    <li key={i} className="history-list__item">
                      <div className="history-list__dates">
                        {entry.startLabel} – {entry.endLabel ?? "Present"}
                      </div>
                      <div className="history-list__country">{entry.country}</div>
                      {entry.duties && <p>{entry.duties}</p>}
                      {entry.householdDescription && (
                        <p style={{ color: "var(--ink-45)" }}>{entry.householdDescription}</p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: "var(--ink-45)", marginTop: 8 }}>No prior employment history recorded.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
