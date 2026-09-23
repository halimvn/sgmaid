import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashPassword } from "@/lib/auth/password";

/**
 * Phase 7 unit tests: the employer "My Account" service's authorization
 * boundary and ownership guarantees — mocked Prisma, real bcrypt hashing
 * (matching tests/credentials.test.ts's own convention: bcrypt is fast
 * enough and genuinely exercising it catches real hashing/comparison
 * bugs a mock would hide). Mirrors tests/admin-maids-service.test.ts's
 * mock-setup pattern.
 */

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
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

const { getEmployerAccount, updateEmployerProfile, changeEmployerPassword } = await import("@/lib/services/account");

function dbUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "emp_1",
    fullName: "[Fictional] Test Employer",
    email: "employer@example.test",
    role: "EMPLOYER",
    status: "ACTIVE",
    sessionVersion: 0,
    mobileNumber: "+65 9123 4567",
    passwordHash: "irrelevant-for-the-authorize() check",
    // Phase 8: an EMPLOYER now needs an unexpired accessExpiresAt to pass
    // requireEmployer() — see lib/auth/authorize.ts. Comfortably in the
    // future by default; irrelevant to what this file actually tests.
    accessExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Phase 7 — My Account service authorization boundary", () => {
  it("1. getEmployerAccount rejects a logged-out caller before ever querying account data", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(getEmployerAccount()).rejects.toThrow(/REDIRECT:\/login/);
    expect(mockPrisma.user.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("2. getEmployerAccount rejects a PENDING employer", async () => {
    mockAuth.mockResolvedValue({ user: { id: "emp_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser({ status: "PENDING" }));

    await expect(getEmployerAccount()).rejects.toThrow(/REDIRECT:\/login/);
    expect(mockPrisma.user.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("3. getEmployerAccount rejects a SUSPENDED employer", async () => {
    mockAuth.mockResolvedValue({ user: { id: "emp_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser({ status: "SUSPENDED" }));

    await expect(getEmployerAccount()).rejects.toThrow(/REDIRECT:\/login/);
    expect(mockPrisma.user.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("updateEmployerProfile rejects a logged-out caller before ever touching the database", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(updateEmployerProfile({ fullName: "New Name", mobileNumber: null })).rejects.toThrow(/REDIRECT:\/login/);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("changeEmployerPassword rejects a logged-out caller before ever touching the database", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(changeEmployerPassword("current", "new-password-123")).rejects.toThrow(/REDIRECT:\/login/);
    expect(mockPrisma.user.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });
});

describe("Phase 7 — 4/5. an ACTIVE employer receives only their own account data", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ user: { id: "emp_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser());
  });

  it("returns the DTO built from the authenticated employer's own row", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      fullName: "[Fictional] Test Employer",
      username: "fictionalclient",
      email: "employer@example.test",
      mobileNumber: "+65 9123 4567",
      status: "ACTIVE",
      accessExpiresAt: new Date("2026-09-26T15:00:00.000Z"),
    });

    const result = await getEmployerAccount();

    expect(mockPrisma.user.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "emp_1" } })
    );
    expect(result).toEqual({
      fullName: "[Fictional] Test Employer",
      username: "fictionalclient",
      email: "employer@example.test",
      mobileNumber: "+65 9123 4567",
      statusLabel: "Active",
      accessExpiresAt: "2026-09-26T15:00:00.000Z",
    });
  });

  it("11. the DTO never contains passwordHash, sessionVersion, role, or id", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      fullName: "[Fictional] Test Employer",
      username: "fictionalclient",
      email: "employer@example.test",
      mobileNumber: null,
      status: "ACTIVE",
      accessExpiresAt: null,
    });

    const result = await getEmployerAccount();

    expect(Object.keys(result).sort()).toEqual(
      ["email", "fullName", "mobileNumber", "statusLabel", "username", "accessExpiresAt"].sort()
    );
    expect(JSON.stringify(result)).not.toContain("passwordHash");
    expect(JSON.stringify(result)).not.toContain("sessionVersion");
  });

  it("friendly status labels never leak the raw enum value for a non-Active status", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      fullName: "x",
      email: "x@example.test",
      mobileNumber: null,
      status: "SUSPENDED",
    });

    const result = await getEmployerAccount();
    expect(result.statusLabel).toBe("Suspended");
  });
});

describe("Phase 7 — 6. ownership: update/password-change always target the authenticated employer's own id", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ user: { id: "emp_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser());
  });

  it("7/8. updateEmployerProfile writes fullName/mobileNumber to the authenticated employer's id, nothing else", async () => {
    mockPrisma.user.update.mockResolvedValue(dbUser());

    await updateEmployerProfile({ fullName: "New Name", mobileNumber: "+65 8888 8888" });

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "emp_1" },
      data: { fullName: "New Name", mobileNumber: "+65 8888 8888" },
    });
  });

  it("17/18. extra fields on a maliciously-shaped payload (role/status/sessionVersion/id) are never written — the service picks exactly fullName/mobileNumber", async () => {
    mockPrisma.user.update.mockResolvedValue(dbUser());

    // Simulates a caller bypassing the TypeScript type to smuggle extra
    // properties through — the service must still only ever construct
    // its Prisma `data` from fullName/mobileNumber.
    const maliciousPayload = {
      fullName: "New Name",
      mobileNumber: null,
      role: "ADMIN",
      status: "ACTIVE",
      sessionVersion: 999,
      id: "some-other-user-id",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    await updateEmployerProfile(maliciousPayload);

    const call = mockPrisma.user.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: "emp_1" });
    expect(Object.keys(call.data).sort()).toEqual(["fullName", "mobileNumber"].sort());
  });
});

describe("Phase 7 — 12/13/15/16. change-password flow", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ user: { id: "emp_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser());
  });

  it("13. an incorrect current password is rejected and the passwordHash is never touched", async () => {
    const realHash = await hashPassword("the-real-current-password");
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ passwordHash: realHash });

    const result = await changeEmployerPassword("totally-wrong-password", "a-brand-new-password-123");

    expect(result).toEqual({ ok: false, reason: "WRONG_CURRENT_PASSWORD" });
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("a user with no passwordHash set fails the same generic way as a wrong password", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ passwordHash: null });

    const result = await changeEmployerPassword("anything", "a-brand-new-password-123");

    expect(result).toEqual({ ok: false, reason: "WRONG_CURRENT_PASSWORD" });
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("12/15/16. a correct current password succeeds, hashes the new password, and bumps sessionVersion", async () => {
    const realHash = await hashPassword("the-real-current-password");
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ passwordHash: realHash });
    mockPrisma.user.update.mockResolvedValue(dbUser());

    const result = await changeEmployerPassword("the-real-current-password", "a-brand-new-password-123");

    expect(result).toEqual({ ok: true });
    expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);
    const call = mockPrisma.user.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: "emp_1" });
    expect(call.data.sessionVersion).toEqual({ increment: 1 });
    expect(call.data.passwordHash).not.toBe(realHash);
    expect(call.data.passwordHash).not.toContain("a-brand-new-password-123"); // never stored as plaintext
  });
});
