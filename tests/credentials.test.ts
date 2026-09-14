import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashPassword } from "@/lib/auth/password";

/**
 * Tests 1–6 from the Phase 2 spec: the core login decision logic in
 * lib/auth/credentials.ts, against a mocked Prisma client (no real
 * database). Uses real bcryptjs hashing/comparison — these are genuine
 * password checks, not stubbed out, since that's the behaviour under test.
 */

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn() },
  loginAttempt: { count: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

const { authenticateCredentials } = await import("@/lib/auth/credentials");

const IP = "203.0.113.10";

function baseUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "user_1",
    email: "active.employer@example.test",
    passwordHash: null as string | null,
    status: "ACTIVE",
    role: "EMPLOYER",
    sessionVersion: 0,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.loginAttempt.count.mockResolvedValue(0); // not rate limited by default
});

describe("authenticateCredentials", () => {
  it("1. active employer + correct password → allowed", async () => {
    const password = "a-fictional-passphrase";
    const passwordHash = await hashPassword(password);
    mockPrisma.user.findUnique.mockResolvedValue(baseUser({ passwordHash }));

    const result = await authenticateCredentials("Active.Employer@example.test", password, IP);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user).toEqual({ id: "user_1", role: "EMPLOYER", sessionVersion: 0 });
    }
    expect(mockPrisma.loginAttempt.create).toHaveBeenCalledWith({
      data: { identifierHash: expect.any(String), succeeded: true },
    });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { lastLoginAt: expect.any(Date) },
    });
  });

  it("2. wrong password → denied with generic reason", async () => {
    const passwordHash = await hashPassword("the-real-password");
    mockPrisma.user.findUnique.mockResolvedValue(baseUser({ passwordHash }));

    const result = await authenticateCredentials("active.employer@example.test", "totally-wrong-password", IP);

    expect(result).toEqual({ ok: false, reason: "INVALID_CREDENTIALS" });
    expect(mockPrisma.loginAttempt.create).toHaveBeenCalledWith({
      data: { identifierHash: expect.any(String), succeeded: false },
    });
  });

  it("3. unknown email → denied with the SAME generic reason as wrong password", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const result = await authenticateCredentials("nobody@example.test", "whatever-password", IP);

    expect(result).toEqual({ ok: false, reason: "INVALID_CREDENTIALS" });
  });

  it("4. PENDING user → denied even with correct password", async () => {
    const password = "correct-passphrase-here";
    const passwordHash = await hashPassword(password);
    mockPrisma.user.findUnique.mockResolvedValue(baseUser({ passwordHash, status: "PENDING" }));

    const result = await authenticateCredentials("active.employer@example.test", password, IP);

    expect(result).toEqual({ ok: false, reason: "INVALID_CREDENTIALS" });
  });

  it("5. SUSPENDED user → denied even with correct password", async () => {
    const password = "correct-passphrase-here";
    const passwordHash = await hashPassword(password);
    mockPrisma.user.findUnique.mockResolvedValue(baseUser({ passwordHash, status: "SUSPENDED" }));

    const result = await authenticateCredentials("active.employer@example.test", password, IP);

    expect(result).toEqual({ ok: false, reason: "INVALID_CREDENTIALS" });
  });

  it("6. INACTIVE user → denied even with correct password", async () => {
    const password = "correct-passphrase-here";
    const passwordHash = await hashPassword(password);
    mockPrisma.user.findUnique.mockResolvedValue(baseUser({ passwordHash, status: "INACTIVE" }));

    const result = await authenticateCredentials("active.employer@example.test", password, IP);

    expect(result).toEqual({ ok: false, reason: "INVALID_CREDENTIALS" });
  });

  it("rate limiting: blocks further attempts once the failure threshold is reached", async () => {
    mockPrisma.loginAttempt.count.mockResolvedValue(5); // at/over the configured max
    mockPrisma.user.findUnique.mockResolvedValue(baseUser({ passwordHash: await hashPassword("x") }));

    const result = await authenticateCredentials("active.employer@example.test", "x", IP);

    expect(result).toEqual({ ok: false, reason: "RATE_LIMITED" });
    // Rate-limited attempts short-circuit before ever touching the user lookup.
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("rate limiting: a successful login clears prior failed attempts", async () => {
    const password = "correct-passphrase-here";
    const passwordHash = await hashPassword(password);
    mockPrisma.user.findUnique.mockResolvedValue(baseUser({ passwordHash }));

    await authenticateCredentials("active.employer@example.test", password, IP);

    expect(mockPrisma.loginAttempt.deleteMany).toHaveBeenCalledWith({
      where: { identifierHash: expect.any(String), succeeded: false },
    });
  });
});
