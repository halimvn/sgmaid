import type { Metadata } from "next";
import CreateAdminUserForm from "@/components/admin/CreateAdminUserForm";
import { requireFullAdmin } from "@/lib/auth/authorize";

export const metadata: Metadata = { title: "Create Staff Account — SG Maid Admin" };

export default async function CreateStaffAccountPage() {
  // This page renders a form without calling a service, so guard it directly: STAFF are sent back
  // to the admin home. (Submitting is also refused server-side by createStaffUser().)
  await requireFullAdmin();

  return (
    <section className="sec-admin">
      <div className="wrap-admin">
        <h1>Create Staff Account</h1>
        <p style={{ color: "var(--ink-70)", marginTop: 8, marginBottom: 24 }}>
          Create a login for a new staff member. They sign in at /login with the username and password you set here, and can
          create and manage maids and clients — but not other staff accounts.
        </p>
        <CreateAdminUserForm />
      </div>
    </section>
  );
}
