import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { LOGIN_RATE_LIMIT_MAX_FAILED_ATTEMPTS, LOGIN_RATE_LIMIT_WINDOW_MS } from "./constants";

/**
 * Persistent login rate limiting — Phase 2.
 *
 * Deliberately backed by PostgreSQL (LoginAttempt), not an in-memory Map:
 * this app is expected to eventually run on serverless/edge infrastructure
 * (Vercel), where in-process memory isn't shared across invocations and
 * isn't durable — an in-memory limiter would silently reset on every cold
 * start / different instance and provide close to no real protection.
 *
 * The identifier is hashed (never stored as raw email/IP) — see
 * buildLoginIdentifier().
 */

export function buildLoginIdentifier(normalizedEmail: string, ip: string): string {
  return crypto.createHash("sha256").update(`${normalizedEmail}|${ip}`).digest("hex");
}

export async function isRateLimited(identifierHash: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - LOGIN_RATE_LIMIT_WINDOW_MS);
  const recentFailures = await prisma.loginAttempt.count({
    where: { identifierHash, succeeded: false, createdAt: { gte: windowStart } },
  });
  return recentFailures >= LOGIN_RATE_LIMIT_MAX_FAILED_ATTEMPTS;
}

export async function recordLoginAttempt(identifierHash: string, succeeded: boolean): Promise<void> {
  await prisma.loginAttempt.create({ data: { identifierHash, succeeded } });

  // A successful login clears the slate — failed attempts before it no
  // longer count toward the limit. We don't want a single successful
  // login to be blocked by stale failures from, e.g., a forgotten
  // password attempt days earlier that would otherwise still be inside
  // the window.
  if (succeeded) {
    await prisma.loginAttempt.deleteMany({ where: { identifierHash, succeeded: false } });
  }
}
