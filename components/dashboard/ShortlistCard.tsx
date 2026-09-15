import Link from "next/link";
import Image from "next/image";
import type { ShortlistItem } from "@/lib/services/shortlist";
import { removeMaidFromShortlist } from "@/lib/actions/shortlist";

/**
 * Shortlist entry card — Phase 4. Reuses MaidCard's `.pcard` visual
 * treatment for consistency rather than introducing a new card design.
 *
 * When `maid.visible` is false (the underlying profile went DRAFT/
 * INACTIVE, or its availability moved to PLACED/UNAVAILABLE since it was
 * shortlisted — see lib/services/shortlist.ts), this deliberately does
 * NOT link to /dashboard/maids/[id] and does not render nationality/age/
 * experience/skills — the DTO already nulled those out; this component
 * just doesn't invent a link Phase 3's visibility rule wouldn't allow.
 */
export default function ShortlistCard({ maid }: { maid: ShortlistItem }) {
  const removeAction = removeMaidFromShortlist.bind(null, maid.maidId);

  return (
    <div className="pcard">
      <div className="photo">
        {maid.visible && maid.photoUrl ? (
          <Image
            src={maid.photoUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            style={{ objectFit: "cover" }}
            // See MaidCard.tsx — photoUrl may be an authenticated,
            // cookie-gated route rather than a static asset (Phase 4.6.2).
            unoptimized
          />
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
          <span className={maid.visible ? "chip chip--orange" : "chip chip--muted"}>{maid.availabilityLabel}</span>
        </div>
        <span className="cid">Candidate ID · {maid.profileCode}</span>

        {maid.visible ? (
          <>
            <div className="row"><span>Nationality</span><span>{maid.nationality}</span></div>
            <div className="row"><span>Age</span><span>{maid.age ?? "—"}</span></div>
            <div className="row"><span>Experience</span><span>{maid.yearsExperience} yrs</span></div>
            <div className="row">
              <span>Key skills</span>
              <span>{maid.skills.length > 0 ? maid.skills.join(", ") : "—"}</span>
            </div>
          </>
        ) : (
          <p style={{ fontSize: "0.85rem", color: "var(--ink-45)", padding: "10px 0" }}>
            This candidate is no longer available. You can remove them from your shortlist.
          </p>
        )}

        <div className="btns">
          {maid.visible && (
            <Link className="btn btn--secondary btn--sm btn--block" href={`/dashboard/maids/${maid.maidId}`}>
              View Profile
            </Link>
          )}
          <form action={removeAction} style={{ flex: 1 }}>
            <button type="submit" className="btn btn--outline btn--sm btn--block">
              Remove
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
