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

/**
 * Employer-facing maid profile — Phase 3, revised Phase 4.6.5.
 *
 * SHORT PROFILE ONLY: this page answers "is this candidate potentially
 * suitable?" — it does not reproduce the biodata form. It shows Photo,
 * Name, Candidate ID, Country, Maid Type, Marital, Language, Expertise
 * (the five approved categories — see lib/services/maids.ts
 * resolveExpertise()), Age, Experience, Height/Weight, then Shortlist and
 * View Biodata PDF. Nothing else. Full detail — individual skills,
 * assessment notes, training records, employment history — lives only in
 * PostgreSQL (for future admin/internal use) and in the original biodata
 * PDF behind the secure View Biodata PDF flow; this page never queries or
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
              <div className="row"><span>Country</span><span>{maid.nationality}</span></div>
              {maid.maidType && (
                <div className="row"><span>Maid Type</span><span>{MAID_TYPE_LABEL[maid.maidType] ?? maid.maidType}</span></div>
              )}
              {maid.maritalStatus && (
                <div className="row"><span>Marital</span><span>{MARITAL_STATUS_LABEL[maid.maritalStatus] ?? maid.maritalStatus}</span></div>
              )}
              <div className="row">
                <span>Language</span>
                {/* Phase 4.6.5: a candidate with no confirmed language
                    (e.g. SS122/SS123 — the source biodata never states
                    one) shows this placeholder rather than guessing one
                    from nationality. */}
                <span>{maid.languages.length > 0 ? maid.languages.join(", ") : "Not provided"}</span>
              </div>
              <div className="row">
                <span>Expertise</span>
                <span>{maid.expertise.length > 0 ? maid.expertise.join(", ") : "—"}</span>
              </div>
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
        </div>
      </div>
    </section>
  );
}
