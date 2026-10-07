import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

/**
 * Staff (ADMIN) account management service (lib/services/admin/admins.ts) against a
 * mocked Prisma client: the access-control boundary, duplicate handling, password
 * hashing, the two lock-out guards (can't deactivate yourself; can't deactivate the
 * last active admin), session revocation, and that audit rows / DTOs never carry a
 * password or hash.
 */

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn() },
  auditLog: { create: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

class RedirectSignal extends Error {
  constructor(public url: string) {
    super(`REDIRECT:${url}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
}));

const { getAdminUserList, getAdminUser, createAdminUser, updateAdminUserStatus, resetAdminUserPassword } = await import(
  "@/lib/services/admin/admins"
);

function dbUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "adm_1",
    fullName: "[Fictional] Acting Admin",
    username: "actingadmin",
    email: null,
    role: "ADMIN",
    status: "ACTIVE",
    sessionVersion: 0,
    accessExpiresAt: null,
    ...overrides,
  };
}

const CREATE = {
  fullName: "[Fictional] New Staff",
  username: "newstaff",
  password: "a-fictional-staff-passphrase",
  confirmPassword: "a-fictional-staff-passphrase",
  email: undefined as string | undefined,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: "adm_1" }, sessionVersion: 0 });
  mockPrisma.user.findUnique.mockResolvedValue(dbUser()); // requireAdmin()'s own lookup
});

describe("access control — every export rejects before touching data", () => {
  it("an unauthenticated caller", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(getAdminUserList(1)).rejects.toThrow(/REDIRECT:\/login/);
    await expect(getAdminUser("x")).rejects.toThrow(/REDIRECT:\/login/);
    await expect(createAdminUser(CREATE)).rejects.toThrow(/REDIRECT:\/login/);
    await expect(updateAdminUserStatus("x", "SUSPENDED")).rejects.toThrow(/REDIRECT:\/login/);
    await expect(resetAdminUserPassword("x", "whatever-password")).rejects.toThrow(/REDIRECT:\/login/);
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("an EMPLOYER (client) session can't create or manage admins", async () => {
    mockAuth.mockResolvedValue({ user: { id: "emp_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(
      dbUser({ id: "emp_1", role: "EMPLOYER", username: "aclient", accessExpiresAt: new Date(Date.now() + 3600e3) })
    );
    await expect(createAdminUser(CREATE)).rejects.toThrow(/REDIRECT:\/login/);
    await expect(updateAdminUserStatus("adm_2", "SUSPENDED")).rejects.toThrow(/REDIRECT:\/login/);
    await expect(resetAdminUserPassword("adm_2", "a-new-passphrase-here")).rejects.toThrow(/REDIRECT:\/login/);
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });
});

describe("createAdminUser", () => {
  function usernameFree() {
    mockPrisma.user.findUnique.mockImplementation(async (args: { where: { id?: string; username?: string; email?: string } }) => {
      if (args.where.id === "adm_1") return dbUser();
      return null;
    });
    mockPrisma.user.create.mockResolvedValue({ id: "new_adm" });
  }

  it("creates an ACTIVE ADMIN with a bcrypt-hashed password, no expiry, and an audit row with no password", async () => {
    usernameFree();
    const result = await createAdminUser(CREATE);

    expect(result).toEqual({ ok: true, id: "new_adm", username: "newstaff" });
    const data = mockPrisma.user.create.mock.calls[0][0].data;
    expect(data.role).toBe("ADMIN");
    expect(data.status).toBe("ACTIVE");
    expect(data).not.toHaveProperty("accessExpiresAt");
    expect(data.passwordHash).not.toBe(CREATE.password);
    expect(data.passwordHash.startsWith("$2")).toBe(true);
    expect(await bcrypt.compare(CREATE.password, data.passwordHash)).toBe(true);

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: { actorId: "adm_1", action: "ADMIN_ACCOUNT_CREATED", targetUserId: "new_adm" },
    });
    const audit = JSON.stringify(mockPrisma.auditLog.create.mock.calls[0][0]);
    expect(audit).not.toContain(CREATE.password);
    expect(audit).not.toMatch(/\$2[aby]\$/);
  });

  it("rejects a duplicate username without writing", async () => {
    mockPrisma.user.findUnique.mockImplementation(async (args: { where: { id?: string; username?: string } }) => {
      if (args.where.id === "adm_1") return dbUser();
      if (args.where.username === "newstaff") return { id: "someone_else" };
      return null;
    });
    expect(await createAdminUser(CREATE)).toEqual({ ok: false, reason: "DUPLICATE_USERNAME" });
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it("rejects a duplicate email (case-insensitively) without writing", async () => {
    mockPrisma.user.findUnique.mockImplementation(async (args: { where: { id?: string; username?: string; email?: string } }) => {
      if (args.where.id === "adm_1") return dbUser();
      if (args.where.email === "taken@example.test") return { id: "someone_else" };
      return null;
    });
    expect(await createAdminUser({ ...CREATE, email: "Taken@Example.test" })).toEqual({ ok: false, reason: "DUPLICATE_EMAIL" });
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it("stores a provided email lower-cased, and null when none", async () => {
    usernameFree();
    await createAdminUser({ ...CREATE, email: "Staff@Example.test" });
    expect(mockPrisma.user.create.mock.calls[0][0].data.email).toBe("staff@example.test");
    await createAdminUser(CREATE);
    expect(mockPrisma.user.create.mock.calls[1][0].data.email).toBeNull();
  });
});

describe("updateAdminUserStatus — lock-out guards", () => {
  it("blocks an admin from suspending or deactivating their OWN account", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: "adm_1", status: "ACTIVE" });
    expect(await updateAdminUserStatus("adm_1", "SUSPENDED")).toEqual({ ok: false, reason: "CANNOT_DEACTIVATE_SELF" });
    expect(await updateAdminUserStatus("adm_1", "INACTIVE")).toEqual({ ok: false, reason: "CANNOT_DEACTIVATE_SELF" });
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("blocks deactivating the LAST active admin", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: "adm_2", status: "ACTIVE" });
    mockPrisma.user.count.mockResolvedValue(0); // nobody else active
    expect(await updateAdminUserStatus("adm_2", "SUSPENDED")).toEqual({ ok: false, reason: "LAST_ACTIVE_ADMIN" });
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("suspends another admin when someone else stays active, revokes their sessions, and audits it", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: "adm_2", status: "ACTIVE" });
    mockPrisma.user.count.mockResolvedValue(1);
    mockPrisma.user.update.mockResolvedValue({});

    expect(await updateAdminUserStatus("adm_2", "SUSPENDED")).toEqual({ ok: true });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "adm_2" },
      data: { status: "SUSPENDED", sessionVersion: { increment: 1 } },
    });
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: { actorId: "adm_1", action: "ADMIN_STATUS_CHANGED", targetUserId: "adm_2" },
    });
  });

  it("always allows re-activating", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: "adm_2", status: "SUSPENDED" });
    mockPrisma.user.update.mockResolvedValue({});
    expect(await updateAdminUserStatus("adm_2", "ACTIVE")).toEqual({ ok: true });
  });

  it("only ever targets ADMIN rows (a client id is NOT_FOUND here)", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    expect(await updateAdminUserStatus("a_client_id", "SUSPENDED")).toEqual({ ok: false, reason: "NOT_FOUND" });
    expect(mockPrisma.user.findFirst.mock.calls[0][0].where).toMatchObject({ id: "a_client_id", role: "ADMIN" });
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });
});

describe("resetAdminUserPassword", () => {
  it("hashes the new password, bumps sessionVersion, and audits without any password content", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: "adm_2" });
    mockPrisma.user.update.mockResolvedValue({});

    const result = await resetAdminUserPassword("adm_2", "a-brand-new-staff-passphrase");

    expect(result).toEqual({ ok: true, signedOut: false });
    const args = mockPrisma.user.update.mock.calls[0][0];
    expect(args.data.sessionVersion).toEqual({ increment: 1 });
    expect(args.data.passwordHash).not.toBe("a-brand-new-staff-passphrase");
    expect(await bcrypt.compare("a-brand-new-staff-passphrase", args.data.passwordHash)).toBe(true);
    const audit = JSON.stringify(mockPrisma.auditLog.create.mock.calls[0][0]);
    expect(audit).not.toContain("a-brand-new-staff-passphrase");
    expect(audit).not.toMatch(/\$2[aby]\$/);
  });

  it("reports signedOut when an admin resets their OWN password (their session ends too)", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: "adm_1" });
    mockPrisma.user.update.mockResolvedValue({});
    expect(await resetAdminUserPassword("adm_1", "my-own-new-passphrase")).toEqual({ ok: true, signedOut: true });
  });

  it("NOT_FOUND for a non-admin id, without writing", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    expect(await resetAdminUserPassword("a_client_id", "whatever-passphrase")).toEqual({ ok: false, reason: "NOT_FOUND" });
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });
});

describe("DTOs never expose credentials", () => {
  it("the list query selects no passwordHash/sessionVersion, and flags the current user", async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: "adm_1", fullName: "Me", username: "me", email: null, status: "ACTIVE", createdAt: new Date(), lastLoginAt: null },
      { id: "adm_2", fullName: "Them", username: "them", email: "t@example.test", status: "ACTIVE", createdAt: new Date(), lastLoginAt: new Date() },
    ]);
    mockPrisma.user.count.mockResolvedValue(2);

    const result = await getAdminUserList(1);

    const select = mockPrisma.user.findMany.mock.calls[0][0].select;
    expect(select).not.toHaveProperty("passwordHash");
    expect(select).not.toHaveProperty("sessionVersion");
    expect(result.items.map((i) => i.isCurrentUser)).toEqual([true, false]);
    expect(JSON.stringify(result)).not.toMatch(/passwordHash|sessionVersion/);
  });
});
