import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/authorize";
import { hashPassword } from "@/lib/auth/password";
import {
  ADMIN_USERS_PAGE_SIZE,
  parseAdminUserId,
  type CreateAdminUserFormData,
} from "@/lib/validation/admin-user";

/**
 * Staff (ADMIN) account management — lets an existing admin create other admins
 * and manage them, so no database/script access is needed to onboard staff.
 *
 * Same privacy-boundary pattern as lib/services/admin/clients.ts: every export
 * calls requireAdmin() itself, first, and takes the acting admin's identity only
 * from that call. Passwords are hashed on arrival and never stored, returned or
 * logged; audit rows carry actor/target/action only.
 *
 * Two lock-out guards live here, not in the UI, so they cannot be bypassed by a
 * crafted request: an admin cannot deactivate their own account, and the last
 * ACTIVE admin can never be deactivated by anyone.
 *
 * Admins have no accessExpiresAt (that 3-day window is for clients only — see
 * lib/auth/authorize.ts), and they sign in with the username set here (or their
 * email, if they have one — see lib/auth/credentials.ts).
 */

type AdminAuditAction = "ADMIN_ACCOUNT_CREATED" | "ADMIN_PASSWORD_RESET" | "ADMIN_STATUS_CHANGED";

async function logAdminAudit(actorId: string, action: AdminAuditAction, targetUserId: string) {
  // Best-effort — a failed audit write must never undo the change it describes.
  try {
    await prisma.auditLog.create({ data: { actorId, action, targetUserId } });
  } catch (err) {
    console.error("Failed to write admin audit log:", err);
  }
}

export type AdminUserStatus = "ACTIVE" | "SUSPENDED" | "INACTIVE" | "PENDING";

export type AdminUserListItem = {
  id: string;
  fullName: string;
  username: string | null;
  email: string | null;
  status: AdminUserStatus;
  createdAt: string;
  lastLoginAt: string | null;
  isCurrentUser: boolean;
};

export type AdminUserListResult = {
  items: AdminUserListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type AdminUserDetail = AdminUserListItem;

// Explicit select: never passwordHash, sessionVersion, or anything else.
const ADMIN_SELECT = {
  id: true,
  fullName: true,
  username: true,
  email: true,
  status: true,
  createdAt: true,
  lastLoginAt: true,
} satisfies Prisma.UserSelect;

type AdminRow = Prisma.UserGetPayload<{ select: typeof ADMIN_SELECT }>;

function toDto(row: AdminRow, currentUserId: string): AdminUserListItem {
  return {
    id: row.id,
    fullName: row.fullName,
    username: row.username,
    email: row.email,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
    isCurrentUser: row.id === currentUserId,
  };
}

export async function getAdminUserList(page: number): Promise<AdminUserListResult> {
  const me = await requireAdmin();
  const where: Prisma.UserWhereInput = { role: "ADMIN" };

  const [rows, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * ADMIN_USERS_PAGE_SIZE,
      take: ADMIN_USERS_PAGE_SIZE,
      select: ADMIN_SELECT,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: rows.map((r) => toDto(r, me.id)),
    page,
    pageSize: ADMIN_USERS_PAGE_SIZE,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / ADMIN_USERS_PAGE_SIZE)),
  };
}

export async function getAdminUser(rawId: string): Promise<AdminUserDetail | null> {
  const me = await requireAdmin();
  const id = parseAdminUserId(rawId);
  if (!id) return null;

  const row = await prisma.user.findFirst({ where: { id, role: "ADMIN" }, select: ADMIN_SELECT });
  return row ? toDto(row, me.id) : null;
}

export type CreateAdminUserResult =
  | { ok: true; id: string; username: string }
  | { ok: false; reason: "DUPLICATE_USERNAME" | "DUPLICATE_EMAIL" };

export async function createAdminUser(data: CreateAdminUserFormData): Promise<CreateAdminUserResult> {
  const me = await requireAdmin();

  if (await prisma.user.findUnique({ where: { username: data.username }, select: { id: true } })) {
    return { ok: false, reason: "DUPLICATE_USERNAME" };
  }
  const email = data.email ? data.email.toLowerCase() : null;
  if (email && (await prisma.user.findUnique({ where: { email }, select: { id: true } }))) {
    return { ok: false, reason: "DUPLICATE_EMAIL" };
  }

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: { fullName: data.fullName, username: data.username, email, passwordHash, role: "ADMIN", status: "ACTIVE" },
    select: { id: true },
  });

  await logAdminAudit(me.id, "ADMIN_ACCOUNT_CREATED", user.id);
  return { ok: true, id: user.id, username: data.username };
}

export type UpdateAdminStatusResult =
  | { ok: true }
  | { ok: false; reason: "NOT_FOUND" | "CANNOT_DEACTIVATE_SELF" | "LAST_ACTIVE_ADMIN" };

export async function updateAdminUserStatus(
  rawId: string,
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE"
): Promise<UpdateAdminStatusResult> {
  const me = await requireAdmin();
  const id = parseAdminUserId(rawId);
  if (!id) return { ok: false, reason: "NOT_FOUND" };

  const target = await prisma.user.findFirst({ where: { id, role: "ADMIN" }, select: { id: true, status: true } });
  if (!target) return { ok: false, reason: "NOT_FOUND" };
  if (target.status === status) return { ok: true };

  if (status !== "ACTIVE") {
    if (target.id === me.id) return { ok: false, reason: "CANNOT_DEACTIVATE_SELF" };
    // Never leave the portal with nobody able to sign in to it.
    const otherActive = await prisma.user.count({ where: { role: "ADMIN", status: "ACTIVE", id: { not: id } } });
    if (target.status === "ACTIVE" && otherActive === 0) return { ok: false, reason: "LAST_ACTIVE_ADMIN" };
  }

  // Status is re-read on every request, so a suspend bites immediately; bumping sessionVersion
  // also ensures a session issued before a suspend can't come back to life on re-activation.
  await prisma.user.update({ where: { id }, data: { status, sessionVersion: { increment: 1 } } });
  await logAdminAudit(me.id, "ADMIN_STATUS_CHANGED", id);
  return { ok: true };
}

export type ResetAdminPasswordResult = { ok: true; signedOut: boolean } | { ok: false; reason: "NOT_FOUND" };

/**
 * Sets a new password for an admin (including the caller's own — this is also how an
 * admin changes their own password). Increments sessionVersion, so every existing
 * session for that account ends; `signedOut` tells the caller that includes their own.
 */
export async function resetAdminUserPassword(rawId: string, newPassword: string): Promise<ResetAdminPasswordResult> {
  const me = await requireAdmin();
  const id = parseAdminUserId(rawId);
  if (!id) return { ok: false, reason: "NOT_FOUND" };

  const target = await prisma.user.findFirst({ where: { id, role: "ADMIN" }, select: { id: true } });
  if (!target) return { ok: false, reason: "NOT_FOUND" };

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id }, data: { passwordHash, sessionVersion: { increment: 1 } } });
  await logAdminAudit(me.id, "ADMIN_PASSWORD_RESET", id);
  return { ok: true, signedOut: id === me.id };
}
