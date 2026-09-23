import Link from "next/link";
import type { Metadata } from "next";
import { getClientList } from "@/lib/services/admin/clients";
import { formatSgDateTime } from "@/lib/format-sgt";

export const metadata: Metadata = { title: "Client Management — SG Maid Admin" };

type SearchParams = Record<string, string | string[] | undefined>;

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "admin-badge--active",
  SUSPENDED: "admin-badge--suspended",
  INACTIVE: "admin-badge--inactive",
  PENDING: "admin-badge--pending",
};

function remainingBadgeClass(label: string): string {
  if (label === "Expired") return "admin-badge--expired";
  if (label === "Expires today") return "admin-badge--expiring";
  if (label.startsWith("Active")) return "admin-badge--active";
  return "";
}

/**
 * /admin/clients — Phase 8. Staff-created client/employer access, kept
 * deliberately separate from /admin/maids (different identity, different
 * lifecycle — see lib/services/admin/clients.ts). Operational columns
 * only: nothing here ever exposes a passwordHash.
 */
export default async function AdminClientsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const search = first(raw.search)?.trim() || undefined;
  const page = Math.max(1, Number(first(raw.page)) || 1);

  const result = await getClientList({ search, page });

  function pageHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/admin/clients?${qs}` : "/admin/clients";
  }

  return (
    <section className="sec-admin">
      <div className="wrap-admin">
        <div className="listing-head">
          <h1>Client Management</h1>
          <Link href="/admin/clients/new" className="btn btn--primary btn--sm">+ Create Client Access</Link>
        </div>

        <form method="GET" action="/admin/clients" className="admin-filters">
          <div className="filter-field" style={{ minWidth: 240 }}>
            <label htmlFor="f-search">Search (Username or Client Name)</label>
            <input type="text" id="f-search" name="search" defaultValue={search ?? ""} placeholder="e.g. ahmadtan or Ahmad Tan" />
          </div>
          <button type="submit" className="btn btn--secondary btn--sm">Apply</button>
          <Link href="/admin/clients" className="btn btn--outline btn--sm">Clear</Link>
        </form>

        <p className="resultcount" style={{ marginBottom: 12 }}>
          {result.totalCount} client{result.totalCount === 1 ? "" : "s"}
        </p>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Client Name</th>
                <th>Mobile Number</th>
                <th>Status</th>
                <th>Access Created</th>
                <th>Access Expires</th>
                <th>Remaining Access</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.items.length === 0 ? (
                <tr><td colSpan={8} className="muted" style={{ textAlign: "center", padding: 28 }}>No clients match these filters.</td></tr>
              ) : (
                result.items.map((client) => (
                  <tr key={client.id}>
                    <td>{client.username}</td>
                    <td>{client.fullName}</td>
                    <td className="muted">{client.mobileNumber ?? "—"}</td>
                    <td><span className={`admin-badge ${STATUS_BADGE[client.status] ?? ""}`}>{client.status}</span></td>
                    <td className="muted">{formatSgDateTime(client.createdAt)}</td>
                    <td className="muted">{formatSgDateTime(client.accessExpiresAt)}</td>
                    <td><span className={`admin-badge ${remainingBadgeClass(client.remainingLabel)}`}>{client.remainingLabel}</span></td>
                    <td>
                      <div className="btns">
                        <Link href={`/admin/clients/${client.id}/edit`} className="btn btn--secondary btn--sm">Manage</Link>
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
