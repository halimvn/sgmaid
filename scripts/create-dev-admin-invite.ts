/**
 * ============================================================
 * DEVELOPMENT-ONLY — ADMIN account setup invitation generator
 * ============================================================
 * Phase 6 requires a first SG Maid staff (ADMIN) account to actually use
 * the /admin dashboard. There is still no admin UI for creating other
 * admins, or a transactional email service — this script reuses the
 * exact same invitation → password-setup → ACTIVE flow already built
 * for employers in Phase 2 (lib/auth/tokens.ts, /setup-password), just
 * with role: "ADMIN" instead of "EMPLOYER". completeAccountSetup()
 * (lib/auth/account-setup.ts) never looks at role at all, so nothing
 * about that flow needed to change to support this.
 *
 * It refuses to run unless NODE_ENV is explicitly NOT "production" (see
 * the guard below) — this is a safety rail, not a feature. This script
 * never sets or knows a password — it only prints a one-time setup link;
 * the admin chooses their own password via /setup-password, exactly
 * like an employer does. Never commit real admin credentials anywhere.
 *
 * Usage:
 *   npm run dev:invite-admin -- --name "Jane Tan" --email jane@sgmaid.example --mobile "+65 9123 4567"
 *
 * (npm's `--` passes the flags after it straight through to the script.
 * The dev:invite-admin script runs this file with
 * `tsx --conditions=react-server` — required because lib/db.ts and
 * lib/auth/** are marked "server-only".)
 *
 * Creates (or resets to PENDING) an ADMIN User row with passwordHash =
 * null, generates a single ACCOUNT_SETUP token, and prints the one-time
 * local setup URL.
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
      'Usage: npm run dev:invite-admin -- --name "Jane Tan" --email jane@sgmaid.example [--mobile "+65 9123 4567"]'
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
      `⚠ ${normalizedEmail} already exists with status ${existing.status} (role ${existing.role}). This will reset it back to PENDING with no password (dev-only reset) and set role to ADMIN, purely to test the invitation flow again.`
    );
  }

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: { fullName: name, mobileNumber: mobile, role: "ADMIN", status: "PENDING", passwordHash: null },
    create: { fullName: name, email: normalizedEmail, mobileNumber: mobile, role: "ADMIN", status: "PENDING" },
  });

  const { rawToken, expiresAt } = await createAuthToken(user.id, "ACCOUNT_SETUP");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const setupUrl = `${appUrl}/setup-password?token=${rawToken}`;

  console.log("\nDevelopment ADMIN invitation created.");
  console.log(`  User:    ${user.fullName} <${user.email}> (${user.id})`);
  console.log(`  Role:    ADMIN`);
  console.log(`  Status:  PENDING (passwordHash: null)`);
  console.log(`  Expires: ${expiresAt.toISOString()}`);
  console.log("\nOne-time setup link (open this in a browser):\n");
  console.log(`  ${setupUrl}\n`);
  console.log("This link is single-use and will stop working once the password is set.");
  console.log("After setup, the account will be role=ADMIN, status=ACTIVE and can sign in at /login, then visit /admin.");
}

main()
  .catch((err) => {
    console.error("Failed to create development admin invitation:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
