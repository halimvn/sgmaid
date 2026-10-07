"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createAdminUserAction, type CreateAdminUserState } from "@/lib/actions/admin/admins";

const initialState: CreateAdminUserState = {
  error: null,
  fieldErrors: {},
  values: { fullName: "", username: "", email: "" },
  success: null,
};

/**
 * Create Staff Account form. A Client Component driven by useActionState for the same
 * reason as CreateClientForm: the one-time success screen shows the just-set password
 * from this request's in-memory state only — never a URL, cookie, or database read-back.
 * Non-password fields are preserved on a validation error; both password fields are
 * left for the admin to re-enter.
 */
export default function CreateAdminUserForm() {
  const [state, formAction, pending] = useActionState(createAdminUserAction, initialState);
  const [copied, setCopied] = useState(false);

  if (state.success) {
    const { fullName, username, password } = state.success;
    return (
      <div className="card" style={{ maxWidth: 560 }}>
        <p className="form-notice form-notice--success">Staff account created.</p>
        <h3 style={{ marginBottom: 4 }}>{fullName}</h3>
        <p className="hint" style={{ marginBottom: 20 }}>
          Copy these credentials now and give them to the new staff member — the password will not be shown again once you
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
        <p className="hint" style={{ margin: "4px 0 0" }}>Sign in at /login with this username and password.</p>
        <div className="btns" style={{ marginTop: 20 }}>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`Username: ${username}\nPassword: ${password}`);
                setCopied(true);
              } catch {
                // Clipboard may be unavailable/denied — the fields above are still selectable.
              }
            }}
          >
            {copied ? "Copied" : "Copy username + password"}
          </button>
          <Link href="/admin/admins" className="btn btn--primary">Done — back to Staff</Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="admin-form" style={{ maxWidth: 560 }}>
      {state.error && <p className="form-notice form-notice--error">{state.error}</p>}

      <div className="admin-field">
        <label htmlFor="af-fullName">Full Name <span className="hint">(required)</span></label>
        <input id="af-fullName" name="fullName" type="text" required defaultValue={state.values.fullName} maxLength={200} />
        {state.fieldErrors.fullName && <span className="field-error">{state.fieldErrors.fullName}</span>}
      </div>

      <div className="admin-field">
        <label htmlFor="af-username">Username <span className="hint">(required, unique — e.g. nurul.staff)</span></label>
        <input id="af-username" name="username" type="text" required defaultValue={state.values.username} maxLength={32} autoComplete="off" />
        {state.fieldErrors.username && <span className="field-error">{state.fieldErrors.username}</span>}
        <span className="hint">Lowercase letters, numbers, and . _ - only. Not case-sensitive.</span>
      </div>

      <div className="admin-field">
        <label htmlFor="af-password">Password <span className="hint">(required — at least 10 characters)</span></label>
        <input id="af-password" name="password" type="text" required autoComplete="off" />
        {state.fieldErrors.password && <span className="field-error">{state.fieldErrors.password}</span>}
      </div>

      <div className="admin-field">
        <label htmlFor="af-confirmPassword">Confirm Password <span className="hint">(required)</span></label>
        <input id="af-confirmPassword" name="confirmPassword" type="text" required autoComplete="off" />
        {state.fieldErrors.confirmPassword && <span className="field-error">{state.fieldErrors.confirmPassword}</span>}
      </div>

      <div className="admin-field">
        <label htmlFor="af-email">Email address (optional contact)</label>
        <input id="af-email" name="email" type="email" defaultValue={state.values.email} maxLength={255} />
        {state.fieldErrors.email && <span className="field-error">{state.fieldErrors.email}</span>}
        <span className="hint">They can also sign in with this email, if you add one.</span>
      </div>

      <p className="hint" style={{ marginBottom: 16 }}>
        Staff can create and manage maids and clients, but cannot create or manage other staff accounts.
      </p>

      <div className="btns">
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? "Creating…" : "Create Staff Account"}
        </button>
      </div>
    </form>
  );
}
