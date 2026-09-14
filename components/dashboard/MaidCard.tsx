import Link from "next/link";
import Image from "next/image";
import type { EmployerMaidListItem } from "@/lib/services/maids";
import { addMaidToShortlist, removeMaidFromShortlist } from "@/lib/actions/shortlist";

const AVAILABILITY_LABEL: Record<EmployerMaidListItem["availabilityStatus"], string> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
};

/**
 * Helper/maid profile card for the dashboard listing — Phase 3: now
 * consumes the employer-safe listing DTO (lib/services/maids.ts)
 * instead of the mock/placeholder shape. Visual design preserved exactly
 * from Phase 0; only the data plumbing changed (age/years now render
 * real values instead of the "[Age]"/"[Years]" placeholder text).
 *
 * Phase 4: the "Shortlist" button is now a real Server Action, and
 * `isShortlisted` (passed by the listing page from one batched
 * getShortlistedMaidIds() query — never a per-card lookup) drives its
 * label/style. Still a Server Component — no client JS is required for
 * the button to work.
 */
export default function MaidCard({ maid, isShortlisted }: { maid: EmployerMaidListItem; isShortlisted: boolean }) {
  const action = isShortlisted ? removeMaidFromShortlist.bind(null, maid.id) : addMaidToShortlist.bind(null, maid.id);

  return (
    <div className="pcard">
      <div className="photo">
        {maid.photoUrl ? (
          <Image src={maid.photoUrl} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" style={{ objectFit: "cover" }} />
        ) : (
          <div className="photo__inner">
            <svg viewBox="0 0 24 24"><use href="#i-user" /></svg>
            <span className="photo__cap">Photo</span>
          </div>
        )}
      </div>
      <div className="body">
        <div className="top">
          <span className="name">{maid.name}</span>
          <span className="chip chip--orange">{AVAILABILITY_LABEL[maid.availabilityStatus]}</span>
        </div>
        <span className="cid">Candidate ID · {maid.profileCode}</span>
        <div className="row"><span>Nationality</span><span>{maid.nationality}</span></div>
        <div className="row"><span>Age</span><span>{maid.age ?? "—"}</span></div>
        <div className="row"><span>Experience</span><span>{maid.yearsExperience} yrs</span></div>
        <div className="row">
          <span>Key skills</span>
          <span>{maid.skills.length > 0 ? maid.skills.join(", ") : "—"}</span>
        </div>
        <div className="btns">
          <Link className="btn btn--secondary btn--sm btn--block" href={`/dashboard/maids/${maid.id}`}>
            View Profile
          </Link>
          <form action={action} style={{ flex: 1 }}>
            <button type="submit" className={`btn btn--sm btn--block ${isShortlisted ? "btn--outline" : "btn--primary"}`}>
              {isShortlisted ? "✓ Shortlisted" : "Shortlist"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
