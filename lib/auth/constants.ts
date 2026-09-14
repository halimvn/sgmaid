/**
 * Centralised auth configuration constants — Phase 2.
 *
 * Kept in one place instead of scattered magic numbers across the auth
 * flow, per the Phase 2 spec ("keep this configurable in code").
 */

// How long an account-setup invitation link stays valid.
export const ACCOUNT_SETUP_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Password reset links are shorter-lived than setup invitations: a reset
// is normally acted on within minutes of being requested, and a shorter
// window reduces the exposure if a reset link is ever intercepted.
export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Minimum acceptable password length. Deliberately no forced
// symbol/uppercase/number complexity rules — a longer passphrase is
// accepted, per the Phase 2 spec ("a long password/passphrase should be
// acceptable").
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128; // sanity ceiling, prevents abuse via huge inputs into bcrypt

// bcrypt cost factor for password hashing.
export const BCRYPT_SALT_ROUNDS = 12;

// Login rate limiting (see lib/auth/rate-limit.ts).
export const LOGIN_RATE_LIMIT_MAX_FAILED_ATTEMPTS = 5;
export const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
