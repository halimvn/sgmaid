/**
 * ============================================================
 * DEVELOPMENT-ONLY — password reset link generator
 * ============================================================
 * Phase 8: an EMPLOYER/client account no longer has an email-based reset
 * path at all by design (see lib/auth/credentials.ts — a client's login
 * identifier is a username, not an email; a forgotten client password is
 * an assisted staff reset via /admin/clients/[id]/edit → Reset Password,
 * see lib/services/admin/clients.ts resetClientPassword()). This script
 * now only makes sense for an ADMIN account, which still logs in by
 * email and still uses this token architecture — same rationale as
 * scripts/create-dev-employer-invite.ts: there is no transactional email
 * provider yet, so this stands in for "admin clicks 'forgot password', we
 * email them a link" purely to exercise the real completePasswordReset()
 * logic during development. It does not pretend email delivery exists.
 *
 * Usage:
 *   npm run dev:reset-link -- --email jane@example.test
 *
 * (See scripts/create-dev-employer-invite.ts for why this must run
 * through the dev:reset-link npm script rather than `npx tsx` directly.)
 *
 * Prints a one-time local reset URL for an EXISTING user. Never prints or
 * logs the user's current or new password.
 */

import "dotenv/config";
import { prisma } from "../lib/db";
import { createAuthToken } from "../lib/auth/tokens";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run: NODE_ENV=production. This script is development-only.");
  process.exit(1);
}

function parseArgs(): { email: string } {
  const args = process.argv.slice(2);
  const i = args.indexOf("--email");
  const email = i !== -1 ? args[i + 1] : undefined;

  if (!email) {
    console.error("Usage: npm run dev:reset-link -- --email jane@example.test");
    process.exit(1);
  }

  return { email };
}

async function main() {
  const { email } = parseArgs();
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    console.error(`No user found with email ${normalizedEmail}.`);
    process.exitCode = 1;
    return;
  }

  const { rawToken, expiresAt } = await createAuthToken(user.id, "PASSWORD_RESET");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

  console.log("\nDevelopment password reset link created.");
  console.log(`  User:    ${user.fullName} <${user.email}> (${user.id})`);
  console.log(`  Expires: ${expiresAt.toISOString()}`);
  console.log("\nOne-time reset link (open this in a browser):\n");
  console.log(`  ${resetUrl}\n`);
  console.log("This link is single-use and will stop working once the password is reset.");
}

main()
  .catch((err) => {
    console.error("Failed to create development reset link:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
