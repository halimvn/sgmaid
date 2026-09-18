"use client";

import { signOut } from "next-auth/react";

/**
 * Read-only Account Status + Logout — Phase 7. Status is shown as a
 * friendly label (e.g. "Active", never the raw "ACTIVE" enum value —
 * see lib/services/account.ts) and is not editable here: role, status,
 * and sessionVersion remain staff/system-controlled.
 */
export default function AccountStatusCard({ statusLabel }: { statusLabel: string }) {
  return (
    <div>
      <div className="account-status-row">
        <span className="field-hint" style={{ margin: 0 }}>Account Status</span>
        <span className="chip chip--orange">{statusLabel}</span>
      </div>
      <button type="button" className="btn btn--outline" onClick={() => signOut({ callbackUrl: "/login" })}>
        <svg viewBox="0 0 24 24"><use href="#i-logout" /></svg>
        Logout
      </button>
    </div>
  );
}
