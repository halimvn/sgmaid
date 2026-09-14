import "server-only";
import { prisma } from "@/lib/db";
import { verifyPassword } from "./password";
import { buildLoginIdentifier, isRateLimited, recordLoginAttempt } from "./rate-limit";

/**
 * Core credentials-authentication logic — Phase 2.
 *
 * Deliberately kept independent of Auth.js/NextAuth's Credentials
 * provider wiring (see auth.ts) so it can be unit tested directly without
 * needing to exercise Auth.js internals, and so the exact same logic
 * could be reused from anywhere else that needs it later.
 *
 * Never reveals *why* a login failed externally — "unknown email",
 * "wrong password", and "account not active" must all produce the same
 * caller-visible outcome (INVALID_CREDENTIALS) to avoid account
 * enumeration. RATE_LIMITED is intentionally distinguishable — telling a
 * genuine user "too many attempts" isn't an enumeration risk.
 */

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type AuthenticatedUser = {
  id: string;
  role: "EMPLOYER" | "ADMIN";
  sessionVersion: number;
};

export type CredentialsResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; reason: "INVALID_CREDENTIALS" | "RATE_LIMITED" };

// A precomputed bcrypt hash of an unguessable, never-used value. Compared
// against on a "no such user" / "no password set yet" path so that
// verifying real credentials and verifying against a nonexistent account
// take roughly the same amount of time either way — a small defense
// against timing-based email enumeration.
// Not a secret — a fixed, publicly-known dummy hash used only for timing
// parity; it corresponds to no real account or password.
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5Zjq6/8ES5UYQrDGVXeQQoxfXXYAr9K";

export async function authenticateCredentials(
  rawEmail: string,
  password: string,
  ip: string
): Promise<CredentialsResult> {
  const email = normalizeEmail(rawEmail);
  const identifierHash = buildLoginIdentifier(email, ip);

  if (await isRateLimited(identifierHash)) {
    return { ok: false, reason: "RATE_LIMITED" };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash) {
    await verifyPassword(password, DUMMY_HASH); // constant-time-ish decoy comparison
    await recordLoginAttempt(identifierHash, false);
    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    await recordLoginAttempt(identifierHash, false);
    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }

  if (user.status !== "ACTIVE") {
    await recordLoginAttempt(identifierHash, false);
    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }

  await recordLoginAttempt(identifierHash, true);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return {
    ok: true,
    user: { id: user.id, role: user.role, sessionVersion: user.sessionVersion },
  };
}
