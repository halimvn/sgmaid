"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  MAID_TYPE_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  EXPERTISE_OPTIONS,
  PROFILE_STATUS_OPTIONS,
  AVAILABILITY_STATUS_OPTIONS,
  EMPLOYMENT_HISTORY_ROW_COUNT,
  type ExpertiseOptionValue,
} from "@/lib/validation/maid-form-options";
import type { MaidFormState } from "@/lib/validation/maid-form-state";
import type { AdminMaidDetail } from "@/lib/services/admin/maids";
import DateOfBirthField from "@/components/admin/DateOfBirthField";
import UploadSizeGuard from "@/components/admin/UploadSizeGuard";
import { UPLOAD_TOTAL_MAX_LABEL } from "@/lib/upload-limits";

/**
 * Shared Add/Edit Maid form — Phase 6.
 *
 * A client component driving a Server Action through useActionState: when a save fails
 * the action returns which field is wrong (shown under that field and in a summary at the
 * top) together with everything that was typed, and the form is re-filled from it. Only a
 * chosen photo/PDF cannot be kept — browsers never allow that — so the form says so.
 * Employment History is a fixed number of optional row slots
 * (EMPLOYMENT_HISTORY_ROW_COUNT) rather than a dynamically add-able list.
 *
 * Section A–G fields only — this intentionally does NOT reproduce the
 * full FDW biodata questionnaire (see Phase 6 spec).
 */
