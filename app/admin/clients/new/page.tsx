import type { Metadata } from "next";
import CreateClientForm from "@/components/admin/CreateClientForm";

export const metadata: Metadata = { title: "Create Client Access — SG Maid Admin" };

export default function CreateClientPage() {
  return (
    <section className="sec-admin">
      <div className="wrap-admin">
        <h1>Create Client Access</h1>
        <p style={{ color: "var(--ink-70)", marginTop: 8, marginBottom: 24 }}>
          Set a username and temporary password for a client. Access starts immediately and expires automatically in
          3 days unless extended.
        </p>
        <CreateClientForm />
      </div>
    </section>
  );
}
