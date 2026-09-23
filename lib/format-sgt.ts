/**
 * Singapore-local timestamp formatting — Phase 8.
 *
 * Every access-expiry decision is made server-side against server clock
 * time in UTC (see lib/auth/authorize.ts, lib/services/admin/clients.ts)
 * — this is display-only, and deliberately pins the timezone to
 * "Asia/Singapore" explicitly rather than trusting the viewer's browser/
 * OS locale, so a timestamp reads the same way for SG Maid staff
 * regardless of where a browser happens to be set. Safe to call from a
 * Client or Server Component either way.
 */
export function formatSgDateTime(value: string | Date | null): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
