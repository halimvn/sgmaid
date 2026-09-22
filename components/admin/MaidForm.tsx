import {
  MAID_TYPE_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  EXPERTISE_OPTIONS,
  PROFILE_STATUS_OPTIONS,
  AVAILABILITY_STATUS_OPTIONS,
  EMPLOYMENT_HISTORY_ROW_COUNT,
  type ExpertiseOptionValue,
} from "@/lib/validation/admin-maid";
import type { AdminMaidDetail } from "@/lib/services/admin/maids";

const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_FAILED: "Please check the form — some fields are missing or invalid.",
  DUPLICATE_PROFILE_CODE: "A helper with this Candidate ID already exists.",
  NOT_FOUND: "This profile could not be found.",
};

/**
 * Shared Add/Edit Maid form — Phase 6.
 *
 * Deliberately a plain server-rendered <form action={action}> with no
 * client JS: Employment History is a fixed number of optional row slots
 * (EMPLOYMENT_HISTORY_ROW_COUNT) rather than a dynamically add-able
 * list, and Expertise/checkboxes submit natively. Matches this
 * project's established "zero-client-JS form" convention (see the
 * employer filter sidebar). File inputs (photo, biodata PDF) work with
 * a Server Action's FormData natively — no encType or JS needed either.
 *
 * Section A–G fields only — this intentionally does NOT reproduce the
 * full FDW biodata questionnaire (see Phase 6 spec).
 */
