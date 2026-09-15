import type { Metadata } from "next";
import MaidForm from "@/components/admin/MaidForm";
import { createMaidAction } from "@/lib/actions/admin/maids";

export const metadata: Metadata = { title: "Add New Maid — SG Maid Admin" };

export default async function AddNewMaidPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { error } = await searchParams;

  return (
    <section className="sec-admin">
      <div className="wrap-admin">
        <h1>Add New Maid</h1>
        <p style={{ color: "var(--ink-70)", marginTop: 8, marginBottom: 24 }}>
          Enter the structured short-profile information the website needs. The original biodata PDF remains the
          source of truth for full detail — this form does not reproduce it.
        </p>
        <MaidForm mode="create" action={createMaidAction} errorCode={error} />
      </div>
    </section>
  );
}
