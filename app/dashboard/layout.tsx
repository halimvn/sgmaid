import DashboardIconSprite from "@/components/dashboard/DashboardIconSprite";
import AppHeader from "@/components/dashboard/AppHeader";
import "./dashboard.css";

/**
 * Shared shell for the entire /dashboard/* route tree.
 *
 * ============================================================
 * PHASE 2 TODO — SERVER-SIDE AUTH GUARD GOES HERE
 * ============================================================
 * Every route under /dashboard must require an authenticated,
 * active-status employer session. This layout is the correct place
 * to add that check once Auth.js is wired up, e.g.:
 *
 *   const session = await auth();
 *   if (!session || session.user.role !== "employer" || session.user.status !== "active") {
 *     redirect("/login");
 *   }
 *
 * This must be a SERVER-SIDE check (not a client-side redirect) —
 * client-side-only protection would mean the page's data has already
 * been sent to the browser before the check runs. See the Phase 0
 * security notes: maid biodata must never be reachable without this
 * guard in place.
 * ============================================================
 *
 * The gate banner below is a placeholder reminder for reviewers in
 * the meantime — it is NOT a real access control.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <DashboardIconSprite />
      <div className="gate">
        🔒 Employer Portal — visible only to logged-in employers. Not registered yet?{" "}
        <a href="/contact">Contact Us</a> to request secure portal access.
      </div>
      <AppHeader />
      {children}
    </div>
  );
}
