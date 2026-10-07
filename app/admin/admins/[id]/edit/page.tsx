import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminUser } from "@/lib/services/admin/admins";
import { ADMIN_STATUS_OPTIONS } from "@/lib/validation/admin-user";
import { updateAdminUserStatusAction, resetAdminUserPasswordAction } from "@/lib/actions/admin/admins";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string; passwordReset?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const admin = await getAdminUser(id);
  return { title: admin ? `Manage ${admin.fullName} — SG Maid Admin` : "Manage Staff Account — SG Maid Admin" };
}

const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_FAILED: "Please check the form — some fields are missing or invalid.",
  NOT_FOUND: "This staff account could not be found.",
  CANNOT_DEACTIVATE_SELF: "You can't suspend or deactivate your own account.",
  LAST_ACTIVE_ADMIN: "This is the last active administrator — at least one administrator must stay active so staff accounts can still be managed.",
};

/** /admin/admins/[id]/edit — status and password for one staff account. */
export default async function ManageStaffAccountPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { error, saved, passwordReset } = await searchParams;

  const admin = await getAdminUser(id);
  if (!admin) notFound();

  const boundStatus = updateAdminUserStatusAction.bind(null, id);
  const boundReset = resetAdminUserPasswordAction.bind(null, id);

  return (
    <section className="sec-admin">
      <div className="wrap-admin">
        <h1>Manage Staff Account</h1>
        <p style={{ color: "var(--ink-70)", marginTop: 8, marginBottom: 24 }}>
          {admin.fullName} · {admin.role === "ADMIN" ? "Admin" : "Staff"} · {admin.username ?? admin.email ?? "no username"}
          {admin.isCurrentUser ? " (you)" : ""}
        </p>

        {error && <p className="form-notice form-notice--error">{ERROR_MESSAGES[error] ?? "Something went wrong. Please try again."}</p>}
        {saved && !error && <p className="form-notice form-notice--success">Status saved.</p>}
        {passwordReset && !error && (
          <p className="form-notice form-notice--success">Password reset. Any device this admin was signed in on has been signed out.</p>
        )}

        <form action={boundStatus} className="admin-form" style={{ maxWidth: 560 }}>
          <section>
            <h3>Status</h3>
            <div className="admin-field">
              <label htmlFor="sf-status">Account status</label>
              <select id="sf-status" name="status" defaultValue={admin.status === "PENDING" ? "ACTIVE" : admin.status}>
                {ADMIN_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="hint">
                Suspended and Inactive accounts can&apos;t sign in, and are signed out straight away. You can&apos;t do this to
                your own account, or to the last active administrator.
              </span>
            </div>
          </section>
          <div className="btns">
            <button type="submit" className="btn btn--primary">Save Status</button>
          </div>
        </form>

        <form action={boundReset} className="admin-form" style={{ maxWidth: 560, marginTop: 8 }}>
          <section>
            <h3>Reset / Set New Password</h3>
            <p className="hint" style={{ marginBottom: 12 }}>
              Signs this admin out of every device.
              {admin.isCurrentUser ? " This is your own account, so you will be signed out and asked to log in again." : ""}
            </p>
            <div className="admin-field">
              <label htmlFor="sf-newPassword">New Password <span className="hint">(at least 10 characters)</span></label>
              <input id="sf-newPassword" name="newPassword" type="text" required autoComplete="off" />
            </div>
            <div className="admin-field">
              <label htmlFor="sf-confirmNewPassword">Confirm New Password</label>
              <input id="sf-confirmNewPassword" name="confirmNewPassword" type="text" required autoComplete="off" />
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
