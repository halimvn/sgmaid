"use client";

import { useActionState } from "react";
import { submitAccountSetup, type SetupPasswordState } from "@/app/setup-password/actions";

const initialState: SetupPasswordState = { error: null };

/**
 * Account-setup password form — Phase 2. Client-side `minLength`/
 * `required` give instant feedback; the Server Action
 * (submitAccountSetup → completeAccountSetup) re-validates everything
 * server-side regardless, which is what's actually enforced.
 */
export default function SetupPasswordForm({ token, minLength }: { token: string; minLength: number }) {
  const [state, formAction, pending] = useActionState(submitAccountSetup, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="token" value={token} />

      {state.error && (
        <p className="form-notice form-notice--error" role="alert">
          {state.error}
        </p>
      )}

      <div className="field">
        <label htmlFor="setup-password">New password</label>
        <input
          id="setup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={minLength}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="setup-confirm">Confirm password</label>
        <input
          id="setup-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={minLength}
          required
        />
      </div>
      <p style={{ fontSize: ".8rem", color: "var(--ink-45)", marginTop: -8, marginBottom: 16 }}>
        At least {minLength} characters — a longer passphrase works great too. No symbol/number/uppercase required.
      </p>

      <button className="btn btn--primary btn--block" type="submit" disabled={pending}>
        {pending ? "Setting up…" : "Set password"}
      </button>
    </form>
  );
}
