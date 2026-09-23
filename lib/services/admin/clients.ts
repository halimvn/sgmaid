import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/authorize";
import { hashPassword } from "@/lib/auth/password";
import { CLIENT_ACCESS_DURATION_MS } from "@/lib/auth/constants";
import {
  CLIENT_PAGE_SIZE,
  parseClientId as parseUserId,
  type CreateClientFormData,
  type EditClientDetailsData,
} from "@/lib/validation/client";

/**
 * Admin client-account management data layer — Phase 8.
 *
 * Same privacy-boundary pattern as lib/services/admin/maids.ts: every
 * exported function calls requireAdmin() itself, first, and derives the
 * acting admin's identity only from that call. This is what makes the
 * /admin/clients/* pages' own requireAdmin() layout guard defense in
 * depth rather than the only check.
 *
 * A client/EMPLOYER account created here goes straight to ACTIVE with a
 * staff-set password — there is no PENDING/invite step for this flow
 * (compare lib/auth/account-setup.ts, which is still the ADMIN
 * invitation path and is untouched). Staff choosing the password
 * directly, rather than the employer setting their own, is the explicit
 * business requirement this phase implements.
 *
 * Never store, return, or log a plaintext password anywhere in this
 * file — every function that accepts one hashes it immediately and
 * only ever holds the hash from that point on. The one place a plaintext
 * password is shown back to staff (the create-client success screen) is
 * a pure pass-through of what the SAME request just received — see
 * lib/actions/admin/clients.ts and components/admin/CreateClientForm.tsx
 * for why that never touches this file or the database again.
 */

// ------------------------------------------------------------
// Audit log
// ------------------------------------------------------------

type ClientAuditAction = "CLIENT_ACCESS_CREATED" | "CLIENT_ACCESS_EXTENDED" | "CLIENT_PASSWORD_RESET" | "CLIENT_STATUS_CHANGED";

async function logClientAudit(actorId: string, action: ClientAuditAction, targetUserId: string) {
  // Best-effort: a failed audit write must never block or roll back the
  // actual client-account change it's describing. Never pass anything
  // password-shaped into `data` here — there is no field for it.
  try {
    await prisma.auditLog.create({ data: { actorId, action, targetUserId } });
  } catch (err) {
    console.error("Failed to write client audit log:", err);
  }
}

// ------------------------------------------------------------
// DTOs
// ------------------------------------------------------------

export type ClientStatus = "ACTIVE" | "SUSPENDED" | "INACTIVE" | "PENDING";

export type ClientListItem = {
  id: string;
  username: string;
  fullName: string;
  mobileNumber: string | null;
  status: ClientStatus;
  createdAt: string;
  accessExpiresAt: string | null;
  /** Human-readable operational label — "Active — 2 days remaining", "Expires today", "Expired", "Suspended", "Inactive". */
  remainingLabel: string;
};

