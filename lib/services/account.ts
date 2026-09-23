import "server-only";
import { prisma } from "@/lib/db";
import { requireEmployer } from "@/lib/auth/authorize";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

/**
 * Employer-safe "My Account" data layer — Phase 7, revised Phase 8.
 *
 * Same privacy-boundary pattern as lib/services/maids.ts and
 * lib/services/shortlist.ts: every exported function calls
 * requireEmployer() itself, first, and the employer identity used in
 * every query below is ALWAYS `employer.id` from that call — never a
 * value accepted as a parameter. No function signature here even
 * accepts a userId, which is what makes it structurally impossible for
 * an employer to read or update another User's row, regardless of what
 * a caller sends.
 *
 * Nothing here ever selects or returns passwordHash, sessionVersion, or
 * role — see EmployerAccountDTO. Phase 8: `username` and
 * `accessExpiresAt` are both read-only here too — deliberately not
 * accepted by updateEmployerProfile() below. Both stay
 * Admin-controlled: a client can see their own username and access
 * window, but can never change either themselves (see
 * lib/services/admin/clients.ts for the only functions that can).
 */

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  INACTIVE: "Inactive",
};

export type EmployerAccountDTO = {
  fullName: string;
  /** Login identifier (Phase 8). Null only for an account somehow never assigned one — shouldn't happen for an ACTIVE employer, who can only be ACTIVE via the staff-create flow, which always sets it. */
  username: string | null;
  /** Optional contact info only — never the login identifier (see lib/auth/credentials.ts). */
  email: string | null;
  mobileNumber: string | null;
  statusLabel: string;
  /** ISO timestamp, or null for an account with no staff-issued expiry (shouldn't happen for an ACTIVE employer). Server-computed only — see lib/services/admin/clients.ts. */
  accessExpiresAt: string | null;
};

/** Account info for /dashboard/account. Always the caller's own row — requireEmployer() is the only source of identity. */
export async function getEmployerAccount(): Promise<EmployerAccountDTO> {
  const employer = await requireEmployer();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: employer.id },
    select: { fullName: true, username: true, email: true, mobileNumber: true, status: true, accessExpiresAt: true },
  });

  return {
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    mobileNumber: user.mobileNumber,
    statusLabel: STATUS_LABEL[user.status] ?? user.status,
    accessExpiresAt: user.accessExpiresAt ? user.accessExpiresAt.toISOString() : null,
  };
}

/**
 * Updates only Full Name and Mobile Number on the authenticated
 * employer's own row. Deliberately picks exactly these two fields into
 * the Prisma `data` object (never `...data` spread) — even if a caller
 * somehow passed extra properties (role, status, sessionVersion, id),
 * they are silently ignored, never reaching the database write. Email
 * is read-only in this phase and is never accepted here at all.
 */
export async function updateEmployerProfile(data: { fullName: string; mobileNumber: string | null }): Promise<void> {
  const employer = await requireEmployer();

  await prisma.user.update({
    where: { id: employer.id },
    data: {
      fullName: data.fullName,
      mobileNumber: data.mobileNumber,
    },
  });
}

export type ChangePasswordResult = { ok: true } | { ok: false; reason: "WRONG_CURRENT_PASSWORD" };

/**
 * Changes the authenticated employer's own password. Verifies
 * `currentPassword` against the real stored hash before doing anything
 * else — a wrong current password never touches passwordHash or
 * sessionVersion. On success, bumps sessionVersion (same revocation
 * pattern as lib/auth/password-reset.ts's completePasswordReset()) so
 * every existing session for this user — including the one that just
 * made this request — stops working immediately; the caller (the
 * Server Action) is responsible for signing the current session out
 * right afterward so the employer isn't left with a session their own
 * next request would bounce out of anyway.
 *
 * Phase 8: deliberately never touches accessExpiresAt — a self-service
 * password change is not a way to extend staff-issued access. Only
 * lib/services/admin/clients.ts extendClientAccess() can move that date.
 */
export async function changeEmployerPassword(currentPassword: string, newPassword: string): Promise<ChangePasswordResult> {
  const employer = await requireEmployer();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: employer.id },
    select: { passwordHash: true },
  });

  // No passwordHash (shouldn't happen for an ACTIVE employer, who can
  // only have reached ACTIVE by setting one — see completeAccountSetup())
  // verifies against nothing and safely fails the same way a wrong
  // password would, never a different/more revealing error.
  const currentMatches = user.passwordHash ? await verifyPassword(currentPassword, user.passwordHash) : false;
  if (!currentMatches) {
    return { ok: false, reason: "WRONG_CURRENT_PASSWORD" };
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: employer.id },
    data: { passwordHash, sessionVersion: { increment: 1 } },
  });

  return { ok: true };
}
