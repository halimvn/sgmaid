import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

/**
 * Phase 8 unit tests: lib/services/admin/clients.ts against a mocked
 * Prisma client (no real database) — mirrors tests/admin-maids-service.test.ts's
 * own pattern. Covers spec test items #4 (duplicate username rejected),
 * #5 (password stored hashed only), #6 (accessExpiresAt ≈ now + 72h),
 * #16/#17 (extend/reactivate access math), #18/#19 (admin sets a new
 * password + sessionVersion increment), #21/#22 (username/expiry are
 * never client-editable — proven structurally: these functions have no
 * parameter for either), and #25 (audit logs never contain password
 * content), plus the authorization boundary (every export rejects
 * before touching the database for a non-admin/unauthenticated caller).
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

const {
  getClientList,
  getClient,
  createClient,
  updateClientDetails,
  extendClientAccess,
  resetClientPassword,
} = await import("@/lib/services/admin/clients");

function dbAdmin(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "adm_1",
    fullName: "[Fictional] Test Admin",
    username: null,
    email: "admin@example.test",
    role: "ADMIN",
    status: "ACTIVE",
    sessionVersion: 0,
    accessExpiresAt: null,
    ...overrides,
  };
}

function dbEmployer(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "emp_1",
    fullName: "[Fictional] Test Employer",
    username: "fictionalclient",
    email: null,
    role: "EMPLOYER",
    status: "ACTIVE",
    sessionVersion: 0,
    accessExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    ...overrides,
  };
}

const CREATE_FORM = {
  fullName: "[Fictional] New Client",
  username: "newclient",
  password: "a-fictional-passphrase",
  confirmPassword: "a-fictional-passphrase",
  mobileNumber: "+65 9123 4567",
  email: undefined as string | undefined,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: "adm_1" }, sessionVersion: 0 });
  mockPrisma.user.findUnique.mockResolvedValue(dbAdmin()); // requireAdmin()'s own lookup
});

describe("Phase 8 — admin client service authorization boundary", () => {
  it("getClientList rejects an unauthenticated caller before ever querying", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(getClientList({ page: 1 })).rejects.toThrow(/REDIRECT:\/login/);
    expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
  });

  it("getClient rejects a non-admin (EMPLOYER) session", async () => {
    mockAuth.mockResolvedValue({ user: { id: "emp_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbEmployer());

    await expect(getClient("some-id")).rejects.toThrow(/REDIRECT:\/login/);
  });

  it("createClient rejects an unauthenticated caller before ever writing", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(createClient(CREATE_FORM)).rejects.toThrow(/REDIRECT:\/login/);
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it("extendClientAccess rejects a non-admin session", async () => {
    mockAuth.mockResolvedValue({ user: { id: "emp_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbEmployer());

    await expect(extendClientAccess("some-id")).rejects.toThrow(/REDIRECT:\/login/);
  });

  it("resetClientPassword rejects a logged-out caller", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(resetClientPassword("some-id", "whatever")).rejects.toThrow(/REDIRECT:\/login/);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("updateClientDetails rejects a non-admin session", async () => {
    mockAuth.mockResolvedValue({ user: { id: "emp_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbEmployer());

    await expect(
      updateClientDetails("some-id", { fullName: "X", mobileNumber: undefined, email: undefined, status: "ACTIVE" })
    ).rejects.toThrow(/REDIRECT:\/login/);
  });
});

describe("createClient", () => {
  it("4. rejects a duplicate username WITHOUT overwriting the existing account", async () => {
    mockPrisma.user.findUnique.mockImplementation(async (args: { where: { id?: string; username?: string } }) => {
      if (args.where.id === "adm_1") return dbAdmin();
      if (args.where.username === "newclient") return { id: "existing_emp" }; // already taken
      return null;
    });

    const result = await createClient(CREATE_FORM);

    expect(result).toEqual({ ok: false, reason: "DUPLICATE_USERNAME" });
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it("5. stores the password as a bcrypt hash only — never the plaintext", async () => {
    mockPrisma.user.findUnique.mockImplementation(async (args: { where: { id?: string; username?: string } }) => {
      if (args.where.id === "adm_1") return dbAdmin();
      return null; // username free
    });
    mockPrisma.user.create.mockResolvedValue({ id: "new_emp_1" });

    await createClient(CREATE_FORM);

    expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    const writeArgs = mockPrisma.user.create.mock.calls[0][0];
    const storedHash: string = writeArgs.data.passwordHash;

    expect(storedHash).not.toBe(CREATE_FORM.password);
    expect(storedHash.startsWith("$2")).toBe(true); // a real bcrypt hash shape
    expect(await bcrypt.compare(CREATE_FORM.password, storedHash)).toBe(true);
  });

  it("6. sets accessExpiresAt to approximately now + 72 hours, computed server-side", async () => {
    mockPrisma.user.findUnique.mockImplementation(async (args: { where: { id?: string; username?: string } }) => {
      if (args.where.id === "adm_1") return dbAdmin();
      return null;
    });
    mockPrisma.user.create.mockResolvedValue({ id: "new_emp_1" });

    const before = Date.now();
    const result = await createClient(CREATE_FORM);
    const after = Date.now();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const expiresAtMs = new Date(result.accessExpiresAt).getTime();
    const expectedMin = before + 72 * 60 * 60 * 1000 - 2000; // 2s tolerance
    const expectedMax = after + 72 * 60 * 60 * 1000 + 2000;
    expect(expiresAtMs).toBeGreaterThanOrEqual(expectedMin);
    expect(expiresAtMs).toBeLessThanOrEqual(expectedMax);
  });

  it("activates the account immediately (ACTIVE, no PENDING step) and writes a CLIENT_ACCESS_CREATED audit row with no password content", async () => {
    mockPrisma.user.findUnique.mockImplementation(async (args: { where: { id?: string; username?: string } }) => {
      if (args.where.id === "adm_1") return dbAdmin();
      return null;
    });
    mockPrisma.user.create.mockResolvedValue({ id: "new_emp_1" });

    await createClient(CREATE_FORM);

    const writeArgs = mockPrisma.user.create.mock.calls[0][0];
    expect(writeArgs.data.status).toBe("ACTIVE");
    expect(writeArgs.data.role).toBe("EMPLOYER");

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: { actorId: "adm_1", action: "CLIENT_ACCESS_CREATED", targetUserId: "new_emp_1" },
    });
    const auditPayload = JSON.stringify(mockPrisma.auditLog.create.mock.calls[0][0]);
    expect(auditPayload).not.toContain(CREATE_FORM.password);
  });
});

describe("extendClientAccess", () => {
  it("16. extends an active (unexpired) client's access by 3 days from its CURRENT expiry, not from now", async () => {
    const currentExpiry = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days left
    mockPrisma.user.findFirst.mockResolvedValue({ accessExpiresAt: currentExpiry });
    mockPrisma.user.update.mockResolvedValue({});

    const result = await extendClientAccess("emp_1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const newExpiry = new Date(result.accessExpiresAt).getTime();
    expect(newExpiry).toBe(currentExpiry.getTime() + 72 * 60 * 60 * 1000);
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: { actorId: "adm_1", action: "CLIENT_ACCESS_EXTENDED", targetUserId: "emp_1" },
    });
  });

  it("17. reactivates an already-EXPIRED client's access to (now + 3 days), never computed from the stale past expiry", async () => {
    const pastExpiry = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // expired 5 days ago
    mockPrisma.user.findFirst.mockResolvedValue({ accessExpiresAt: pastExpiry });
    mockPrisma.user.update.mockResolvedValue({});

    const before = Date.now();
    const result = await extendClientAccess("emp_1");
    const after = Date.now();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const newExpiry = new Date(result.accessExpiresAt).getTime();
    expect(newExpiry).toBeGreaterThanOrEqual(before + 72 * 60 * 60 * 1000 - 2000);
    expect(newExpiry).toBeLessThanOrEqual(after + 72 * 60 * 60 * 1000 + 2000);
  });

  it("returns NOT_FOUND for a non-EMPLOYER or nonexistent id, without writing anything", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);

    const result = await extendClientAccess("ghost");

    expect(result).toEqual({ ok: false, reason: "NOT_FOUND" });
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });
});

describe("resetClientPassword", () => {
  it("18/19. sets a new bcrypt-hashed password and increments sessionVersion, invalidating existing sessions", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: "emp_1" });
    mockPrisma.user.update.mockResolvedValue({});

    const result = await resetClientPassword("emp_1", "a-brand-new-fictional-password");

    expect(result).toEqual({ ok: true });
    expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);
    const writeArgs = mockPrisma.user.update.mock.calls[0][0];
    expect(writeArgs.where).toEqual({ id: "emp_1" });
    expect(writeArgs.data.sessionVersion).toEqual({ increment: 1 });
    expect(writeArgs.data.passwordHash).not.toBe("a-brand-new-fictional-password");
    expect(await bcrypt.compare("a-brand-new-fictional-password", writeArgs.data.passwordHash)).toBe(true);
  });

  it("25. the CLIENT_PASSWORD_RESET audit row never contains the password or its hash", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: "emp_1" });
    mockPrisma.user.update.mockResolvedValue({});

    await resetClientPassword("emp_1", "a-brand-new-fictional-password");

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: { actorId: "adm_1", action: "CLIENT_PASSWORD_RESET", targetUserId: "emp_1" },
    });
    const auditPayload = JSON.stringify(mockPrisma.auditLog.create.mock.calls[0][0]);
    expect(auditPayload).not.toContain("a-brand-new-fictional-password");
    expect(auditPayload).not.toMatch(/\$2[aby]\$/); // no bcrypt-hash shape either
  });

  it("returns NOT_FOUND for a nonexistent client, without touching the password", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);

    const result = await resetClientPassword("ghost", "whatever");

    expect(result).toEqual({ ok: false, reason: "NOT_FOUND" });
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });
});

describe("updateClientDetails", () => {
  it("21/22. has no parameter for username or accessExpiresAt — structurally cannot change either", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: "emp_1", status: "ACTIVE" });
    mockPrisma.user.update.mockResolvedValue({});

    await updateClientDetails("emp_1", { fullName: "New Name", mobileNumber: undefined, email: undefined, status: "ACTIVE" });

    const writeArgs = mockPrisma.user.update.mock.calls[0][0];
    expect(writeArgs.data).not.toHaveProperty("username");
    expect(writeArgs.data).not.toHaveProperty("accessExpiresAt");
    expect(writeArgs.data).not.toHaveProperty("passwordHash");
  });

  it("writes a CLIENT_STATUS_CHANGED audit row only when the status actually changes", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: "emp_1", status: "ACTIVE" });
    mockPrisma.user.update.mockResolvedValue({});

    await updateClientDetails("emp_1", { fullName: "Same Name", mobileNumber: undefined, email: undefined, status: "ACTIVE" });
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();

    await updateClientDetails("emp_1", { fullName: "Same Name", mobileNumber: undefined, email: undefined, status: "SUSPENDED" });
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: { actorId: "adm_1", action: "CLIENT_STATUS_CHANGED", targetUserId: "emp_1" },
    });
  });
});
