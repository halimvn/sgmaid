import Link from "next/link";
import type { Metadata } from "next";
import { getAdminMaidList } from "@/lib/services/admin/maids";
import { parseAdminMaidFilters, PROFILE_STATUS_OPTIONS, AVAILABILITY_STATUS_OPTIONS, MAID_TYPE_OPTIONS } from "@/lib/validation/admin-maid";

export const metadata: Metadata = { title: "Maid Management — SG Maid Admin" };

type SearchParams = Record<string, string | string[] | undefined>;

const PROFILE_STATUS_BADGE: Record<string, string> = {
  DRAFT: "admin-badge--draft",
  ACTIVE: "admin-badge--active",
  INACTIVE: "admin-badge--inactive",
};

const MAID_TYPE_LABEL: Record<string, string> = {
  NEW: "New Maid",
  TRANSFER: "Transfer Maid",
  EX_SINGAPORE: "Ex-Singapore Maid",
  EX_OTHERS: "Ex-Others Maid",
};

const MARITAL_STATUS_LABEL: Record<string, string> = {
  SINGLE: "Single",
  MARRIED: "Married",
  DIVORCED: "Divorced",
  WIDOWED: "Widowed",
};

/**
 * /admin/maids — Phase 6. A practical operational table, not a copy of
 * the employer browsing experience: staff filter by Profile
 * Status/Availability/Maid Type (states employers never even see, like
 * DRAFT) and search by Name/Profile Code. See
 * lib/services/admin/maids.ts getAdminMaidList().
 */
export default async function AdminMaidsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const filters = parseAdminMaidFilters(raw);
  const result = await getAdminMaidList(filters);

  function pageHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.profileStatus) params.set("profileStatus", filters.profileStatus);
    if (filters.availabilityStatus) params.set("availabilityStatus", filters.availabilityStatus);
    if (filters.maidType) params.set("maidType", filters.maidType);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/admin/maids?${qs}` : "/admin/maids";
  }

  return (
    <section className="sec-admin">
      <div className="wrap-admin">
        <div className="listing-head">
          <h1>Maid Management</h1>
          <Link href="/admin/maids/new" className="btn btn--primary btn--sm">+ Add New Maid</Link>
        </div>

        <form method="GET" action="/admin/maids" className="admin-filters">
          <div className="filter-field" style={{ minWidth: 220 }}>
            <label htmlFor="f-search">Search (Name or Profile Code)</label>
            <input type="text" id="f-search" name="search" defaultValue={filters.search ?? ""} placeholder="e.g. DV155 or Marni" />
          </div>
          <div className="filter-field">
            <label htmlFor="f-status">Profile Status</label>
            <select id="f-status" name="profileStatus" defaultValue={filters.profileStatus ?? "Any"}>
              <option value="Any">Any</option>
              {PROFILE_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label htmlFor="f-avail">Availability</label>
            <select id="f-avail" name="availabilityStatus" defaultValue={filters.availabilityStatus ?? "Any"}>
              <option value="Any">Any</option>
              {AVAILABILITY_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label htmlFor="f-type">Maid Type</label>
            <select id="f-type" name="maidType" defaultValue={filters.maidType ?? "Any"}>
              <option value="Any">Any</option>
              {MAID_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn--secondary btn--sm">Apply</button>
          <Link href="/admin/maids" className="btn btn--outline btn--sm">Clear</Link>
        </form>

        <p className="resultcount" style={{ marginBottom: 12 }}>
          {result.totalCount} profile{result.totalCount === 1 ? "" : "s"}
        </p>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Profile Code</th>
                <th>Name</th>
                <th>Maid Type</th>
                <th>Marital</th>
                <th>Availability</th>
                <th>Profile Status</th>
                <th>Photo</th>
                <th>Biodata</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.items.length === 0 ? (
                <tr><td colSpan={10} className="muted" style={{ textAlign: "center", padding: 28 }}>No profiles match these filters.</td></tr>
              ) : (
                result.items.map((maid) => (
                  <tr key={maid.id}>
                    <td>{maid.profileCode}</td>
                    <td>{maid.name}</td>
                    <td className="muted">{maid.maidType ? MAID_TYPE_LABEL[maid.maidType] ?? maid.maidType : "—"}</td>
                    <td className="muted">{maid.maritalStatus ? MARITAL_STATUS_LABEL[maid.maritalStatus] ?? maid.maritalStatus : "—"}</td>
                    <td className="muted">{maid.availabilityStatus}</td>
                    <td><span className={`admin-badge ${PROFILE_STATUS_BADGE[maid.profileStatus] ?? ""}`}>{maid.profileStatus}</span></td>
                    <td><span className={`admin-badge ${maid.hasPhoto ? "admin-badge--yes" : "admin-badge--no"}`}>{maid.hasPhoto ? "Yes" : "No"}</span></td>
                    <td><span className={`admin-badge ${maid.hasBiodata ? "admin-badge--yes" : "admin-badge--no"}`}>{maid.hasBiodata ? "Yes" : "No"}</span></td>
                    <td className="muted">{new Date(maid.updatedAt).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td>
                      <div className="btns">
                        <Link href={`/admin/maids/${maid.id}/edit`} className="btn btn--secondary btn--sm">Edit</Link>
                        <Link href={`/admin/maids/${maid.id}`} className="btn btn--outline btn--sm">Preview</Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {result.totalPages > 1 && (
          <div className="listing-foot pagination">
            {result.page > 1 ? (
              <Link className="btn btn--secondary btn--sm" href={pageHref(result.page - 1)}>← Previous</Link>
            ) : (
              <span className="btn btn--secondary btn--sm" aria-disabled="true">← Previous</span>
            )}
            <span className="pagination__status">Page {result.page} of {result.totalPages}</span>
            {result.page < result.totalPages ? (
              <Link className="btn btn--secondary btn--sm" href={pageHref(result.page + 1)}>Next →</Link>
            ) : (
              <span className="btn btn--secondary btn--sm" aria-disabled="true">Next →</span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
