import DashboardIconSprite from "@/components/dashboard/DashboardIconSprite";
import AppHeader from "@/components/dashboard/AppHeader";
import { requireEmployer } from "@/lib/auth/authorize";
import "./dashboard.css";

/**
 * Shared shell for the entire /dashboard/* route tree.
 *
 * Server-side auth guard: requireEmployer() re-reads the current User
 * row from PostgreSQL (status + role), not the session cookie, on every
 * request to this layout. An unauthenticated visitor or a non-ACTIVE/
 * non-EMPLOYER user is redirect()'d to /login before any child page
 * (and therefore its data) ever renders — this is deliberately a
 * server-side check, not a client-side redirect, so mock maid data
 * (and, from Phase 3 on, real maid data) is never sent to the browser
 * in the first place for a rejected request. See lib/auth/authorize.ts.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireEmployer();

  return (
    <div className="app-shell">
      <DashboardIconSprite />
      {/*
        Phase 4.5 — client demo indicator. Every candidate name is already
        prefixed "[Fictional]" (see prisma/seed.ts), which stays as-is —
        this banner is an additional, easy-to-scan cue for a live client
        presentation, not a replacement for it. Remove this banner (and
        only this banner) once real SG Maid maid biodata replaces the
        seed data in the real-data onboarding phase.
      */}
      <div className="demo-banner">
        Demo Environment — all candidate profiles shown are fictional development data, not real SG Maid clients.
      </div>
      <div className="gate">
        🔒 Employer Portal — visible only to logged-in employers. Not registered yet?{" "}
        <a href="/contact">Contact Us</a> to request secure portal access.
      </div>
      <AppHeader />
      {children}
    </div>
  );
}
