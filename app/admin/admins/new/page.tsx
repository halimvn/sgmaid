import type { Metadata } from "next";
import CreateAdminUserForm from "@/components/admin/CreateAdminUserForm";

export const metadata: Metadata = { title: "Create Staff Account — SG Maid Admin" };

export default function CreateStaffAccountPage() {
  return (
    <section className="sec-admin">
      <div className="wrap-admin">
        <h1>Create Staff Account</h1>
        <p style={{ color: "var(--ink-70)", marginTop: 8, marginBottom: 24 }}>
          Create a login for another SG Maid admin. They sign in at /login with the username and password you set here.
        </p>
        <CreateAdminUserForm />
      </div>
    </section>
  );
}
