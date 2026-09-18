"use client";

import { useActionState } from "react";
import { changePasswordAction, type ChangePasswordState } from "@/app/dashboard/account/actions";

const initialState: ChangePasswordState = { error: null, fieldErrors: {} };

/**
 * Change Password form — Phase 7. On success the Server Action signs
 * the current session out and redirects to /login itself (see
 * app/dashboard/account/actions.ts) — there is no "success" state to
 * render here, the browser navigates away. On failure (validation or a
 * wrong current password), this same mounted form stays in place with
 * whatever was typed still in the DOM.
 */
export default function ChangePasswordForm({ minLength }: { minLength: number }) {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);

  return (
    <form action={formAction}>
      {state.error && (
        <p className="form-notice form-notice--error" role="alert">
          {state.error}
        </p>
      )}

      <div className="field">
        <label htmlFor="acct-current-pw">Current Password</label>
        <input id="acct-current-pw" name="currentPassword" type="password" autoComplete="current-password" required />
        {state.fieldErrors.currentPassword && <span className="field-error">{state.fieldErrors.currentPassword}</span>}
      </div>

      <div className="field">
        <label htmlFor="acct-new-pw">New Password</label>
        <input
          id="acct-new-pw"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={minLength}
          required
        />
        {state.fieldErrors.newPassword && <span className="field-error">{state.fieldErrors.newPassword}</span>}
      </div>

      <div className="field">
        <label htmlFor="acct-confirm-pw">Confirm New Password</label>
        <input
          id="acct-confirm-pw"
          name="confirmNewPassword"
          type="password"
          autoComplete="new-password"
          minLength={minLength}
          required
        />
        {state.fieldErrors.confirmNewPassword && <span className="field-error">{state.fieldErrors.confirmNewPassword}</span>}
      </div>

      <p className="field-hint" style={{ marginBottom: 16 }}>
        At least {minLength} characters — a longer passphrase works great too. Changing your password signs you out
        everywhere, including this session; you&rsquo;ll sign in again with your new password.
      </p>

      <button className="btn btn--primary" type="submit" disabled={pending}>
        {pending ? "Changing…" : "Change Password"}
      </button>
    </form>
  );
}
