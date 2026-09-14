import "server-only";

/**
 * Best-effort client IP extraction from standard proxy headers. Used only
 * as one input to the login rate-limit identifier (see
 * lib/auth/rate-limit.ts) — never trusted as a strong identity signal on
 * its own, since these headers are client-suppliable in principle and
 * only as reliable as the proxy in front of the app makes them.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}
