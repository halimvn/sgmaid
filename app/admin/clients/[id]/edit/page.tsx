import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/services/admin/clients";
import { CLIENT_STATUS_OPTIONS } from "@/lib/validation/client";
import { updateClientDetailsAction, resetClientPasswordAction, extendClientAccessAction } from "@/lib/actions/admin/clients";
import { formatSgDateTime } from "@/lib/format-sgt";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string; extended?: string; passwordReset?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const client = await getClient(id);
  return { title: client ? `Manage ${client.fullName} — SG Maid Admin` : "Manage Client — SG Maid Admin" };
}

const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_FAILED: "Please check the form — some fields are missing or invalid.",
  NOT_FOUND: "This client could not be found.",
};

/**
 * /admin/clients/[id]/edit — Phase 8. Three independent, plain
 * server-rendered forms (no client JS) — Basic Details, Reset Password,
 * Extend Access — each its own Server Action, matching this project's
 * established admin form convention (see components/admin/MaidForm.tsx).
 * None of these fields are secret at rest here the way the just-created
 * password is (see CreateClientForm.tsx) — a redirect-with-query-string
 * status banner is safe for all three.
 */
export default async function EditClientPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { error, saved, extended, passwordReset } = await searchParams;

  const client = await getClient(id);
  if (!client) notFound();

  const boundUpdateDetails = updateClientDetailsAction.bind(null, id);
  const boundResetPassword = resetClientPasswordAction.bind(null, id);
  const boundExtendAccess = extendClientAccessAction.bind(null, id);

  return (
    <section className="sec-admin">
      <div className="wrap-admin">
        <h1>Manage Client</h1>
        <p style={{ color: "var(--ink-70)", marginTop: 8, marginBottom: 24 }}>
          Username · {client.username}
        </p>

        {error && <p className="form-notice form-notice--error">{ERROR_MESSAGES[error] ?? "Something went wrong. Please try again."}</p>}
        {saved && !error && <p className="form-notice form-notice--success">Client details saved.</p>}
        {extended && !error && <p className="form-notice form-notice--success">Access extended. New expiry: {formatSgDateTime(client.accessExpiresAt)}.</p>}
        {passwordReset && !error && <p className="form-notice form-notice--success">Password reset. The client&apos;s previous sessions have been signed out — give them the new password.</p>}

        <form action={boundUpdateDetails} className="admin-form" style={{ maxWidth: 560 }}>
          <section>
            <h3>Basic Details</h3>
            <div className="admin-field">
              <label htmlFor="ef-fullName">Client Name <span className="hint">(required)</span></label>
              <input id="ef-fullName" name="fullName" type="text" required defaultValue={client.fullName} maxLength={200} />
            </div>
            <div className="admin-field">
              <label htmlFor="ef-mobileNumber">Mobile Number</label>
              <input id="ef-mobileNumber" name="mobileNumber" type="tel" defaultValue={client.mobileNumber ?? ""} maxLength={30} />
            </div>
            <div className="admin-field">
              <label htmlFor="ef-email">Email address (optional contact only)</label>
              <input id="ef-email" name="email" type="email" defaultValue={client.email ?? ""} maxLength={255} />
            </div>
            <div className="admin-field">
              <label htmlFor="ef-status">Status</label>
              <select id="ef-status" name="status" defaultValue={client.status === "PENDING" ? "ACTIVE" : client.status}>
                {CLIENT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="hint">Suspended blocks login immediately, even if the 3-day access window hasn&apos;t passed.</span>
            </div>
          </section>
          <div className="btns">
            <button type="submit" className="btn btn--primary">Save Changes</button>
          </div>
        </form>

        <div className="admin-form" style={{ maxWidth: 560, marginTop: 8 }}>
          <section>
            <h3>Access</h3>
            <p className="hint" style={{ marginBottom: 12 }}>
              Access expires: <strong>{formatSgDateTime(client.accessExpiresAt)}</strong>
            </p>
            <form action={boundExtendAccess}>
              <button type="submit" className="btn btn--secondary">Extend Access by 3 Days</button>
            </form>
          </section>
        </div>

        <form action={boundResetPassword} className="admin-form" style={{ maxWidth: 560, marginTop: 8 }}>
          <section>
            <h3>Reset / Set New Password</h3>
            <p className="hint" style={{ marginBottom: 12 }}>
              Setting a new password immediately signs the client out of any device they&apos;re currently logged in
              on.
            </p>
            <div className="admin-field">
              <label htmlFor="ef-newPassword">New Password <span className="hint">(required)</span></label>
              <input id="ef-newPassword" name="newPassword" type="text" required autoComplete="off" />
            </div>
            <div className="admin-field">
              <label htmlFor="ef-confirmNewPassword">Confirm New Password <span className="hint">(required)</span></label>
              <input id="ef-confirmNewPassword" name="confirmNewPassword" type="text" required autoComplete="off" />
            </div>
          </section>
          <div className="btns">
            <button type="submit" className="btn btn--secondary">Set New Password</button>
          </div>
        </form>
      </div>
    </section>
  );
}
