/**
 * ============================================================
 * DEVELOPMENT-ONLY — account setup invitation generator
 * ============================================================
 * Phase 8 superseded this as the primary way to create an EMPLOYER/client
 * account — the real workflow now is SG Maid staff using
 * /admin/clients/new (lib/services/admin/clients.ts createClient()),
 * which sets a username + temporary password directly and activates the
 * account immediately, with a 3-day access window. This script is kept
 * only because the underlying invitation/password-setup token
 * architecture (lib/auth/tokens.ts, /setup-password) is still the ADMIN
 * onboarding path (see create-dev-admin-invite.ts) and may be useful
 * again later — but a User row created by THIS script has no `username`,
 * so it cannot actually log in under the current EMPLOYER-login-by-username
 * rule (see lib/auth/credentials.ts) even after completing setup. Use
 * /admin/clients/new for a real, working test employer instead.
 *
 * There is no SG Maid admin interface or transactional email service yet.
 * This script stands in for both, purely so the real invitation →
 * password-setup → ACTIVE flow can be exercised end-to-end in
 * development. It is NOT how invitations will be sent in production —
 * that will be an admin action that triggers a real email.
 *
 * It refuses to run unless NODE_ENV is explicitly NOT "production" (see
 * the guard below) — this is a safety rail, not a feature.
 *
 * Usage:
 *   npm run dev:invite -- --name "Jane Tan" --email jane@example.test --mobile "+65 9123 4567"
 *
 * (npm's `--` passes the flags after it straight through to the script.
 * The dev:invite script runs this file with `tsx --conditions=react-server`
 * — required because lib/db.ts and lib/auth/** are marked "server-only",
 * a marker Next.js's bundler understands but a plain tsx/Node run does
 * not without that flag. Running `npx tsx scripts/create-dev-employer-invite.ts`
 * directly, without the flag, will fail with a "cannot be imported from a
 * Client Component" error — use the npm script instead.)
 *
 * Creates (or resets to PENDING) a fictional EMPLOYER User row with
 * passwordHash = null, generates a single ACCOUNT_SETUP token, and prints
 * the one-time local setup URL. Never seed a real password here — the
 * whole point of this flow is that SG Maid staff never know the
 * employer's password.
 */

import "dotenv/config";
import { prisma } from "../lib/db";
import { createAuthToken } from "../lib/auth/tokens";

// Safety rail: this script must never run against a production
// environment, even if someone points DATABASE_URL at one by mistake.
if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run: NODE_ENV=production. This script is development-only.");
  process.exit(1);
}

function parseArgs(): { name: string; email: string; mobile?: string } {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const name = get("--name");
  const email = get("--email");
  const mobile = get("--mobile");

  if (!name || !email) {
    console.error(
      'Usage: npm run dev:invite -- --name "Jane Tan" --email jane@example.test [--mobile "+65 9123 4567"]'
    );
    process.exit(1);
  }

  return { name, email, mobile };
}

async function main() {
  const { name, email, mobile } = parseArgs();
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing && existing.status !== "PENDING") {
    console.warn(
      `⚠ ${normalizedEmail} already exists with status ${existing.status}. This will reset it back to PENDING with no password (dev-only reset), purely to test the invitation flow again.`
    );
  }

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: { fullName: name, mobileNumber: mobile, role: "EMPLOYER", status: "PENDING", passwordHash: null },
    create: { fullName: name, email: normalizedEmail, mobileNumber: mobile, role: "EMPLOYER", status: "PENDING" },
  });

  const { rawToken, expiresAt } = await createAuthToken(user.id, "ACCOUNT_SETUP");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const setupUrl = `${appUrl}/setup-password?token=${rawToken}`;

  console.log("\nDevelopment employer invitation created.");
  console.log(`  User:    ${user.fullName} <${user.email}> (${user.id})`);
  console.log(`  Status:  PENDING (passwordHash: null)`);
  console.log(`  Expires: ${expiresAt.toISOString()}`);
  console.log("\nOne-time setup link (open this in a browser):\n");
  console.log(`  ${setupUrl}\n`);
  console.log("This link is single-use and will stop working once the password is set.");
}

main()
  .catch((err) => {
    console.error("Failed to create development invitation:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
