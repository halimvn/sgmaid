import DashboardIconSprite from "@/components/dashboard/DashboardIconSprite";
import AdminHeader from "@/components/admin/AdminHeader";
import { requireAdmin } from "@/lib/auth/authorize";
import "./admin.css";

/**
 * Shared shell for the entire /admin/* route tree — Phase 6.
 *
 * Server-side auth guard: requireAdmin() re-reads the current User row
 * from PostgreSQL (status + role) on every request, exactly like
 * app/dashboard/layout.tsx's requireEmployer() does for the employer
 * portal. An unauthenticated visitor, a non-ACTIVE user, or an
 * ACTIVE-but-EMPLOYER-role user is redirect()'d to /login before any
 * child page (and therefore any maid data) ever renders. This is
 * deliberately a separate route tree from /dashboard — the admin and
 * employer portals are different experiences, not one gated by a role
 * check inside a shared layout.
 *
 * Every admin service function in lib/services/admin/maids.ts ALSO
 * calls requireAdmin() itself — this layout guard is defense in depth,
 * not the only check (see that file's own doc comment).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="app-shell admin-shell">
      <DashboardIconSprite />
      <AdminHeader />
      {children}
    </div>
  );
}
