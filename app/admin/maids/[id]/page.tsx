import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminMaid } from "@/lib/services/admin/maids";
import MaidShortProfileCard from "@/components/MaidShortProfileCard";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const maid = await getAdminMaid(id);
  return { title: maid ? `Preview: ${maid.name} — SG Maid Admin` : "Preview — SG Maid Admin" };
}

/**
 * Admin "Preview Employer Profile" — Phase 6 Step 12.
 *
 * Renders the exact same short-profile card an employer would see
 * (components/MaidShortProfileCard.tsx — shared, not duplicated), fed
 * by an admin-authorized fetch that has no visibility restriction (a
 * DRAFT profile must be previewable before it's ever publishable). This
 * is intentionally NOT the employer route: getEmployerVisibleMaidProfile()
 * requires requireEmployer() + ACTIVE/AVAILABLE-or-RESERVED, which would
 * reject an admin session outright and can never show a DRAFT profile —
 * exactly the case this page exists for.
 *
 * The photo/biodata buttons point at admin-gated routes
 * (./photo, ./biodata) — same private-Storage, signed-URL-on-demand
 * pattern as the employer ones, just authorized by requireAdmin()
 * instead, since an admin previewing a DRAFT has no employer-visibility
 * status to check.
 */
export default async function AdminMaidPreviewPage({ params }: Props) {
  const { id } = await params;
  const maid = await getAdminMaid(id);
  if (!maid) notFound();

  return (
    <section className="sec-admin">
      <div className="wrap-admin">
        <div className="btn-row" style={{ marginBottom: 20 }}>
          <Link className="btn btn--secondary btn--sm" href={`/admin/maids/${maid.id}/edit`}>← Back to Edit</Link>
        </div>
        <p className="form-notice form-notice--warning" style={{ maxWidth: 420, margin: "0 auto 20px" }}>
          Admin preview — this shows exactly what an employer would see. Profile Status: <strong>{maid.profileStatus}</strong>,
          Availability: <strong>{maid.availabilityStatus}</strong>.
        </p>

        <MaidShortProfileCard
          fields={{
            photoUrl: maid.hasPhoto ? `/admin/maids/${maid.id}/photo` : null,
            profileCode: maid.profileCode,
            name: maid.name,
            availabilityStatus: maid.availabilityStatus,
            nationality: maid.nationality,
            maidType: maid.maidType,
            maritalStatus: maid.maritalStatus,
            languages: maid.languages,
            expertise: maid.expertise.map((e) => EXPERTISE_LABELS[e] ?? e),
            age: maid.age,
            yearsExperience: maid.yearsExperience,
            heightCm: maid.heightCm,
            weightKg: maid.weightKg,
          }}
          actions={
            maid.hasBiodata ? (
              <a
                className="btn btn--secondary"
                href={`/admin/maids/${maid.id}/biodata`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Biodata PDF
              </a>
            ) : undefined
          }
        />
      </div>
    </section>
  );
}

const EXPERTISE_LABELS: Record<string, string> = {
  cooking: "Cooking",
  eldercare: "Eldercare",
  childcare: "Childcare",
  infantcare: "Infantcare",
  "general-housekeeping": "General Housekeeping",
  "care-of-disabled": "Care of Disabled",
};
