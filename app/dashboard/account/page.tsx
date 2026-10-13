import type { Metadata } from "next";
import { getEmployerAccount } from "@/lib/services/account";
import AccountDetailsForm from "@/components/dashboard/AccountDetailsForm";
import AccountStatusCard from "@/components/dashboard/AccountStatusCard";

export const metadata: Metadata = { title: "My Account — SG Maid Employer Portal" };

/**
 * Employer "My Account" — Phase 7. Protected by the existing
 * app/dashboard/layout.tsx requireEmployer() guard, plus every service
 * call below (getEmployerAccount()) independently re-calls
 * requireEmployer() itself — defense in depth, same pattern as every
 * other employer-facing service in this project.
 *
 * Two sections: Personal Details (editable Full Name/Mobile, read-only Email) and
 * Account (read-only Status + Logout). There is no self-service password change here —
 * staff set and reset client passwords from the admin dashboard. Deliberately not a general settings system — no
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
          View your account information and update your personal details.
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
            <h2>Account</h2>
            <AccountStatusCard statusLabel={account.statusLabel} accessExpiresAt={account.accessExpiresAt} />
          </div>
        </div>
      </div>
    </section>
  );
}
