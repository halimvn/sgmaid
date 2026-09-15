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
 * The SHORT PROFILE — Phase 4.6.5 / Phase 6 Step 12/13.
 *
 * Shared, single source of truth for "what an employer sees" so the
 * employer page (app/dashboard/maids/[id]/page.tsx) and the admin
 * preview page (app/admin/maids/[id]/page.tsx) render byte-for-byte the
 * same short-profile card instead of two hand-maintained copies that
 * could quietly drift apart. Callers supply the actions row (Shortlist +
 * View Biodata PDF for the employer; nothing, or an admin-only note, for
 * the preview) via `actions` — this component has no opinion on what
 * they are, and never reaches into shortlist/document services itself.
 */
export default function MaidShortProfileCard({ fields, actions }: { fields: MaidShortProfileFields; actions?: React.ReactNode }) {
  return (
    <div className="card profile-summary">
      <div className="photo profile-summary__photo">
        {fields.photoUrl ? (
          <Image src={fields.photoUrl} alt="" fill sizes="280px" style={{ objectFit: "cover" }} unoptimized />
        ) : (
          <div className="photo__inner">
            <svg viewBox="0 0 24 24"><use href="#i-user" /></svg>
            <span className="photo__cap">Photo</span>
          </div>
        )}
      </div>
      <span className="cid">Candidate ID · {fields.profileCode}</span>
      <h1 style={{ fontSize: "1.5rem", margin: "4px 0 6px" }}>{fields.name}</h1>
      <span className="chip chip--orange">{AVAILABILITY_LABEL[fields.availabilityStatus] ?? fields.availabilityStatus}</span>

      <div className="profile-summary__facts">
        <div className="row"><span>Country</span><span>{fields.nationality}</span></div>
        {fields.maidType && (
          <div className="row"><span>Maid Type</span><span>{MAID_TYPE_LABEL[fields.maidType] ?? fields.maidType}</span></div>
        )}
        {fields.maritalStatus && (
          <div className="row"><span>Marital</span><span>{MARITAL_STATUS_LABEL[fields.maritalStatus] ?? fields.maritalStatus}</span></div>
        )}
        <div className="row">
          <span>Language</span>
          <span>{fields.languages.length > 0 ? fields.languages.join(", ") : "Not provided"}</span>
        </div>
        <div className="row">
          <span>Expertise</span>
          <span>{fields.expertise.length > 0 ? fields.expertise.join(", ") : "—"}</span>
        </div>
        <div className="row"><span>Age</span><span>{fields.age ?? "—"}</span></div>
        <div className="row"><span>Experience</span><span>{fields.yearsExperience} yrs</span></div>
        {(fields.heightCm != null || fields.weightKg != null) && (
          <div className="row">
            <span>Height / Weight</span>
            <span>
              {fields.heightCm != null ? `${fields.heightCm}cm` : "—"} / {fields.weightKg != null ? `${fields.weightKg}kg` : "—"}
            </span>
          </div>
        )}
      </div>

      {actions && <div className="btns" style={{ marginTop: 16, flexDirection: "column" }}>{actions}</div>}
    </div>
  );
}