export default function MaidForm({
  mode,
  action,
  initial,
  errorCode,
  publishGaps,
  fileWarnings,
}: {
  mode: "create" | "edit";
  action: (formData: FormData) => void | Promise<void>;
  initial?: AdminMaidDetail;
  errorCode?: string;
  publishGaps?: string;
  fileWarnings?: string;
}) {
  return (
    <form action={action} className="admin-form">
      {errorCode && <p className="form-notice form-notice--error">{ERROR_MESSAGES[errorCode] ?? "Something went wrong. Please try again."}</p>}
      {publishGaps && (
        <p className="form-notice form-notice--warning">
          Saved as <strong>Draft</strong> — not published, because the following are still needed before this profile
          can go Active: {publishGaps}.
        </p>
      )}
      {fileWarnings && <p className="form-notice form-notice--warning">{fileWarnings}</p>}

      {/* SECTION A — Basic Information */}
      <section>
        <h3>Basic Information</h3>
        <div className="admin-form__grid">
          <div className="admin-field">
            <label htmlFor="profileCode">Profile Code <span className="hint">(required, unique — e.g. DV155)</span></label>
            <input type="text" id="profileCode" name="profileCode" required defaultValue={initial?.profileCode} placeholder="DV155" />
          </div>
          <div className="admin-field">
            <label htmlFor="name">Name <span className="hint">(required)</span></label>
            <input type="text" id="name" name="name" required defaultValue={initial?.name} />
          </div>
          <div className="admin-field">
            <label htmlFor="dateOfBirth">Date of Birth <span className="hint">(age is calculated automatically)</span></label>
            <input type="date" id="dateOfBirth" name="dateOfBirth" defaultValue={initial?.dateOfBirth ?? ""} />
          </div>
          <div className="admin-field">
            <label>Country / Nationality</label>
            <input type="text" value="Indonesian" disabled />
            <span className="hint">All current helpers are from Indonesia.</span>
          </div>
          <div className="admin-field">
            <label htmlFor="maidType">Maid Type <span className="hint">(required)</span></label>
            <select id="maidType" name="maidType" required defaultValue={initial?.maidType ?? ""}>
              <option value="" disabled>Select…</option>
              {MAID_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="admin-field">
            <label htmlFor="maritalStatus">Marital Status</label>
            <select id="maritalStatus" name="maritalStatus" defaultValue={initial?.maritalStatus ?? ""}>
              <option value="">Not Provided</option>
              {MARITAL_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="admin-field admin-field--full">
            <label htmlFor="languages">Languages</label>
            <input
              type="text"
              id="languages"
              name="languages"
              defaultValue={initial?.languages.join(", ") ?? ""}
              placeholder="e.g. Bahasa Indonesia, English"
            />
            <span className="hint">
              Comma-separated. Never inferred from nationality — leave blank if the source biodata doesn&apos;t state
              one. Spelling variants (e.g. &quot;Bahasa&quot;) are normalized to one canonical value automatically.
            </span>
          </div>
          <div className="admin-field">
            <label htmlFor="heightCm">Height (cm)</label>
            <input type="number" id="heightCm" name="heightCm" min={1} defaultValue={initial?.heightCm ?? ""} />
          </div>
          <div className="admin-field">
            <label htmlFor="weightKg">Weight (kg)</label>
            <input type="number" id="weightKg" name="weightKg" min={1} defaultValue={initial?.weightKg ?? ""} />
          </div>
          <div className="admin-field">
            <label htmlFor="yearsExperience">Years of Experience</label>
            <input type="number" id="yearsExperience" name="yearsExperience" min={0} defaultValue={initial?.yearsExperience ?? ""} />
            <span className="hint">This is not a substitute for detailed Employment History below.</span>
          </div>
        </div>
      </section>

      {/* SECTION B — Expertise */}
      <section>
        <h3>Expertise</h3>
        <p className="hint" style={{ marginBottom: 10 }}>The approved employer-facing categories only. Select all that apply.</p>
        <div className="admin-checkbox-group">
          {EXPERTISE_OPTIONS.map((o) => (
            <label key={o.value}>
              <input
                type="checkbox"
                name="expertise"
                value={o.value}
                defaultChecked={initial?.expertise.includes(o.value as ExpertiseOptionValue)}
              />
              {o.label}
            </label>
          ))}
        </div>
      </section>

      {/* SECTION C — Employment History (optional, internal) */}
      <section>
        <h3>Employment History <span className="hint">(optional — internal use; not shown in detail to employers)</span></h3>
        {Array.from({ length: EMPLOYMENT_HISTORY_ROW_COUNT }, (_, i) => {
          const row = initial?.employmentHistory[i];
          return (
            <div className="admin-employment-row" key={i}>
              <div className="admin-field">
                <label htmlFor={`eh-country-${i}`}>Country</label>
                <input type="text" id={`eh-country-${i}`} name={`employmentHistory.${i}.country`} defaultValue={row?.country ?? ""} />
              </div>
              <div className="admin-field">
                <label htmlFor={`eh-start-${i}`}>Start Year</label>
                <input type="number" id={`eh-start-${i}`} name={`employmentHistory.${i}.startYear`} defaultValue={row?.startYear ?? ""} />
              </div>
              <div className="admin-field">
                <label htmlFor={`eh-end-${i}`}>End Year</label>
                <input type="number" id={`eh-end-${i}`} name={`employmentHistory.${i}.endYear`} defaultValue={row?.endYear ?? ""} />
              </div>
              <div className="admin-field">
                <label htmlFor={`eh-duties-${i}`}>Duties / Short description</label>
                <input type="text" id={`eh-duties-${i}`} name={`employmentHistory.${i}.duties`} defaultValue={row?.duties ?? ""} />
              </div>
            </div>
          );
        })}
      </section>

      {/* SECTION D — Profile Photo */}
      <section>
        <h3>Profile Photo</h3>
        <div className="admin-field">
          <label htmlFor="photo">Choose approved image (JPEG, PNG, or WEBP — max 8MB)</label>
          <input type="file" id="photo" name="photo" accept="image/jpeg,image/png,image/webp" />
          {initial?.hasPhoto && <p className="admin-current-file">✓ A photo is currently on file. Uploading a new one replaces it.</p>}
          <span className="hint">Required before this profile can be published (set to Active).</span>
        </div>
      </section>

      {/* SECTION E — Biodata PDF */}
      <section>
        <h3>Biodata PDF</h3>
        <div className="admin-field">
          <label htmlFor="biodataPdf">Original biodata document (PDF only — max 10MB)</label>
          <input type="file" id="biodataPdf" name="biodataPdf" accept="application/pdf" />
          {initial?.hasBiodata && <p className="admin-current-file">✓ A biodata PDF is currently on file. Uploading a new one replaces it.</p>}
          <span className="hint">Required before this profile can be published (set to Active).</span>
        </div>
      </section>

      {/* SECTION F/G — Status */}
      <section>
        <h3>Status</h3>
        <div className="admin-form__grid">
          <div className="admin-field">
            <label htmlFor="profileStatus">Profile Status</label>
            <select id="profileStatus" name="profileStatus" defaultValue={initial?.profileStatus ?? "DRAFT"}>
              {PROFILE_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="hint">New profiles start as Draft — creating a profile never publishes it automatically.</span>
          </div>
          <div className="admin-field">
            <label htmlFor="availabilityStatus">Availability Status</label>
            <select id="availabilityStatus" name="availabilityStatus" defaultValue={initial?.availabilityStatus ?? "UNAVAILABLE"}>
              {AVAILABILITY_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </section>

      <div className="btns">
        <button type="submit" className="btn btn--primary">{mode === "create" ? "Submit" : "Save Changes"}</button>
        {mode === "edit" && initial && (
          <a href={`/admin/maids/${initial.id}`} className="btn btn--outline" target="_blank" rel="noopener noreferrer">
            Preview Employer Profile
          </a>
        )}
      </div>
    </form>
  );
}
