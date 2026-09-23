"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createClientAction, type CreateClientState } from "@/lib/actions/admin/clients";
import { formatSgDateTime } from "@/lib/format-sgt";

const initialState: CreateClientState = {
  error: null,
  fieldErrors: {},
  values: { fullName: "", username: "", mobileNumber: "", email: "" },
  success: null,
};

/**
 * Create Client Access form — Phase 8.
 *
 * A Client Component driven by useActionState, not the admin area's
 * usual plain redirect-based <form action> (compare
 * components/admin/MaidForm.tsx) — deliberately, for one reason: the
 * one-time success screen (Step 11 of the spec) needs to show staff the
 * plaintext password they just set, and the ONLY safe way to do that is
 * to keep it in this component's in-memory state from the very same
 * request that created the account — never round-tripped through a URL,
 * a redirect, a cookie, or read back from the database (the database
 * only ever holds the bcrypt hash). Once this component unmounts
 * (navigating away), the password is gone for good — see
 * lib/services/admin/clients.ts's own header for why that's intentional,
 * not a limitation to work around.
 *
 * On a validation error (e.g. duplicate username), every non-password
 * field the admin typed is preserved via `state.values` — the password
 * and confirm-password fields are deliberately left for the admin to
 * re-enter (see the notice below the fields), rather than being echoed
 * back.
 */
export default function CreateClientForm() {
  const [state, formAction, pending] = useActionState(createClientAction, initialState);
  const [copied, setCopied] = useState(false);

  if (state.success) {
    const { fullName, username, password, accessExpiresAt } = state.success;
    return (
      <div className="card" style={{ maxWidth: 560 }}>
        <p className="form-notice form-notice--success">Client access created.</p>
        <h3 style={{ marginBottom: 4 }}>{fullName}</h3>
        <p className="hint" style={{ marginBottom: 20 }}>
          Copy these credentials now and give them to the client — the password will not be shown again once you
          leave this page.
        </p>

        <div className="admin-field">
          <label>Username</label>
          <input type="text" value={username} readOnly onFocus={(e) => e.currentTarget.select()} />
        </div>
        <div className="admin-field">
          <label>Password</label>
          <input type="text" value={password} readOnly onFocus={(e) => e.currentTarget.select()} />
        </div>
        <div className="admin-field">
          <label>Access expires</label>
          <input type="text" value={formatSgDateTime(accessExpiresAt)} readOnly disabled />
        </div>

        <div className="btns" style={{ marginTop: 20 }}>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`Username: ${username}\nPassword: ${password}`);
                setCopied(true);
              } catch {
                // Clipboard access can be denied/unavailable — the fields above are still selectable/copyable manually.
              }
            }}
          >
            {copied ? "Copied" : "Copy username + password"}
          </button>
          <Link href="/admin/clients" className="btn btn--primary">
            Done — back to Clients
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="admin-form" style={{ maxWidth: 560 }}>
      {state.error && <p className="form-notice form-notice--error">{state.error}</p>}

      <div className="admin-field">
        <label htmlFor="cf-fullName">Client Name <span className="hint">(required)</span></label>
        <input id="cf-fullName" name="fullName" type="text" required defaultValue={state.values.fullName} maxLength={200} />
        {state.fieldErrors.fullName && <span className="field-error">{state.fieldErrors.fullName}</span>}
      </div>

      <div className="admin-field">
        <label htmlFor="cf-username">Username <span className="hint">(required, unique — e.g. ahmadtan)</span></label>
        <input id="cf-username" name="username" type="text" required defaultValue={state.values.username} maxLength={32} autoComplete="off" />
        {state.fieldErrors.username && <span className="field-error">{state.fieldErrors.username}</span>}
        <span className="hint">Lowercase letters, numbers, and . _ - only. Not case-sensitive.</span>
      </div>

      <div className="admin-field">
        <label htmlFor="cf-password">Password <span className="hint">(required — set the client&apos;s temporary password)</span></label>
        <input id="cf-password" name="password" type="text" required autoComplete="off" />
        {state.fieldErrors.password && <span className="field-error">{state.fieldErrors.password}</span>}
      </div>

      <div className="admin-field">
        <label htmlFor="cf-confirmPassword">Confirm Password <span className="hint">(required)</span></label>
        <input id="cf-confirmPassword" name="confirmPassword" type="text" required autoComplete="off" />
        {state.fieldErrors.confirmPassword && <span className="field-error">{state.fieldErrors.confirmPassword}</span>}
      </div>

      <div className="admin-field">
        <label htmlFor="cf-mobileNumber">Mobile Number</label>
        <input id="cf-mobileNumber" name="mobileNumber" type="tel" defaultValue={state.values.mobileNumber} maxLength={30} />
        {state.fieldErrors.mobileNumber && <span className="field-error">{state.fieldErrors.mobileNumber}</span>}
      </div>

      <div className="admin-field">
        <label htmlFor="cf-email">Email address (optional contact only)</label>
        <input id="cf-email" name="email" type="email" defaultValue={state.values.email} maxLength={255} />
        {state.fieldErrors.email && <span className="field-error">{state.fieldErrors.email}</span>}
        <span className="hint">Never used for login — the client always signs in with their username.</span>
      </div>

      <p className="hint" style={{ marginBottom: 16 }}>
        Access will start immediately and expire automatically in 3 days unless extended from Client Management.
      </p>

      <div className="btns">
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? "Creating…" : "Create Client Access"}
        </button>
      </div>
    </form>
  );
}
