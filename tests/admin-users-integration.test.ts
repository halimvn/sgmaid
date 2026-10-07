import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";

/**
 * Staff accounts against the REAL development database: an admin creates another
 * admin, and that new admin can genuinely sign in with the username + password set —
 * no database/script access needed. Only `@/auth`'s auth() is mocked (to act as the
 * test admin / the new admin). Fictional fixtures only; everything is deleted in afterAll.
 */

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const { createAdminUser, updateAdminUserStatus, resetAdminUserPassword } = await import("@/lib/services/admin/admins");
const { authenticateCredentials } = await import("@/lib/auth/credentials");
const { evaluateAccess } = await import("@/lib/auth/authorize");
const { buildLoginIdentifier } = await import("@/lib/auth/rate-limit");

const ACTING_EMAIL = "zztest-admin-users-acting@example.test";
const NEW_USERNAME = "zztestnewstaff";
const NEW_PASSWORD = "a-fictional-new-staff-passphrase";
const IP = "203.0.113.30";

let actingId: string;
let newAdminId: string;

async function clearAttempts() {
  await prisma.loginAttempt.deleteMany({ where: { identifierHash: buildLoginIdentifier(NEW_USERNAME, IP) } });
}

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { username: NEW_USERNAME } });
  const acting = await prisma.user.create({
    data: { fullName: "[Fictional] Acting Admin", email: ACTING_EMAIL, role: "ADMIN", status: "ACTIVE" },
  });
  actingId = acting.id;
  mockAuth.mockResolvedValue({ user: { id: actingId }, sessionVersion: 0 });
  await clearAttempts();
});

afterAll(async () => {
  await clearAttempts();
  await prisma.auditLog.deleteMany({ where: { actorId: actingId } }).catch(() => {});
  if (newAdminId) await prisma.user.delete({ where: { id: newAdminId } }).catch(() => {});
  await prisma.user.delete({ where: { id: actingId } }).catch(() => {});
  await prisma.$disconnect();
});

describe("Staff accounts — real database", () => {
  it("an admin creates another admin, who can then sign in with that username + password", async () => {
    const created = await createAdminUser({
      fullName: "[Fictional] New Staff",
      username: NEW_USERNAME,
      password: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
      email: undefined,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    newAdminId = created.id;

    const row = await prisma.user.findUniqueOrThrow({ where: { id: newAdminId } });
    expect(row.role).toBe("ADMIN");
    expect(row.status).toBe("ACTIVE");
    expect(row.accessExpiresAt).toBeNull();
    expect(row.passwordHash).not.toBe(NEW_PASSWORD);

    const login = await authenticateCredentials(NEW_USERNAME, NEW_PASSWORD, IP);
    expect(login.ok).toBe(true);
    if (login.ok) expect(login.user.role).toBe("ADMIN");

    // and passes the admin-area gate, with no access-expiry applied to an admin
    const access = await evaluateAccess({ userId: newAdminId, tokenSessionVersion: row.sessionVersion, requiredRole: "ADMIN" });
    expect(access.allowed).toBe(true);
  });

  it("the same username can't be created twice", async () => {
    const again = await createAdminUser({
      fullName: "[Fictional] Duplicate",
      username: NEW_USERNAME,
      password: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
      email: undefined,
    });
    expect(again).toEqual({ ok: false, reason: "DUPLICATE_USERNAME" });
  });

  it("suspending the new admin blocks login and ends their existing session immediately", async () => {
    const before = await prisma.user.findUniqueOrThrow({ where: { id: newAdminId } });

    const result = await updateAdminUserStatus(newAdminId, "SUSPENDED");
    expect(result.ok).toBe(true);

    expect(await authenticateCredentials(NEW_USERNAME, NEW_PASSWORD, IP)).toEqual({ ok: false, reason: "INVALID_CREDENTIALS" });
    const access = await evaluateAccess({ userId: newAdminId, tokenSessionVersion: before.sessionVersion, requiredRole: "ADMIN" });
    expect(access.allowed).toBe(false);

    // re-activating restores sign-in (with a fresh login — the old session stays revoked)
    expect((await updateAdminUserStatus(newAdminId, "ACTIVE")).ok).toBe(true);
    expect((await authenticateCredentials(NEW_USERNAME, NEW_PASSWORD, IP)).ok).toBe(true);
    const stale = await evaluateAccess({ userId: newAdminId, tokenSessionVersion: before.sessionVersion, requiredRole: "ADMIN" });
    expect(stale).toEqual({ allowed: false, reason: "SESSION_REVOKED" });
  });

  it("resetting the password makes the old one stop working and the new one work", async () => {
    const NEXT = "another-fictional-staff-passphrase";
    expect(await resetAdminUserPassword(newAdminId, NEXT)).toEqual({ ok: true, signedOut: false });

    expect(await authenticateCredentials(NEW_USERNAME, NEW_PASSWORD, IP)).toEqual({ ok: false, reason: "INVALID_CREDENTIALS" });
    expect((await authenticateCredentials(NEW_USERNAME, NEXT, IP)).ok).toBe(true);
  });

  it("an admin can't suspend themselves", async () => {
    expect(await updateAdminUserStatus(actingId, "SUSPENDED")).toEqual({ ok: false, reason: "CANNOT_DEACTIVATE_SELF" });
    const row = await prisma.user.findUniqueOrThrow({ where: { id: actingId } });
    expect(row.status).toBe("ACTIVE");
  });
});
