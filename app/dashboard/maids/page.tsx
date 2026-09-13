import type { Metadata } from "next";
import MaidCard from "@/components/dashboard/MaidCard";
import { MOCK_MAIDS } from "@/lib/data/mock-maids";

export const metadata: Metadata = { title: "Browse Helpers — SG Maid Employer Portal" };

export default function MaidsListingPage() {
  return (
    <section className="sec-dash" style={{ paddingTop: 24 }}>
      <div className="wrap-dash">
        <div className="dash">
          {/* SIDEBAR — search + filters, moved to the left per the client's request */}
          <aside className="sidebar">
            <div className="note-chip">
              <svg viewBox="0 0 24 24"><use href="#i-info" /></svg>
              <span>
                To streamline your search, please use the filters available on the left-hand side of the portal. All
                listed helpers are available for interviews with potential employers.
              </span>
            </div>

            <div className="search-field">
              <svg viewBox="0 0 24 24"><use href="#i-search" /></svg>
              <input type="text" placeholder="Search by name or candidate ID" />
            </div>

            <div className="sidebar-divider" />

            <h3>Filters</h3>
            <div className="filter-group">
              <div className="filter-field">
                <label htmlFor="f-nat">Nationality</label>
                <select id="f-nat" defaultValue="All"><option>All</option></select>
              </div>
              <div className="filter-field">
                <label htmlFor="f-age">Age</label>
                <select id="f-age" defaultValue="Any"><option>Any</option></select>
              </div>
              <div className="filter-field">
                <label htmlFor="f-exp">Experience</label>
                <select id="f-exp" defaultValue="Any"><option>Any</option></select>
              </div>
              <div className="filter-field">
                <label htmlFor="f-skl">Skills</label>
                <select id="f-skl" defaultValue="Any"><option>Any</option></select>
              </div>
              <div className="filter-field">
                <label htmlFor="f-avl">Availability</label>
                <select id="f-avl" defaultValue="Any"><option>Any</option></select>
              </div>
            </div>

            <div className="btns" style={{ flexDirection: "column" }}>
              <a className="btn btn--primary btn--block btn--sm" href="#">Apply Filters</a>
              <a className="btn btn--outline btn--block btn--sm" href="#">Clear filters</a>
            </div>
          </aside>

          {/* MAIN LISTING */}
          <div className="main-col">
            <div className="listing-head">
              <h2>Available Helpers</h2>
              <span className="resultcount">[X] helper profiles match your search</span>
            </div>

            <div className="helpers-grid-app">
              {MOCK_MAIDS.map((maid) => (
                <MaidCard key={maid.id} maid={maid} />
              ))}
            </div>

            <div className="note-chip note-inline">
              <svg viewBox="0 0 24 24"><use href="#i-info" /></svg>
              <span>
                &quot;View Profile&quot; opens the full biodata: employment history, specialised skills and the
                One-Day Training Handbook modules completed by the candidate. Helper biodata, photo consent and
                filter logic still to be confirmed — including whether profiles are public or gated behind an
                enquiry.
              </span>
            </div>

            <div className="listing-foot">
              <a className="btn btn--secondary" href="#">Load more helpers</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
