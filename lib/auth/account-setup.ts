import "server-only";
import { prisma } from "@/lib/db";
import { hashPassword, isPasswordLengthValid } from "./password";
import { validateAuthToken } from "./tokens";
import { PASSWORD_MIN_LENGTH } from "./constants";

/**
 * Account-setup completion — Phase 2.
 *
 * Employer journey step: PENDING user + valid ACCOUNT_SETUP token +
 * chosen password → passwordHash set, status becomes ACTIVE, token (and
 * any other outstanding ACCOUNT_SETUP tokens for the user) consumed.
 *
 * Deliberately returns a small set of generic outcomes — the caller
 * (app/setup-password) must show a safe, non-specific message for every
 * failure case per the Phase 2 spec ("do not reveal unnecessary database
 * details").
 */

export type AccountSetupResult =
  | { ok: true }
  | { ok: false; reason: "INVALID_OR_EXPIRED" | "WEAK_PASSWORD" | "PASSWORDS_DONT_MATCH" };

export async function completeAccountSetup(
  rawToken: string,
  newPassword: string,
  confirmPassword: string
): Promise<AccountSetupResult> {
  if (newPassword !== confirmPassword) {
    return { ok: false, reason: "PASSWORDS_DONT_MATCH" };
  }

  if (!isPasswordLengthValid(newPassword)) {
    return { ok: false, reason: "WEAK_PASSWORD" };
  }

  const validation = await validateAuthToken(rawToken, "ACCOUNT_SETUP");
  if (!validation.ok) {
    // INVALID / EXPIRED / USED are all collapsed into one generic outcome
    // for the caller — no hint about which case it was.
    return { ok: false, reason: "INVALID_OR_EXPIRED" };
  }

  const user = await prisma.user.findUnique({ where: { id: validation.userId } });
  if (!user || user.status !== "PENDING") {
    // A PENDING-only check is deliberate: a token for an already-ACTIVE
    // or SUSPENDED/INACTIVE user should not be able to (re)activate or
    // silently reset a password through this flow.
    return { ok: false, reason: "INVALID_OR_EXPIRED" };
  }

  const passwordHash = await hashPassword(newPassword);
  const now = new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, status: "ACTIVE" },
    }),
    prisma.userAuthToken.update({
      where: { id: validation.tokenId },
      data: { usedAt: now },
    }),
    // Belt-and-braces: invalidate any other still-outstanding ACCOUNT_SETUP
    // tokens for this user (e.g. from an earlier re-issued invitation)
    // now that the account is active.
    prisma.userAuthToken.updateMany({
      where: { userId: user.id, purpose: "ACCOUNT_SETUP", usedAt: null },
      data: { usedAt: now },
    }),
  ]);

  return { ok: true };
}

export { PASSWORD_MIN_LENGTH };
