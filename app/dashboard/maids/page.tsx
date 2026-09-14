import type { Metadata } from "next";
import Link from "next/link";
import MaidCard from "@/components/dashboard/MaidCard";
import { listEmployerVisibleMaids, getEmployerVisibleNationalities } from "@/lib/services/maids";
import { parseMaidFilters, AGE_BUCKETS, EXPERIENCE_BUCKETS, SKILL_CATEGORIES } from "@/lib/validation/maid-filters";

export const metadata: Metadata = { title: "Browse Helpers — SG Maid Employer Portal" };

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Database-driven helper listing — Phase 3.
 *
 * Filter state lives entirely in the URL query string (?nationality=…
 * &skill=…&page=…), submitted via a plain GET <form> — no client JS
 * required, and it's what makes the listing shareable/bookmarkable and
 * safely re-derivable on every request. See lib/services/maids.ts for
 * the actual authorization + query logic; this page only renders.
 */
export default async function MaidsListingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const rawSearchParams = await searchParams;
  const filters = parseMaidFilters(rawSearchParams);

  const [result, nationalities] = await Promise.all([
    listEmployerVisibleMaids(filters),
    getEmployerVisibleNationalities(),
  ]);

  const { items, page, totalCount, totalPages } = result;

  // Preserve every current filter when building a pagination link — only `page` changes.
  function pageHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.nationality) params.set("nationality", filters.nationality);
    if (filters.age) params.set("age", filters.age);
    if (filters.experience) params.set("experience", filters.experience);
    if (filters.skill) params.set("skill", filters.skill);
    if (filters.availability) params.set("availability", filters.availability);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/dashboard/maids?${qs}` : "/dashboard/maids";
  }

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

            <form method="GET" action="/dashboard/maids">
              <div className="search-field">
                <svg viewBox="0 0 24 24"><use href="#i-search" /></svg>
                <input
                  type="text"
                  name="search"
                  placeholder="Search by name or candidate ID"
                  defaultValue={filters.search ?? ""}
                />
              </div>

              <div className="sidebar-divider" />

              <h3>Filters</h3>
              <div className="filter-group">
                <div className="filter-field">
                  <label htmlFor="f-nat">Nationality</label>
                  <select id="f-nat" name="nationality" defaultValue={filters.nationality ?? "All"}>
                    <option value="All">All</option>
                    {nationalities.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="filter-field">
                  <label htmlFor="f-age">Age</label>
                  <select id="f-age" name="age" defaultValue={filters.age ?? "Any"}>
                    <option value="Any">Any</option>
                    {Object.entries(AGE_BUCKETS).map(([key, bucket]) => (
                      <option key={key} value={key}>
                        {bucket.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="filter-field">
                  <label htmlFor="f-exp">Experience</label>
                  <select id="f-exp" name="experience" defaultValue={filters.experience ?? "Any"}>
                    <option value="Any">Any</option>
                    {Object.entries(EXPERIENCE_BUCKETS).map(([key, bucket]) => (
                      <option key={key} value={key}>
                        {bucket.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="filter-field">
                  <label htmlFor="f-skl">Skills</label>
                  <select id="f-skl" name="skill" defaultValue={filters.skill ?? "Any"}>
                    <option value="Any">Any</option>
                    {Object.entries(SKILL_CATEGORIES).map(([key, cat]) => (
                      <option key={key} value={key}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="filter-field">
                  <label htmlFor="f-avl">Availability</label>
                  <select id="f-avl" name="availability" defaultValue={filters.availability ?? "Any"}>
                    <option value="Any">Any</option>
                    <option value="AVAILABLE">Available</option>
                    <option value="RESERVED">Reserved</option>
                  </select>
                </div>
              </div>

              <div className="btns" style={{ flexDirection: "column", marginTop: 18 }}>
                <button type="submit" className="btn btn--primary btn--block btn--sm">
                  Apply Filters
                </button>
                <Link className="btn btn--outline btn--block btn--sm" href="/dashboard/maids">
                  Clear filters
                </Link>
              </div>
            </form>
          </aside>

          {/* MAIN LISTING */}
          <div className="main-col">
            <div className="listing-head">
              <h2>Available Helpers</h2>
              <span className="resultcount">
                {totalCount} helper profile{totalCount === 1 ? "" : "s"} match your search
              </span>
            </div>

            {items.length > 0 ? (
              <div className="helpers-grid-app">
                {items.map((maid) => (
                  <MaidCard key={maid.id} maid={maid} />
                ))}
              </div>
            ) : (
              <div className="card empty-state">
                <h3>No helpers match your filters</h3>
                <p style={{ marginTop: 8, color: "var(--ink-70)" }}>
                  Try adjusting or clearing your filters to see more profiles.
                </p>
                <Link className="btn btn--secondary" style={{ marginTop: 16 }} href="/dashboard/maids">
                  Clear filters
                </Link>
              </div>
            )}

            <div className="note-chip note-inline">
              <svg viewBox="0 0 24 24"><use href="#i-info" /></svg>
              <span>
                &quot;View Profile&quot; opens the full biodata: employment history, specialised skills and the
                One-Day Training Handbook modules completed by the candidate.
              </span>
            </div>

            {totalPages > 1 && (
              <div className="listing-foot pagination">
                {page > 1 ? (
                  <Link className="btn btn--secondary btn--sm" href={pageHref(page - 1)}>
                    ← Previous
                  </Link>
                ) : (
                  <span className="btn btn--secondary btn--sm" aria-disabled="true">
                    ← Previous
                  </span>
                )}
                <span className="pagination__status">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages ? (
                  <Link className="btn btn--secondary btn--sm" href={pageHref(page + 1)}>
                    Next →
                  </Link>
                ) : (
                  <span className="btn btn--secondary btn--sm" aria-disabled="true">
                    Next →
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
