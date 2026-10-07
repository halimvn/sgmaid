import Link from "next/link";
import type { Metadata } from "next";
import { getAdminUserList } from "@/lib/services/admin/admins";
import { formatSgDateTime } from "@/lib/format-sgt";

export const metadata: Metadata = { title: "Staff Accounts — SG Maid Admin" };

type SearchParams = Record<string, string | string[] | undefined>;

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "admin-badge--active",
  SUSPENDED: "admin-badge--suspended",
  INACTIVE: "admin-badge--inactive",
  PENDING: "admin-badge--pending",
};

/**
 * /admin/admins — the back-office accounts that can sign in to this admin area (the full
 * administrator and staff), with creation and management (reset password, suspend).
 * Full administrator only — see lib/services/admin/admins.ts.
 */
export default async function AdminStaffPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const pageParam = Array.isArray(raw.page) ? raw.page[0] : raw.page;
  const page = Math.max(1, Number(pageParam) || 1);

  const result = await getAdminUserList(page);

  const pageHref = (p: number) => (p > 1 ? `/admin/admins?page=${p}` : "/admin/admins");

  return (
    <section className="sec-admin">
      <div className="wrap-admin">
        <div className="listing-head">
          <h1>Staff Accounts</h1>
          <Link href="/admin/admins/new" className="btn btn--primary btn--sm">+ Create Staff Account</Link>
        </div>

        <p className="resultcount" style={{ marginBottom: 12 }}>
          {result.totalCount} staff account{result.totalCount === 1 ? "" : "s"}
        </p>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Username</th>
                <th>Email</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((a) => (
                <tr key={a.id}>
                  <td>{a.fullName}{a.isCurrentUser && <span className="muted"> (you)</span>}</td>
                  <td><span className={`admin-badge ${a.role === "ADMIN" ? "admin-badge--yes" : "admin-badge--no"}`}>{a.role === "ADMIN" ? "Admin" : "Staff"}</span></td>
                  <td>{a.username ?? "—"}</td>
                  <td className="muted">{a.email ?? "—"}</td>
                  <td><span className={`admin-badge ${STATUS_BADGE[a.status] ?? ""}`}>{a.status}</span></td>
                  <td className="muted">{a.lastLoginAt ? formatSgDateTime(a.lastLoginAt) : "Never"}</td>
                  <td>
                    <div className="btns">
                      <Link href={`/admin/admins/${a.id}/edit`} className="btn btn--secondary btn--sm">Manage</Link>
                    </div>
                  </td>
                </tr>
              ))}
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
