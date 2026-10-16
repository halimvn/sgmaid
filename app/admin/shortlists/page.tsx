import Link from "next/link";
import type { Metadata } from "next";
import { getAdminShortlists, getSharedHelpers } from "@/lib/services/admin/shortlists";
import { formatSgDateTime } from "@/lib/format-sgt";
import { maidTypeLabel } from "@/lib/maid-type-label";

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

const MARITAL_LABEL: Record<string, string> = { SINGLE: "Single", MARRIED: "Married", DIVORCED: "Divorced", WIDOWED: "Widowed" };

type Tab = "clients" | "shared";

/**
 * /admin/shortlists — two tabs over the same shortlist data, read-only:
 *   • Client Shortlists (default): one row per "client shortlisted helper", newest first.
 *   • Shared Helpers: helpers that MORE THAN ONE client has shortlisted, each listing those
 *     clients — so staff can spot a helper in demand before two clients both want her.
 * A helper who has since been placed or retired still shows, with her current status, so staff
 * know when a shortlist is stale. The tab is the \`?tab=\` query value, so each is a plain link.
 */
export default async function AdminShortlistsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const tab: Tab = first(raw.tab) === "shared" ? "shared" : "clients";
  const search = first(raw.search)?.trim() || undefined;
  const page = Math.max(1, Number(first(raw.page)) || 1);

  function href(overrides: { tab?: Tab; page?: number; search?: string | null }): string {
    const params = new URLSearchParams();
    const t = overrides.tab ?? tab;
    const s = overrides.search === null ? undefined : (overrides.search ?? search);
    const p = overrides.page ?? 1;
    if (t === "shared") params.set("tab", "shared");
    if (s) params.set("search", s);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin/shortlists?${qs}` : "/admin/shortlists";
  }

  const shared = tab === "shared" ? await getSharedHelpers({ search, page }) : null;
  const clients = tab === "clients" ? await getAdminShortlists({ search, page }) : null;
  const totalPages = shared?.totalPages ?? clients?.totalPages ?? 1;
  const currentPage = shared?.page ?? clients?.page ?? 1;

  return (
    <section className="sec-admin">
      <div className="wrap-admin">
        <div className="listing-head">
          <h1>Client Shortlists</h1>
        </div>

        <nav className="admin-tabs" aria-label="Shortlist views">
          <Link href={href({ tab: "clients", page: 1 })} className={tab === "clients" ? "admin-tab admin-tab--cur" : "admin-tab"} aria-current={tab === "clients" ? "page" : undefined}>
            Client Shortlists
          </Link>
          <Link href={href({ tab: "shared", page: 1 })} className={tab === "shared" ? "admin-tab admin-tab--cur" : "admin-tab"} aria-current={tab === "shared" ? "page" : undefined}>
            Shared Helpers
          </Link>
        </nav>

        <form method="GET" action="/admin/shortlists" className="admin-filters">
          {tab === "shared" && <input type="hidden" name="tab" value="shared" />}
          <div className="filter-field" style={{ minWidth: 280 }}>
            <label htmlFor="f-search">Search (Client name, username, helper name or code)</label>
            <input type="text" id="f-search" name="search" defaultValue={search ?? ""} placeholder="e.g. ahmadtan or DAM582" />
          </div>
          <button type="submit" className="btn btn--secondary btn--sm">Apply</button>
          <Link href={href({ search: null, page: 1 })} className="btn btn--outline btn--sm">Clear</Link>
        </form>

        {clients && (
          <>
            <p className="resultcount" style={{ marginBottom: 12 }}>
              {clients.totalCount} shortlisted helper{clients.totalCount === 1 ? "" : "s"} across {clients.clientCount} client
              {clients.clientCount === 1 ? "" : "s"}
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
                  {clients.items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="muted" style={{ textAlign: "center", padding: 28 }}>
                        {search ? "No shortlists match this search." : "No client has shortlisted a helper yet."}
                      </td>
                    </tr>
                  ) : (
                    clients.items.map((item) => (
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
          </>
        )}

        {shared && (
          <>
            <p className="resultcount" style={{ marginBottom: 12 }}>
              <strong>{shared.totalCount}</strong> helper{shared.totalCount === 1 ? " is" : "s are"} shortlisted by more than one
              client. Each lists the clients who shortlisted {shared.totalCount === 1 ? "her" : "them"}.
            </p>

            {shared.items.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: 28 }}>
                <p className="muted">
                  {search ? "No shared helpers match this search." : "No helper has been shortlisted by more than one client yet."}
                </p>
              </div>
            ) : (
              <div className="shared-list">
                {shared.items.map((h) => {
                  const facts = [
                    h.nationality,
                    h.age != null ? `${h.age} yrs` : null,
                    `${h.yearsExperience} yr exp`,
                    h.heightCm != null ? `${h.heightCm} cm` : null,
                    h.weightKg != null ? `${h.weightKg} kg` : null,
                    h.maritalStatus ? (MARITAL_LABEL[h.maritalStatus] ?? h.maritalStatus) : null,
                    maidTypeLabel(h.maidType),
                  ].filter(Boolean);
                  return (
                    <article className="shared-card" key={h.maidId}>
                      <div className="shared-card__head">
                        <div className="shared-card__photo">
                          {h.hasPhoto ? (
                            // eslint-disable-next-line @next/next/no-img-element -- cookie-gated admin route redirecting to a signed URL
                            <img src={`/admin/maids/${h.maidId}/photo`} alt="" loading="lazy" />
                          ) : (
                            <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-user" /></svg>
                          )}
                        </div>
                        <div className="shared-card__info">
                          <h3>
                            <Link href={`/admin/maids/${h.maidId}/edit`}>{h.name} ({h.profileCode})</Link>
                            <span className="admin-badge admin-badge--pending">{h.clients.length} clients</span>
                            <span className={`admin-badge ${PROFILE_BADGE[h.profileStatus] ?? ""}`}>{h.profileStatus}</span>
                            <span className="muted shared-card__avail">{AVAILABILITY_LABEL[h.availabilityStatus] ?? h.availabilityStatus}</span>
                          </h3>
                          <p className="shared-card__facts">{facts.join(" · ")}</p>
                          {h.expertise.length > 0 && <p className="shared-card__expertise">{h.expertise.join(" · ")}</p>}
                          <p className="shared-card__facts">Languages: {h.languages.length > 0 ? h.languages.join(", ") : "Not provided"}</p>
                        </div>
                      </div>

                      <ul className="shared-clients">
                        {h.clients.map((c) => (
                          <li key={c.clientId}>
                            <span className="shared-clients__avatar" aria-hidden="true">
                              <svg viewBox="0 0 24 24"><use href="#i-user" /></svg>
                            </span>
                            <span className="shared-clients__who">
                              <Link href={`/admin/clients/${c.clientId}/edit`}>{c.clientName}</Link>
                              <span className="muted">{c.clientUsername ?? "—"}</span>
                            </span>
                            <span className="muted shared-clients__when">Shortlisted {formatSgDateTime(c.shortlistedAt)}</span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

        {totalPages > 1 && (
          <div className="listing-foot pagination">
            {currentPage > 1 ? (
              <Link className="btn btn--secondary btn--sm" href={href({ page: currentPage - 1 })}>← Previous</Link>
            ) : (
              <span className="btn btn--secondary btn--sm" aria-disabled="true">← Previous</span>
            )}
            <span className="pagination__status">Page {currentPage} of {totalPages}</span>
            {currentPage < totalPages ? (
              <Link className="btn btn--secondary btn--sm" href={href({ page: currentPage + 1 })}>Next →</Link>
            ) : (
              <span className="btn btn--secondary btn--sm" aria-disabled="true">Next →</span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