export type ClientListResult = {
  items: ClientListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type ClientDetail = {
  id: string;
  username: string;
  fullName: string;
  mobileNumber: string | null;
  email: string | null;
  status: ClientStatus;
  createdAt: string;
  accessExpiresAt: string | null;
};

/** Never passwordHash, never sessionVersion — same "explicit select, no raw model" rule as every other DTO in this project. */
function remainingLabel(status: string, accessExpiresAt: Date | null, now: Date): string {
  if (status === "SUSPENDED") return "Suspended";
  if (status === "INACTIVE") return "Inactive";
  if (status === "PENDING") return "Pending";
  if (!accessExpiresAt) return "No access window set";

  const remainingMs = accessExpiresAt.getTime() - now.getTime();
  if (remainingMs <= 0) return "Expired";

  const remainingDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  if (remainingDays >= 1) return `Active — ${remainingDays} day${remainingDays === 1 ? "" : "s"} remaining`;
  return "Expires today";
}

// ------------------------------------------------------------
// Read operations
// ------------------------------------------------------------

export type ClientListFilters = { search?: string; page: number };

export async function getClientList(filters: ClientListFilters): Promise<ClientListResult> {
  await requireAdmin();

  const where: Prisma.UserWhereInput = { role: "EMPLOYER" };
  if (filters.search) {
    where.OR = [
      { username: { contains: filters.search, mode: "insensitive" } },
      { fullName: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const skip = (filters.page - 1) * CLIENT_PAGE_SIZE;
  const now = new Date();

  const [rows, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: CLIENT_PAGE_SIZE,
      select: {
        id: true,
        username: true,
        fullName: true,
        mobileNumber: true,
        status: true,
        createdAt: true,
        accessExpiresAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  const items: ClientListItem[] = rows.map((row) => ({
    id: row.id,
    username: row.username ?? "—",
    fullName: row.fullName,
    mobileNumber: row.mobileNumber,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    accessExpiresAt: row.accessExpiresAt ? row.accessExpiresAt.toISOString() : null,
    remainingLabel: remainingLabel(row.status, row.accessExpiresAt, now),
  }));

  return {
    items,
    page: filters.page,
    pageSize: CLIENT_PAGE_SIZE,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / CLIENT_PAGE_SIZE)),
  };
}

export async function getClient(rawId: string): Promise<ClientDetail | null> {
  await requireAdmin();

  const id = parseUserId(rawId);
  if (!id) return null;

  const row = await prisma.user.findFirst({
    where: { id, role: "EMPLOYER" },
    select: {
      id: true,
      username: true,
      fullName: true,
      mobileNumber: true,
      email: true,
      status: true,
      createdAt: true,
      accessExpiresAt: true,
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    username: row.username ?? "—",
    fullName: row.fullName,
    mobileNumber: row.mobileNumber,
    email: row.email,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    accessExpiresAt: row.accessExpiresAt ? row.accessExpiresAt.toISOString() : null,
  };
}

// ------------------------------------------------------------
// Write operations
// ------------------------------------------------------------

export type CreateClientResult =
  | { ok: true; id: string; username: string; accessExpiresAt: string }
  | { ok: false; reason: "DUPLICATE_USERNAME" };

/**
 * Creates a new client/EMPLOYER account: hashes the staff-set password,
 * computes accessExpiresAt = server time + CLIENT_ACCESS_DURATION_MS
 * (never a client-submitted date — see lib/auth/constants.ts), and
 * activates the account immediately (no PENDING/invite step). Rejects
 * (never overwrites) an already-used username — client identities are
 * never silently merged, unlike a maid's profileCode upsert-by-code
 * behaviour.
 */
export async function createClient(data: CreateClientFormData): Promise<CreateClientResult> {
  const admin = await requireAdmin();

  const existing = await prisma.user.findUnique({ where: { username: data.username }, select: { id: true } });
  if (existing) {
    return { ok: false, reason: "DUPLICATE_USERNAME" };
  }

  const passwordHash = await hashPassword(data.password);
  const accessExpiresAt = new Date(Date.now() + CLIENT_ACCESS_DURATION_MS);

  const user = await prisma.user.create({
    data: {
      fullName: data.fullName,
      username: data.username,
      email: data.email ?? null,
      mobileNumber: data.mobileNumber ?? null,
      passwordHash,
      role: "EMPLOYER",
      status: "ACTIVE",
      accessExpiresAt,
    },
    select: { id: true },
  });

  await logClientAudit(admin.id, "CLIENT_ACCESS_CREATED", user.id);

  return { ok: true, id: user.id, username: data.username, accessExpiresAt: accessExpiresAt.toISOString() };
}

export type UpdateClientDetailsResult = { ok: true } | { ok: false; reason: "NOT_FOUND" };

/** Full Name, Mobile, Email, and Status — deliberately never username, password, or accessExpiresAt (each has its own dedicated function below). */
export async function updateClientDetails(rawId: string, data: EditClientDetailsData): Promise<UpdateClientDetailsResult> {
  const admin = await requireAdmin();

  const id = parseUserId(rawId);
  if (!id) return { ok: false, reason: "NOT_FOUND" };

  const existing = await prisma.user.findFirst({ where: { id, role: "EMPLOYER" }, select: { id: true, status: true } });
  if (!existing) return { ok: false, reason: "NOT_FOUND" };

  await prisma.user.update({
    where: { id },
    data: {
      fullName: data.fullName,
      mobileNumber: data.mobileNumber ?? null,
      email: data.email ?? null,
      status: data.status,
    },
  });

  if (existing.status !== data.status) {
    await logClientAudit(admin.id, "CLIENT_STATUS_CHANGED", id);
  }

  return { ok: true };
}

export type ExtendClientAccessResult = { ok: true; accessExpiresAt: string } | { ok: false; reason: "NOT_FOUND" };

/**
 * Extend Access by 3 Days. If the current access has NOT yet expired, the
 * new expiry is (current accessExpiresAt + 3 days) — extending stacks
 * onto remaining time rather than discarding it. If it HAS already
 * expired (this is also how a fully expired client is reactivated), the
 * new expiry is (server now + 3 days) — never computed from the stale
 * past expiry, and never from anything client-submitted.
 */
export async function extendClientAccess(rawId: string): Promise<ExtendClientAccessResult> {
  const admin = await requireAdmin();

  const id = parseUserId(rawId);
  if (!id) return { ok: false, reason: "NOT_FOUND" };

  const existing = await prisma.user.findFirst({ where: { id, role: "EMPLOYER" }, select: { accessExpiresAt: true } });
  if (!existing) return { ok: false, reason: "NOT_FOUND" };

  const now = Date.now();
  const stillValid = existing.accessExpiresAt !== null && existing.accessExpiresAt.getTime() > now;
  const base = stillValid ? existing.accessExpiresAt!.getTime() : now;
  const accessExpiresAt = new Date(base + CLIENT_ACCESS_DURATION_MS);

  await prisma.user.update({ where: { id }, data: { accessExpiresAt } });
  await logClientAudit(admin.id, "CLIENT_ACCESS_EXTENDED", id);

  return { ok: true, accessExpiresAt: accessExpiresAt.toISOString() };
}

export type ResetClientPasswordResult = { ok: true } | { ok: false; reason: "NOT_FOUND" };

/**
 * Admin sets a new password for a client. Immediately increments
 * sessionVersion so every existing session for this account — anywhere
 * it's currently logged in — stops working right away (same revocation
 * pattern as lib/services/account.ts changeEmployerPassword()). Never
 * returns, stores, or logs the new password anywhere past this call —
 * the admin already has it because they just typed it.
 */
export async function resetClientPassword(rawId: string, newPassword: string): Promise<ResetClientPasswordResult> {
  const admin = await requireAdmin();

  const id = parseUserId(rawId);
  if (!id) return { ok: false, reason: "NOT_FOUND" };

  const existing = await prisma.user.findFirst({ where: { id, role: "EMPLOYER" }, select: { id: true } });
  if (!existing) return { ok: false, reason: "NOT_FOUND" };

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id }, data: { passwordHash, sessionVersion: { increment: 1 } } });
  await logClientAudit(admin.id, "CLIENT_PASSWORD_RESET", id);

  return { ok: true };
}
