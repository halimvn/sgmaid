import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";

/**
 * Staff accounts against the REAL development database: the full administrator creates a
 * STAFF account, and that person can genuinely sign in with the username + password set —
 * no database/script access needed — and use the admin area, but not manage staff. Only `@/auth`'s auth() is mocked (to act as the
 * test admin / the new admin). Fictional fixtures only; everything is deleted in afterAll.
 */

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const { createStaffUser, updateAdminUserStatus, resetAdminUserPassword } = await import("@/lib/services/admin/admins");
const { createClient } = await import("@/lib/services/admin/clients");
const { getAdminMaidList, createMaid } = await import("@/lib/services/admin/maids");
const { authenticateCredentials } = await import("@/lib/auth/credentials");
const { evaluateAccess } = await import("@/lib/auth/authorize");
const { buildLoginIdentifier } = await import("@/lib/auth/rate-limit");

const ACTING_EMAIL = "zztest-admin-users-acting@example.test";
const NEW_USERNAME = "zztestnewstaff";
const NEW_PASSWORD = "a-fictional-new-staff-passphrase";
const IP = "203.0.113.30";

let actingId: string;
let newAdminId: string;
let staffCreatedClientId: string | undefined;
let staffCreatedMaidId: string | undefined;

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
  await prisma.auditLog.deleteMany({ where: { actorId: { in: [actingId, newAdminId].filter(Boolean) } } }).catch(() => {});
  if (staffCreatedClientId) await prisma.user.delete({ where: { id: staffCreatedClientId } }).catch(() => {});
  if (staffCreatedMaidId) await prisma.maidProfile.delete({ where: { id: staffCreatedMaidId } }).catch(() => {});
  if (newAdminId) await prisma.user.delete({ where: { id: newAdminId } }).catch(() => {});
  await prisma.user.delete({ where: { id: actingId } }).catch(() => {});
  await prisma.$disconnect();
});

describe("Staff accounts — real database", () => {
  it("the administrator creates a STAFF account, who can then sign in with that username + password", async () => {
    const created = await createStaffUser({
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
    expect(row.role).toBe("STAFF");
    expect(row.status).toBe("ACTIVE");
    expect(row.accessExpiresAt).toBeNull();
    expect(row.passwordHash).not.toBe(NEW_PASSWORD);

    const login = await authenticateCredentials(NEW_USERNAME, NEW_PASSWORD, IP);
    expect(login.ok).toBe(true);
    if (login.ok) expect(login.user.role).toBe("STAFF");

    // passes the admin-area gate (no client-style expiry applies to staff), but NOT the
    // full-administrator gate that guards staff management
    const area = await evaluateAccess({ userId: newAdminId, tokenSessionVersion: row.sessionVersion, requiredRole: "BACK_OFFICE" });
    expect(area.allowed).toBe(true);
    const fullAdmin = await evaluateAccess({ userId: newAdminId, tokenSessionVersion: row.sessionVersion, requiredRole: "ADMIN" });
    expect(fullAdmin).toEqual({ allowed: false, reason: "WRONG_ROLE" });
  });

  it("the same username can't be created twice", async () => {
    const again = await createStaffUser({
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
    const access = await evaluateAccess({ userId: newAdminId, tokenSessionVersion: before.sessionVersion, requiredRole: "BACK_OFFICE" });
    expect(access.allowed).toBe(false);

    // re-activating restores sign-in (with a fresh login — the old session stays revoked)
    expect((await updateAdminUserStatus(newAdminId, "ACTIVE")).ok).toBe(true);
    expect((await authenticateCredentials(NEW_USERNAME, NEW_PASSWORD, IP)).ok).toBe(true);
    const stale = await evaluateAccess({ userId: newAdminId, tokenSessionVersion: before.sessionVersion, requiredRole: "BACK_OFFICE" });
    expect(stale).toEqual({ allowed: false, reason: "SESSION_REVOKED" });
  });

  it("resetting the password makes the old one stop working and the new one work", async () => {
    const NEXT = "another-fictional-staff-passphrase";
    expect(await resetAdminUserPassword(newAdminId, NEXT)).toEqual({ ok: true, signedOut: false });

    expect(await authenticateCredentials(NEW_USERNAME, NEW_PASSWORD, IP)).toEqual({ ok: false, reason: "INVALID_CREDENTIALS" });
    expect((await authenticateCredentials(NEW_USERNAME, NEXT, IP)).ok).toBe(true);
  });

  it("the new STAFF member CAN create clients and maids, and see the maid list", async () => {
    const staffRow = await prisma.user.findUniqueOrThrow({ where: { id: newAdminId } });
    mockAuth.mockResolvedValue({ user: { id: newAdminId }, sessionVersion: staffRow.sessionVersion });
    try {
      const client = await createClient({
        fullName: "[Fictional] Client made by staff",
        username: "zztestclientbystaff",
        password: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
        mobileNumber: undefined,
        email: undefined,
      });
      expect(client.ok).toBe(true);
      if (client.ok) staffCreatedClientId = client.id;

      const maid = await createMaid(
        {
          profileCode: "ZZTEST-STAFF-MAID",
          name: "[Fictional] Maid made by staff",
          dateOfBirth: undefined,
          maidType: "NEW",
          maritalStatus: "",
          languagesRaw: "",
          heightCm: undefined,
          weightKg: undefined,
          yearsExperience: undefined,
          expertise: [],
          employmentHistory: [],
          profileStatus: "DRAFT",
          availabilityStatus: "UNAVAILABLE",
        },
        { photo: null, pdf: null }
      );
      expect(maid.ok).toBe(true);
      if (maid.ok) staffCreatedMaidId = maid.id;

      const list = await getAdminMaidList({ page: 1, search: "ZZTEST-STAFF-MAID" });
      expect(list.items.some((m) => m.profileCode === "ZZTEST-STAFF-MAID")).toBe(true);
    } finally {
      mockAuth.mockResolvedValue({ user: { id: actingId }, sessionVersion: 0 });
    }
  });

  it("the new STAFF member can NOT create or manage staff accounts (checked with their own session)", async () => {
    const staffRow = await prisma.user.findUniqueOrThrow({ where: { id: newAdminId } });
    mockAuth.mockResolvedValue({ user: { id: newAdminId }, sessionVersion: staffRow.sessionVersion });
    try {
      await expect(
        createStaffUser({ fullName: "[Fictional] Sneaky", username: "zztestsneaky", password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD, email: undefined })
      ).rejects.toBeDefined();
      await expect(updateAdminUserStatus(actingId, "SUSPENDED")).rejects.toBeDefined();
      await expect(resetAdminUserPassword(actingId, "an-attacker-chosen-passphrase")).rejects.toBeDefined();
      expect(await prisma.user.findUnique({ where: { username: "zztestsneaky" } })).toBeNull();
    } finally {
      mockAuth.mockResolvedValue({ user: { id: actingId }, sessionVersion: 0 });
    }
  });

  it("an admin can't suspend themselves", async () => {
    expect(await updateAdminUserStatus(actingId, "SUSPENDED")).toEqual({ ok: false, reason: "CANNOT_DEACTIVATE_SELF" });
    const row = await prisma.user.findUniqueOrThrow({ where: { id: actingId } });
    expect(row.status).toBe("ACTIVE");
  });
});
