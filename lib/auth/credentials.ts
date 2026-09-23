import "server-only";
import { prisma } from "@/lib/db";
import { verifyPassword } from "./password";
import { normalizeUsername } from "./username";
import { buildLoginIdentifier, isRateLimited, recordLoginAttempt } from "./rate-limit";

/**
 * Core credentials-authentication logic — Phase 2, revised Phase 8.
 *
 * Deliberately kept independent of Auth.js/NextAuth's Credentials
 * provider wiring (see auth.ts) so it can be unit tested directly without
 * needing to exercise Auth.js internals, and so the exact same logic
 * could be reused from anywhere else that needs it later.
 *
 * Never reveals *why* a login failed externally — "unknown identifier",
 * "wrong password", and "account not active" must all produce the same
 * caller-visible outcome (INVALID_CREDENTIALS) to avoid account
 * enumeration. RATE_LIMITED and ACCESS_EXPIRED are intentionally
 * distinguishable — see the reasoning by each below.
 *
 * Phase 8 — one login field, two identifier shapes:
 *   - EMPLOYER/client accounts log in with a USERNAME, never an email
 *     (the business requirement this phase implements — see the
 *     "AUTH REVISION" spec). A client User row has no email requirement
 *     at all any more.
 *   - ADMIN (SG Maid staff) accounts are UNCHANGED — they still log in
 *     with their email, exactly as before Phase 8. There is deliberately
 *     no separate admin login page/form; the single shared Credentials
 *     provider below tells the two apart by *shape*, not by asking the
 *     caller which kind of account it is:
 *       1. Try the submitted value as a USERNAME first. `normalizeUsername()`
 *          rejects anything containing "@" outright (see that file), so
 *          an email-shaped value can never resolve via this path, and a
 *          username can never collide with an email.
 *       2. Only if that finds no row, try it as an EMAIL — and even then,
 *          the matched row is only accepted if its role is ADMIN. An
 *          EMPLOYER row that happens to have an email on file (it's kept
 *          as optional contact info) can still never authenticate with
 *          that email — this is what test #2 in the Phase 8 spec ("Employer
 *          cannot authenticate using email + password") requires, and it
 *          holds structurally, not just by convention.
 *   This keeps ADMIN authentication completely unchanged in behaviour
 *   (same credential, same code path shape) while EMPLOYER moves fully to
 *   username — see the Phase 8 final report for why a single provider was
 *   judged safe here rather than splitting into two.
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
  | { ok: false; reason: "INVALID_CREDENTIALS" | "RATE_LIMITED" | "ACCESS_EXPIRED" };

// A precomputed bcrypt hash of an unguessable, never-used value. Compared
// against on a "no such user" / "no password set yet" path so that
// verifying real credentials and verifying against a nonexistent account
// take roughly the same amount of time either way — a small defense
// against timing-based account enumeration.
// Not a secret — a fixed, publicly-known dummy hash used only for timing
// parity; it corresponds to no real account or password.
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5Zjq6/8ES5UYQrDGVXeQQoxfXXYAr9K";

/**
 * @param rawIdentifier what the caller typed into the single login field —
 *   a username for an EMPLOYER/client, an email for ADMIN staff.
 */
export async function authenticateCredentials(
  rawIdentifier: string,
  password: string,
  ip: string
): Promise<CredentialsResult> {
  const normalizedUsername = normalizeUsername(rawIdentifier);
  const normalizedEmail = normalizeEmail(rawIdentifier);
  // Rate-limit key is the identifier actually usable for a lookup (prefer
  // the username shape; fall back to the email shape) + IP — same
  // buildLoginIdentifier() hashing as before, just fed whichever
  // normalized form applies.
  const identifierHash = buildLoginIdentifier(normalizedUsername ?? normalizedEmail, ip);

  if (await isRateLimited(identifierHash)) {
    return { ok: false, reason: "RATE_LIMITED" };
  }

  let user = normalizedUsername ? await prisma.user.findUnique({ where: { username: normalizedUsername } }) : null;

  if (!user) {
    const matchedByEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    // An EMPLOYER row is never authenticated via its email, even if it
    // has one on file (see file header) — only surface an ADMIN match.
    user = matchedByEmail && matchedByEmail.role === "ADMIN" ? matchedByEmail : null;
  }

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

  // Phase 8: 3-day staff-issued access, EMPLOYER only — ADMIN accounts
  // have no accessExpiresAt and are never subject to this. Checked only
  // after the real password has already been verified and the account
  // confirmed ACTIVE, so this can never be used to distinguish "wrong
  // password" from "right password, but expired" for an attacker who
  // doesn't already have the correct password — see the spec's own
  // "acceptable to distinguish expired access from bad credentials AFTER
  // credential verification".
  if (user.role === "EMPLOYER") {
    const expired = !user.accessExpiresAt || user.accessExpiresAt.getTime() <= Date.now();
    if (expired) {
      await recordLoginAttempt(identifierHash, false);
      return { ok: false, reason: "ACCESS_EXPIRED" };
    }
  }

  await recordLoginAttempt(identifierHash, true);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return {
    ok: true,
    user: { id: user.id, role: user.role, sessionVersion: user.sessionVersion },
  };
}
