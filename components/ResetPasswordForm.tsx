"use client";

import { useActionState } from "react";
import { submitPasswordReset, type ResetPasswordState } from "@/app/reset-password/actions";

const initialState: ResetPasswordState = { error: null };

export default function ResetPasswordForm({ token, minLength }: { token: string; minLength: number }) {
  const [state, formAction, pending] = useActionState(submitPasswordReset, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="token" value={token} />

      {state.error && (
        <p className="form-notice form-notice--error" role="alert">
          {state.error}
        </p>
      )}

      <div className="field">
        <label htmlFor="reset-password">New password</label>
        <input
          id="reset-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={minLength}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="reset-confirm">Confirm password</label>
        <input
          id="reset-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={minLength}
          required
        />
      </div>
      <p style={{ fontSize: ".8rem", color: "var(--ink-45)", marginTop: -8, marginBottom: 16 }}>
        At least {minLength} characters. This will sign you out everywhere else.
      </p>

      <button className="btn btn--primary btn--block" type="submit" disabled={pending}>
        {pending ? "Resetting…" : "Reset password"}
      </button>
    </form>
  );
}
