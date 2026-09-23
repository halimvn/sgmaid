import "server-only";
import { USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH } from "./constants";

/**
 * Client/employer username normalization — Phase 8.
 *
 * Deliberately store the already-normalized form as the column value
 * itself (trim + lowercase, restricted charset) rather than adding a
 * citext extension or a separate "normalized" shadow column: a
 * case-insensitive lookup then becomes a plain `where: { username }`
 * equality match on the unique column, compatible with any PostgreSQL
 * setup and requiring no extra extension/migration complexity. Every
 * write path (admin create/edit) and every read path (login) MUST go
 * through this function first — "AhmadTan" and "ahmadtan" must always
 * resolve to the same row, never two different ones.
 *
 * Allowed charset: lowercase letters, digits, and the separators `.` `_`
 * `-`. No spaces, no `@` (so a username can never collide with — or be
 * confused for — an email address; see lib/auth/credentials.ts, which
 * relies on this to tell the two login-identifier shapes apart).
 */
const USERNAME_PATTERN = new RegExp(`^[a-z0-9._-]{${USERNAME_MIN_LENGTH},${USERNAME_MAX_LENGTH}}$`);

/** Trims + lowercases, then validates the shape. Returns null (never throws) for anything that isn't a valid username. */
export function normalizeUsername(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  return USERNAME_PATTERN.test(trimmed) ? trimmed : null;
}
