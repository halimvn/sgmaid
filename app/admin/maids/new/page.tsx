import type { Metadata } from "next";
import MaidForm from "@/components/admin/MaidForm";
import { createMaidAction } from "@/lib/actions/admin/maids";

export const metadata: Metadata = { title: "Add New Maid — SG Maid Admin" };

export default function AddNewMaidPage() {
  return (
    <section className="sec-admin">
      <div className="wrap-admin">
        <h1>Add New Maid</h1>
        <p style={{ color: "var(--ink-70)", marginTop: 8, marginBottom: 24 }}>
          Enter the structured short-profile information the website needs. The original biodata PDF remains the
          source of truth for full detail — this form does not reproduce it.
        </p>
        <MaidForm mode="create" action={createMaidAction} />
      </div>
    </section>
  );
}
