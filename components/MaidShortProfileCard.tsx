import Image from "next/image";

const AVAILABILITY_LABEL: Record<string, string> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  PLACED: "Placed",
  UNAVAILABLE: "Unavailable",
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

export type MaidShortProfileFields = {
  photoUrl: string | null;
  profileCode: string;
  name: string;
  availabilityStatus: string;
  nationality: string;
  maidType: string | null;
  maritalStatus: string | null;
  languages: string[];
  expertise: string[];
  age: number | null;
  yearsExperience: number;
  heightCm: number | null;
  weightKg: number | null;
};

/**
 * The SHORT PROFILE — Phase 4.6.5 / Phase 6 Step 12/13, full-width
 * layout revision Phase 6.2.
 *
 * Shared, single source of truth for "what an employer sees" so the
 * employer page (app/dashboard/maids/[id]/page.tsx) and the admin
 * preview page (app/admin/maids/[id]/page.tsx) render byte-for-byte the
 * same short-profile layout instead of two hand-maintained copies that
 * could quietly drift apart. Callers supply the actions row (Shortlist +
 * View Biodata PDF for the employer; just the biodata link for the admin
 * preview) via `actions` — this component has no opinion on what they
 * are, and never reaches into shortlist/document services itself.
 *
 * Layout is a wide "hero" (photo + identity/availability/actions) above
 * a wider facts grid (see app/dashboard/dashboard.css .profile-page and
 * its mirrored copy in app/admin/admin.css) — this is a pure layout
 * change from the previous single narrow centered card. The field set
 * itself is unchanged: still exactly the approved short-profile facts,
 * nothing from the full biodata/training/employment-history data is
 * selected or rendered here.
 */
export default function MaidShortProfileCard({ fields, actions }: { fields: MaidShortProfileFields; actions?: React.ReactNode }) {
  const heightWeight =
    fields.heightCm != null || fields.weightKg != null
      ? `${fields.heightCm != null ? `${fields.heightCm}cm` : "—"} / ${fields.weightKg != null ? `${fields.weightKg}kg` : "—"}`
      : null;

  return (
    <div className="profile-page">
      <div className="card profile-hero">
        <div className="photo profile-hero__photo">
          {fields.photoUrl ? (
            <Image src={fields.photoUrl} alt="" fill sizes="(max-width: 640px) 100vw, 320px" style={{ objectFit: "cover" }} unoptimized />
          ) : (
            <div className="photo__inner">
              <svg viewBox="0 0 24 24"><use href="#i-user" /></svg>
              <span className="photo__cap">Photo</span>
            </div>
          )}
        </div>
        <div className="profile-hero__main">
          <span className="profile-hero__cid">Candidate ID · {fields.profileCode}</span>
          <h1 className="profile-hero__name">{fields.name}</h1>
          <span className="chip chip--orange">{AVAILABILITY_LABEL[fields.availabilityStatus] ?? fields.availabilityStatus}</span>
          {actions && <div className="profile-hero__actions">{actions}</div>}
        </div>
      </div>

      <div className="card profile-details">
        <h2 className="profile-details__heading">Profile Details</h2>
        <div className="profile-grid">
          <div className="profile-fact">
            <span className="profile-fact__label">Country</span>
            <span className="profile-fact__value">{fields.nationality}</span>
          </div>
          {fields.maidType && (
            <div className="profile-fact">
              <span className="profile-fact__label">Maid Type</span>
              <span className="profile-fact__value">{MAID_TYPE_LABEL[fields.maidType] ?? fields.maidType}</span>
            </div>
          )}
          {fields.maritalStatus && (
            <div className="profile-fact">
              <span className="profile-fact__label">Marital</span>
              <span className="profile-fact__value">{MARITAL_STATUS_LABEL[fields.maritalStatus] ?? fields.maritalStatus}</span>
            </div>
          )}
          <div className="profile-fact">
            <span className="profile-fact__label">Language</span>
            <span className="profile-fact__value">{fields.languages.length > 0 ? fields.languages.join(", ") : "Not provided"}</span>
          </div>
          <div className="profile-fact">
            <span className="profile-fact__label">Expertise</span>
            <span className="profile-fact__value">{fields.expertise.length > 0 ? fields.expertise.join(", ") : "—"}</span>
          </div>
          <div className="profile-fact">
            <span className="profile-fact__label">Age</span>
            <span className="profile-fact__value">{fields.age ?? "—"}</span>
          </div>
          <div className="profile-fact">
            <span className="profile-fact__label">Experience</span>
            <span className="profile-fact__value">{fields.yearsExperience} yrs</span>
          </div>
          {heightWeight && (
            <div className="profile-fact">
              <span className="profile-fact__label">Height / Weight</span>
              <span className="profile-fact__value">{heightWeight}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