export default function MaidForm({
  mode,
  action,
  initial,
  publishGaps,
  fileWarnings,
}: {
  mode: "create" | "edit";
  action: (prev: MaidFormState, formData: FormData) => Promise<MaidFormState>;
  initial?: AdminMaidDetail;
  publishGaps?: string;
  fileWarnings?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const attempt = state?.attempt ?? 0;

  // Bring the problems into view after each failed save (the submit button is far from the top).
  useEffect(() => {
    if (attempt > 0) summaryRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [attempt]);

  const values = state?.values;
  const fieldErrors = state?.fieldErrors ?? {};
  /** What a field should show: what was just typed if a save failed, else the saved profile. */
  const val = (name: string, fallback: string | number | null | undefined = ""): string => {
    const typed = values?.[name];
    return typeof typed === "string" ? typed : fallback == null ? "" : String(fallback);
  };
  const err = (name: string) =>
    fieldErrors[name] ? (
      <p className="field-error" id={`${name}-error`} role="alert">
        {fieldErrors[name]}
      </p>
    ) : null;
  const bad = (name: string) => (fieldErrors[name] ? { "aria-invalid": true, "aria-describedby": `${name}-error` } : {});

  return (
    // key: remount on every failed save so each input starts from the values just submitted.
    <form key={attempt} action={formAction} className="admin-form">
      {state && (state.errorList.length > 0 || state.message) && (
        <div ref={summaryRef} className="form-notice form-notice--error" role="alert">
          {state.message && <p style={{ margin: 0 }}>{state.message}</p>}
          {state.errorList.length > 0 && (
            <>
              <strong>
                {state.errorList.length === 1
                  ? "1 thing needs fixing before this can be saved:"
                  : `${state.errorList.length} things need fixing before this can be saved:`}
              </strong>
              <ul className="form-notice__list">
                {state.errorList.map((e) => (
                  <li key={e.label}>
                    <strong>{e.label}:</strong> {e.message}
                  </li>
                ))}
              </ul>
            </>
          )}
          <p style={{ margin: "6px 0 0", fontWeight: 400 }}>
            Nothing was saved.
            {state.filesDropped ? " Please choose the photo / PDF again — browsers can't keep selected files." : ""}
          </p>
        </div>
      )}
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
            <input type="text" id="profileCode" name="profileCode" required defaultValue={val("profileCode", initial?.profileCode)} placeholder="DV155" {...bad("profileCode")} />
            {err("profileCode")}
          </div>
          <div className="admin-field">
            <label htmlFor="name">Name <span className="hint">(required)</span></label>
            <input type="text" id="name" name="name" required defaultValue={val("name", initial?.name)} {...bad("name")} />
            {err("name")}
          </div>
          <div className="admin-field">
            <label htmlFor="dateOfBirth">Date of Birth <span className="hint">(dd/mm/yyyy — age is calculated automatically)</span></label>
            <DateOfBirthField
              defaultIso={initial?.dateOfBirth ?? null}
              defaultText={typeof values?.dateOfBirth === "string" ? values.dateOfBirth : undefined}
              invalid={!!fieldErrors.dateOfBirth}
            />
            {err("dateOfBirth")}
          </div>
          <div className="admin-field">
            <label>Country / Nationality</label>
            <input type="text" value="Indonesian" disabled />
            <span className="hint">All current helpers are from Indonesia.</span>
          </div>
          <div className="admin-field">
            <label htmlFor="maidType">Maid Type <span className="hint">(required)</span></label>
            <select id="maidType" name="maidType" required defaultValue={val("maidType", initial?.maidType)} {...bad("maidType")}>
              <option value="" disabled>Select…</option>
              {MAID_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {err("maidType")}
          </div>
          <div className="admin-field">
            <label htmlFor="maritalStatus">Marital Status</label>
            <select id="maritalStatus" name="maritalStatus" defaultValue={val("maritalStatus", initial?.maritalStatus)} {...bad("maritalStatus")}>
              <option value="">Not Provided</option>
              {MARITAL_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {err("maritalStatus")}
          </div>
          <div className="admin-field admin-field--full">
            <label htmlFor="languages">Languages</label>
            <input
              type="text"
              id="languages"
              name="languages"
              defaultValue={val("languages", initial?.languages.join(", "))}
              placeholder="e.g. Bahasa Indonesia, English"
              {...bad("languages")}
            />
            {err("languages")}
            <span className="hint">
              Comma-separated. Never inferred from nationality — leave blank if the source biodata doesn&apos;t state
              one. Spelling variants (e.g. &quot;Bahasa&quot;) are normalized to one canonical value automatically.
            </span>
          </div>
          <div className="admin-field">
            <label htmlFor="heightCm">Height (cm)</label>
            <input type="number" id="heightCm" name="heightCm" min={1} defaultValue={val("heightCm", initial?.heightCm)} {...bad("heightCm")} />
            {err("heightCm")}
          </div>
          <div className="admin-field">
            <label htmlFor="weightKg">Weight (kg)</label>
            <input type="number" id="weightKg" name="weightKg" min={1} defaultValue={val("weightKg", initial?.weightKg)} {...bad("weightKg")} />
            {err("weightKg")}
          </div>
          <div className="admin-field">
            <label htmlFor="yearsExperience">Years of Experience</label>
            <input type="number" id="yearsExperience" name="yearsExperience" min={0} step="any" inputMode="decimal" defaultValue={val("yearsExperience", initial?.yearsExperience)} placeholder="e.g. 2 or 2.5" {...bad("yearsExperience")} />
            {err("yearsExperience")}
            <span className="hint">Decimals allowed (e.g. 2.5). This is not a substitute for detailed Employment History below.</span>
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
                defaultChecked={
                  Array.isArray(values?.expertise)
                    ? values.expertise.includes(o.value)
                    : initial?.expertise.includes(o.value as ExpertiseOptionValue)
                }
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
                <input type="text" id={`eh-country-${i}`} name={`employmentHistory.${i}.country`} defaultValue={val(`employmentHistory.${i}.country`, row?.country)} {...bad(`employmentHistory.${i}.country`)} />
                {err(`employmentHistory.${i}.country`)}
              </div>
              <div className="admin-field">
                <label htmlFor={`eh-start-${i}`}>Start Year</label>
                <input type="number" id={`eh-start-${i}`} name={`employmentHistory.${i}.startYear`} defaultValue={val(`employmentHistory.${i}.startYear`, row?.startYear)} {...bad(`employmentHistory.${i}.startYear`)} />
                {err(`employmentHistory.${i}.startYear`)}
              </div>
              <div className="admin-field">
                <label htmlFor={`eh-end-${i}`}>End Year <span className="hint">(year, or Current / Now)</span></label>
                <input type="text" id={`eh-end-${i}`} name={`employmentHistory.${i}.endYear`} defaultValue={val(`employmentHistory.${i}.endYear`, row?.endYear)} maxLength={30} placeholder="e.g. 2025 or Current" {...bad(`employmentHistory.${i}.endYear`)} />
                {err(`employmentHistory.${i}.endYear`)}
              </div>
              <div className="admin-field">
                <label htmlFor={`eh-duties-${i}`}>Duties / Short description</label>
                <input type="text" id={`eh-duties-${i}`} name={`employmentHistory.${i}.duties`} defaultValue={val(`employmentHistory.${i}.duties`, row?.duties)} {...bad(`employmentHistory.${i}.duties`)} />
                {err(`employmentHistory.${i}.duties`)}
              </div>
            </div>
          );
        })}
      </section>

      {/* SECTION D — Profile Photo */}
      <section>
        <h3>Profile Photo</h3>
        <div className="admin-field">
          <label htmlFor="photo">Choose approved image (JPEG, PNG, or WEBP — max {UPLOAD_TOTAL_MAX_LABEL})</label>
          <input type="file" id="photo" name="photo" accept="image/jpeg,image/png,image/webp" />
          {initial?.hasPhoto && <p className="admin-current-file">✓ A photo is currently on file. Uploading a new one replaces it.</p>}
          <span className="hint">Required before this profile can be published (set to Active). The photo and PDF together must be under {UPLOAD_TOTAL_MAX_LABEL} per save.</span>
        </div>
      </section>

      {/* SECTION E — Biodata PDF */}
      <section>
        <h3>Biodata PDF</h3>
        <div className="admin-field">
          <label htmlFor="biodataPdf">Original biodata document (PDF only — max {UPLOAD_TOTAL_MAX_LABEL})</label>
          <input type="file" id="biodataPdf" name="biodataPdf" accept="application/pdf" />
          {initial?.hasBiodata && <p className="admin-current-file">✓ A biodata PDF is currently on file. Uploading a new one replaces it.</p>}
          <span className="hint">Required before this profile can be published (set to Active). The photo and PDF together must be under {UPLOAD_TOTAL_MAX_LABEL} per save.</span>
        </div>
        <UploadSizeGuard />
      </section>

      {/* SECTION F/G — Status */}
      <section>
        <h3>Status</h3>
        <div className="admin-form__grid">
          <div className="admin-field">
            <label htmlFor="profileStatus">Profile Status</label>
            <select id="profileStatus" name="profileStatus" defaultValue={val("profileStatus", initial?.profileStatus ?? "DRAFT")} {...bad("profileStatus")}>
              {PROFILE_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="hint">New profiles start as Draft — creating a profile never publishes it automatically.</span>
          </div>
          <div className="admin-field">
            <label htmlFor="availabilityStatus">Availability Status</label>
            <select id="availabilityStatus" name="availabilityStatus" defaultValue={val("availabilityStatus", initial?.availabilityStatus ?? "UNAVAILABLE")} {...bad("availabilityStatus")}>
              {AVAILABILITY_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </section>

      <div className="btns">
        <button type="submit" className="btn btn--primary" disabled={isPending}>
          {isPending ? "Saving…" : mode === "create" ? "Submit" : "Save Changes"}
        </button>
        {mode === "edit" && initial && (
          <a href={`/admin/maids/${initial.id}`} className="btn btn--outline" target="_blank" rel="noopener noreferrer">
            Preview Employer Profile
          </a>
        )}
      </div>
    </form>
  );
}
