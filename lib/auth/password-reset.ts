import "server-only";
import { prisma } from "@/lib/db";
import { hashPassword, isPasswordLengthValid } from "./password";
import { validateAuthToken } from "./tokens";

/**
 * Password-reset completion — backend foundation only, Phase 2.
 *
 * There is no transactional email provider yet (see
 * scripts/create-dev-password-reset.ts for the development-only way to
 * generate a reset link). This module implements the secure completion
 * logic so it's ready the moment email delivery exists — it does not
 * pretend delivery is wired up.
 *
 * On success, sessionVersion is incremented, which immediately revokes
 * every existing session for the user (see lib/auth/authorize.ts) — a
 * password reset should invalidate whatever session an attacker with the
 * old password might already hold.
 */

export type PasswordResetResult =
  | { ok: true }
  | { ok: false; reason: "INVALID_OR_EXPIRED" | "WEAK_PASSWORD" | "PASSWORDS_DONT_MATCH" };

export async function completePasswordReset(
  rawToken: string,
  newPassword: string,
  confirmPassword: string
): Promise<PasswordResetResult> {
  if (newPassword !== confirmPassword) {
    return { ok: false, reason: "PASSWORDS_DONT_MATCH" };
  }

  if (!isPasswordLengthValid(newPassword)) {
    return { ok: false, reason: "WEAK_PASSWORD" };
  }

  const validation = await validateAuthToken(rawToken, "PASSWORD_RESET");
  if (!validation.ok) {
    return { ok: false, reason: "INVALID_OR_EXPIRED" };
  }

  const user = await prisma.user.findUnique({ where: { id: validation.userId } });
  if (!user) {
    return { ok: false, reason: "INVALID_OR_EXPIRED" };
  }

  const passwordHash = await hashPassword(newPassword);
  const now = new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    }),
    prisma.userAuthToken.update({
      where: { id: validation.tokenId },
      data: { usedAt: now },
    }),
    prisma.userAuthToken.updateMany({
      where: { userId: user.id, purpose: "PASSWORD_RESET", usedAt: null },
      data: { usedAt: now },
    }),
  ]);

  return { ok: true };
}
