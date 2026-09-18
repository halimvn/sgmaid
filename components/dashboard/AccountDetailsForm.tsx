"use client";

import { useActionState, useState } from "react";
import { updateProfileAction, type UpdateProfileState } from "@/app/dashboard/account/actions";

const initialState: UpdateProfileState = { error: null, fieldErrors: {}, success: false };

/**
 * Personal Details form — Phase 7. Full Name and Mobile Number are
 * editable; Email is read-only (see Step "EMAIL ADDRESS" — changing
 * login email needs uniqueness/verification work not in scope here).
 *
 * Full Name/Mobile Number are deliberately CONTROLLED inputs backed by
 * local useState, seeded once from the server-rendered props rather
 * than re-derived from them on every render. An uncontrolled
 * defaultValue input was tried first and found NOT to reliably survive
 * a validation-error round trip here: a Server Action driven through
 * useActionState also causes the parent Server Component to revalidate,
 * and that refresh can reset an uncontrolled input's DOM value back to
 * the last-saved prop — exactly the "form gets reset" bug Step 4
 * explicitly forbids. Local state sidesteps that entirely: nothing but
 * the user's own typing (or a successful save) ever changes what's
 * displayed.
 */
export default function AccountDetailsForm({
  fullName,
  email,
  mobileNumber,
}: {
  fullName: string;
  email: string;
  mobileNumber: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);
  const [nameValue, setNameValue] = useState(fullName);
  const [mobileValue, setMobileValue] = useState(mobileNumber ?? "");

  return (
    <form action={formAction}>
      {state.success && (
        <p className="form-notice form-notice--success" role="status">
          Account details updated successfully.
        </p>
      )}
      {state.error && (
        <p className="form-notice form-notice--error" role="alert">
          {state.error}
        </p>
      )}

      <div className="field">
        <label htmlFor="acct-name">Full Name</label>
        <input
          id="acct-name"
          name="fullName"
          type="text"
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          maxLength={200}
          required
        />
        {state.fieldErrors.fullName && <span className="field-error">{state.fieldErrors.fullName}</span>}
      </div>

      <div className="field">
        <label htmlFor="acct-email">Email Address</label>
        <input id="acct-email" type="email" value={email} disabled readOnly />
        <span className="field-hint">Used for your SG Maid account login.</span>
      </div>

      <div className="field">
        <label htmlFor="acct-mobile">Mobile Number</label>
        <input
          id="acct-mobile"
          name="mobileNumber"
          type="tel"
          value={mobileValue}
          onChange={(e) => setMobileValue(e.target.value)}
          placeholder="+65 9123 4567"
          maxLength={30}
        />
        {state.fieldErrors.mobileNumber && <span className="field-error">{state.fieldErrors.mobileNumber}</span>}
      </div>

      <button className="btn btn--primary" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save Changes"}
      </button>
    </form>
  );
}
