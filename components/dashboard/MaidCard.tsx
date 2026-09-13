import Link from "next/link";
import type { MaidProfile } from "@/types/maid";

/**
 * Helper/maid profile card for the dashboard listing.
 * Replaces the six copy-pasted, near-identical HTML blocks from the
 * original static dashboard.html with one component mapped over data.
 */
export default function MaidCard({ maid }: { maid: MaidProfile }) {
  return (
    <div className="pcard">
      <div className="photo">
        <div className="photo__inner">
          <svg viewBox="0 0 24 24"><use href="#i-user" /></svg>
          <span className="photo__cap">Photo</span>
        </div>
      </div>
      <div className="body">
        <div className="top">
          <span className="name">{maid.name}</span>
          <span className="chip chip--orange">Available</span>
        </div>
        <span className="cid">Candidate ID · {maid.candidateCode}</span>
        <div className="row"><span>Nationality</span><span>{maid.nationality}</span></div>
        <div className="row"><span>Age</span><span>[Age]</span></div>
        <div className="row"><span>Experience</span><span>[Years]</span></div>
        <div className="row"><span>Key skills</span><span>{maid.skills.map((s) => s.name).join(", ")}</span></div>
        <div className="btns">
          <Link className="btn btn--secondary btn--sm btn--block" href={`/dashboard/maids/${maid.id}`}>
            View Profile
          </Link>
          <a className="btn btn--primary btn--sm btn--block" href="#">Shortlist</a>
        </div>
      </div>
    </div>
  );
}
