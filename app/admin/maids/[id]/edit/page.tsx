import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MaidForm from "@/components/admin/MaidForm";
import { getAdminMaid } from "@/lib/services/admin/maids";
import { updateMaidAction } from "@/lib/actions/admin/maids";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string; publishGaps?: string; fileWarnings?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const maid = await getAdminMaid(id);
  return { title: maid ? `Edit ${maid.name} — SG Maid Admin` : "Edit Maid — SG Maid Admin" };
}

export default async function EditMaidPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { error, saved, publishGaps, fileWarnings } = await searchParams;

  const maid = await getAdminMaid(id);
  if (!maid) notFound();

  const boundAction = updateMaidAction.bind(null, id);

  return (
    <section className="sec-admin">
      <div className="wrap-admin">
        <h1>Edit Maid</h1>
        <p style={{ color: "var(--ink-70)", marginTop: 8, marginBottom: 24 }}>
          Candidate ID · {maid.profileCode}
        </p>
        {saved && !error && !publishGaps && <p className="form-notice form-notice--success">Saved.</p>}
        <MaidForm mode="edit" action={boundAction} initial={maid} errorCode={error} publishGaps={publishGaps} fileWarnings={fileWarnings} />
      </div>
    </section>
  );
}
