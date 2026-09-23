import type { Metadata } from "next";
import { getEmployerAccount } from "@/lib/services/account";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/constants";
import AccountDetailsForm from "@/components/dashboard/AccountDetailsForm";
import ChangePasswordForm from "@/components/dashboard/ChangePasswordForm";
import AccountStatusCard from "@/components/dashboard/AccountStatusCard";

export const metadata: Metadata = { title: "My Account — SG Maid Employer Portal" };

/**
 * Employer "My Account" — Phase 7. Protected by the existing
 * app/dashboard/layout.tsx requireEmployer() guard, plus every service
 * call below (getEmployerAccount()) independently re-calls
 * requireEmployer() itself — defense in depth, same pattern as every
 * other employer-facing service in this project.
 *
 * Three sections per spec: Personal Details (editable Full Name/Mobile,
 * read-only Email), Security (Change Password), Account (read-only
 * Status + Logout). Deliberately not a general settings system — no
 * account deletion/deactivation, no email change, no role/status
 * controls.
 */
export default async function AccountPage() {
  const account = await getEmployerAccount();

  return (
    <section className="sec-dash">
      <div className="wrap-dash">
        <span className="eyebrow">Employer Account</span>
        <h1>My Account</h1>
        <p className="lead" style={{ marginTop: 10, marginBottom: 28 }}>
          View your account information, update your personal details, and manage your password.
        </p>

        <div className="account-panel">
          <div className="card">
            <h2>Personal Details</h2>
            <AccountDetailsForm
              fullName={account.fullName}
              username={account.username}
              email={account.email}
              mobileNumber={account.mobileNumber}
            />
          </div>

          <div className="card">
            <h2>Security</h2>
            <ChangePasswordForm minLength={PASSWORD_MIN_LENGTH} />
          </div>

          <div className="card">
            <h2>Account</h2>
            <AccountStatusCard statusLabel={account.statusLabel} accessExpiresAt={account.accessExpiresAt} />
          </div>
        </div>
      </div>
    </section>
  );
}
