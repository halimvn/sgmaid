import Link from "next/link";
import type { Metadata } from "next";
import { getAdminShortlists } from "@/lib/services/admin/shortlists";
import { formatSgDateTime } from "@/lib/format-sgt";

export const metadata: Metadata = { title: "Client Shortlists — SG Maid Admin" };

type SearchParams = Record<string, string | string[] | undefined>;

const PROFILE_BADGE: Record<string, string> = {
  ACTIVE: "admin-badge--active",
  DRAFT: "admin-badge--draft",
  INACTIVE: "admin-badge--inactive",
};

const AVAILABILITY_LABEL: Record<string, string> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  PLACED: "Placed",
  UNAVAILABLE: "Unavailable",
};

/**
 * /admin/shortlists — which helpers each client has shortlisted. Read-only; staff can follow
 * the links through to the client or the helper's profile. A helper who has since been placed
 * or retired still shows here, with her current status, so staff know when a shortlist is stale.
 */
export default async function AdminShortlistsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const search = first(raw.search)?.trim() || undefined;
  const page = Math.max(1, Number(first(raw.page)) || 1);

  const result = await getAdminShortlists({ search, page });

  function pageHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/admin/shortlists?${qs}` : "/admin/shortlists";
  }

  return (
    <section className="sec-admin">
      <div className="wrap-admin">
        <div className="listing-head">
          <h1>Client Shortlists</h1>
        </div>

        <form method="GET" action="/admin/shortlists" className="admin-filters">
          <div className="filter-field" style={{ minWidth: 280 }}>
            <label htmlFor="f-search">Search (Client name, username, helper name or code)</label>
            <input type="text" id="f-search" name="search" defaultValue={search ?? ""} placeholder="e.g. ahmadtan or DAM582" />
          </div>
          <button type="submit" className="btn btn--secondary btn--sm">Apply</button>
          <Link href="/admin/shortlists" className="btn btn--outline btn--sm">Clear</Link>
        </form>

        <p className="resultcount" style={{ marginBottom: 12 }}>
          {result.totalCount} shortlisted helper{result.totalCount === 1 ? "" : "s"} across {result.clientCount} client
          {result.clientCount === 1 ? "" : "s"}
        </p>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Username</th>
                <th>Helper</th>
                <th>Profile Code</th>
                <th>Profile Status</th>
                <th>Availability</th>
                <th>Shortlisted On</th>
              </tr>
            </thead>
            <tbody>
              {result.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted" style={{ textAlign: "center", padding: 28 }}>
                    {search ? "No shortlists match this search." : "No client has shortlisted a helper yet."}
                  </td>
                </tr>
              ) : (
                result.items.map((item) => (
                  <tr key={item.shortlistId}>
                    <td>
                      <Link href={`/admin/clients/${item.clientId}/edit`}>{item.clientName}</Link>
                    </td>
                    <td className="muted">{item.clientUsername ?? "—"}</td>
                    <td>
                      <Link href={`/admin/maids/${item.maidId}/edit`}>{item.maidName}</Link>
                    </td>
                    <td>{item.profileCode}</td>
                    <td>
                      <span className={`admin-badge ${PROFILE_BADGE[item.profileStatus] ?? ""}`}>{item.profileStatus}</span>
                    </td>
                    <td className="muted">{AVAILABILITY_LABEL[item.availabilityStatus] ?? item.availabilityStatus}</td>
                    <td className="muted">{formatSgDateTime(item.shortlistedAt)}</td>
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
