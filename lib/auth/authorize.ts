import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

/**
 * Authorization — Phase 2.
 *
 * The session cookie only ever identifies WHO is asking (a user id) and
 * carries the sessionVersion that was current at sign-in time. It is
 * never trusted for WHAT that user is currently allowed to do — role and
 * status are re-read from PostgreSQL on every protected request. This is
 * what makes an ACTIVE → SUSPENDED change (or a password reset, which
 * bumps sessionVersion) take effect immediately, even for a session that
 * was already issued and is otherwise still validly signed.
 *
 * evaluateAccess() is the pure, unit-testable core: given a userId and
 * the sessionVersion the caller's session was issued with, it does the
 * DB lookup and returns a plain result — no Next.js redirect, no request
 * object. requireActiveUser()/requireEmployer()/requireAdmin() below are
 * thin, redirect-on-failure wrappers around it for use directly in Server
 * Components/layouts. Keeping the logic layer separate from the
 * redirect-throwing wrapper is what makes it testable without needing to
 * mock Next.js internals.
 */

export type AuthorizedUser = {
  id: string;
  fullName: string;
  email: string;
  role: "EMPLOYER" | "ADMIN";
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "INACTIVE";
};

export type AccessResult =
  | { allowed: true; user: AuthorizedUser }
  | { allowed: false; reason: "NOT_FOUND" | "NOT_ACTIVE" | "SESSION_REVOKED" | "WRONG_ROLE" };

/**
 * Note: this deliberately never accepts a caller-supplied "role" or
 * "status" as the subject's claimed identity — `requiredRole` is what the
 * ROUTE demands, not something the user asserts about themselves. The
 * only thing trusted from the session is `userId`; everything about who
 * that user currently is comes from the `requiredRole` DB lookup below.
 */
export async function evaluateAccess(params: {
  userId: string;
  tokenSessionVersion: number;
  requiredRole?: "EMPLOYER" | "ADMIN";
}): Promise<AccessResult> {
  const user = await prisma.user.findUnique({ where: { id: params.userId } });

  if (!user) return { allowed: false, reason: "NOT_FOUND" };
  if (user.status !== "ACTIVE") return { allowed: false, reason: "NOT_ACTIVE" };
  if (user.sessionVersion !== params.tokenSessionVersion) return { allowed: false, reason: "SESSION_REVOKED" };
  if (params.requiredRole && user.role !== params.requiredRole) return { allowed: false, reason: "WRONG_ROLE" };

  return {
    allowed: true,
    user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, status: user.status },
  };
}

async function requireAccess(requiredRole?: "EMPLOYER" | "ADMIN"): Promise<AuthorizedUser> {
  const session = await auth();

  if (!session?.user?.id || typeof session.sessionVersion !== "number") {
    redirect("/login");
  }

  const result = await evaluateAccess({
    userId: session.user.id,
    tokenSessionVersion: session.sessionVersion,
    requiredRole,
  });

  if (!result.allowed) {
    redirect("/login");
  }

  return result.user;
}

/** Session exists, User exists, status ACTIVE. Any role. */
export async function requireActiveUser(): Promise<AuthorizedUser> {
  return requireAccess();
}

/** requireActiveUser() + role EMPLOYER. */
export async function requireEmployer(): Promise<AuthorizedUser> {
  return requireAccess("EMPLOYER");
}

/**
 * requireActiveUser() + role ADMIN. Not used by any route yet — the admin
 * UI itself is out of scope for Phase 2 — but the permission model is
 * ready for it.
 */
export async function requireAdmin(): Promise<AuthorizedUser> {
  return requireAccess("ADMIN");
}
