import "server-only";
import crypto from "node:crypto";
import type { AuthTokenPurpose } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ACCOUNT_SETUP_TOKEN_TTL_MS, PASSWORD_RESET_TOKEN_TTL_MS } from "./constants";

/**
 * One-time auth tokens (account setup + password reset) — Phase 2.
 *
 * The raw token is generated with a cryptographically secure random
 * source and handed to the caller exactly once (to build an invitation/
 * reset URL). Only a SHA-256 hash of it is ever persisted — a database
 * read alone can never reconstruct a usable token. Never log the raw
 * token or the hash.
 */

const RAW_TOKEN_BYTES = 32; // 256 bits of entropy

export function generateRawToken(): string {
  return crypto.randomBytes(RAW_TOKEN_BYTES).toString("base64url");
}

export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function ttlForPurpose(purpose: AuthTokenPurpose): number {
  switch (purpose) {
    case "ACCOUNT_SETUP":
      return ACCOUNT_SETUP_TOKEN_TTL_MS;
    case "PASSWORD_RESET":
      return PASSWORD_RESET_TOKEN_TTL_MS;
  }
}

/**
 * Creates a new single-use token for the given user/purpose and returns
 * the RAW token (caller must embed it in a URL immediately — it cannot be
 * retrieved again). Also invalidates any other outstanding, unused tokens
 * of the same purpose for this user, so an old invitation/reset link
 * can't keep working alongside a freshly issued one.
 */
export async function createAuthToken(userId: string, purpose: AuthTokenPurpose) {
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + ttlForPurpose(purpose));

  await prisma.$transaction([
    prisma.userAuthToken.updateMany({
      where: { userId, purpose, usedAt: null },
      data: { usedAt: new Date() }, // mark superseded tokens as used, not deleted — keeps an audit trail
    }),
    prisma.userAuthToken.create({
      data: { userId, purpose, tokenHash, expiresAt },
    }),
  ]);

  return { rawToken, expiresAt };
}

export type TokenValidationResult =
  | { ok: true; tokenId: string; userId: string }
  | { ok: false; reason: "INVALID" | "EXPIRED" | "USED" };

/**
 * Validates a raw token against the given purpose WITHOUT consuming it.
 * Use consumeAuthToken() to actually mark it used once the caller has
 * finished acting on it (so a validation-only check, e.g. rendering the
 * setup-password form, doesn't burn the token before the user submits).
 */
export async function validateAuthToken(rawToken: string, purpose: AuthTokenPurpose): Promise<TokenValidationResult> {
  const tokenHash = hashToken(rawToken);
  const token = await prisma.userAuthToken.findUnique({ where: { tokenHash } });

  if (!token || token.purpose !== purpose) return { ok: false, reason: "INVALID" };
  if (token.usedAt) return { ok: false, reason: "USED" };
  if (token.expiresAt.getTime() < Date.now()) return { ok: false, reason: "EXPIRED" };

  return { ok: true, tokenId: token.id, userId: token.userId };
}

/** Marks a validated token as used. Call only after successfully completing the action it authorizes. */
export async function consumeAuthToken(tokenId: string) {
  await prisma.userAuthToken.update({ where: { id: tokenId }, data: { usedAt: new Date() } });
}
