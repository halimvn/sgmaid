"use client";

import { signOut } from "next-auth/react";
import { formatSgDateTime } from "@/lib/format-sgt";

/**
 * Read-only Account Status + Logout — Phase 7, revised Phase 8. Status is
 * shown as a friendly label (e.g. "Active", never the raw "ACTIVE" enum
 * value — see lib/services/account.ts) and is not editable here: role,
 * status, sessionVersion, and (Phase 8) accessExpiresAt all remain
 * staff/system-controlled — a client cannot extend their own access.
 */
export default function AccountStatusCard({
  statusLabel,
  accessExpiresAt,
}: {
  statusLabel: string;
  /** ISO timestamp, or null (e.g. an ADMIN account, which has no expiry). */
  accessExpiresAt: string | null;
}) {
  return (
    <div>
      <div className="account-status-row">
        <span className="field-hint" style={{ margin: 0 }}>Account Status</span>
        <span className="chip chip--orange">{statusLabel}</span>
      </div>
      {accessExpiresAt && (
        <div className="account-status-row">
          <span className="field-hint" style={{ margin: 0 }}>Access valid until</span>
          <span>{formatSgDateTime(accessExpiresAt)}</span>
        </div>
      )}
      <button type="button" className="btn btn--outline" onClick={() => signOut({ callbackUrl: "/login" })}>
        <svg viewBox="0 0 24 24"><use href="#i-logout" /></svg>
        Logout
      </button>
    </div>
  );
}
