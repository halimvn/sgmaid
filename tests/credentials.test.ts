import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashPassword } from "@/lib/auth/password";

/**
 * Tests 1–6 from the Phase 2 spec, revised for Phase 8's username-based
 * EMPLOYER login: the core login decision logic in
 * lib/auth/credentials.ts, against a mocked Prisma client (no real
 * database). Uses real bcryptjs hashing/comparison — these are genuine
 * password checks, not stubbed out, since that's the behaviour under
 * test.
 *
 * Also covers Phase 8 spec test items #1, #2, #7, #8, #15, #23: employer
 * authenticates by username (never email), an admin's email-based login
 * is unaffected, an ACTIVE-and-unexpired employer is allowed, an expired
 * employer is denied with a distinguishable reason, and a suspended
 * employer is denied regardless of the 3-day window.
 */

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn() },
  loginAttempt: { count: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

const { authenticateCredentials } = await import("@/lib/auth/credentials");

const IP = "203.0.113.10";
const FUTURE = new Date(Date.now() + 60 * 60 * 1000); // +1h — comfortably unexpired
const PAST = new Date(Date.now() - 60 * 1000); // -1min — just expired

function baseEmployer(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "user_1",
    username: "activeclient",
    email: null as string | null,
    passwordHash: null as string | null,
    status: "ACTIVE",
    role: "EMPLOYER",
    sessionVersion: 0,
    accessExpiresAt: FUTURE as Date | null,
    ...overrides,
  };
}

function baseAdmin(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "admin_1",
    username: null as string | null,
    email: "staff@sgmaid.example",
    passwordHash: null as string | null,
    status: "ACTIVE",
    role: "ADMIN",
    sessionVersion: 0,
    accessExpiresAt: null as Date | null,
    ...overrides,
  };
}

// findUnique is called with either { where: { username } } or
// { where: { email } } — this stub inspects which one was asked for and
// returns the matching fictional row, or null.
function mockUsersByIdentifier(users: { username?: string | null; email?: string | null }[]) {
  mockPrisma.user.findUnique.mockImplementation(async (args: { where: { username?: string; email?: string } }) => {
    if (args.where.username) return users.find((u) => u.username === args.where.username) ?? null;
    if (args.where.email) return users.find((u) => u.email === args.where.email) ?? null;
    return null;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.loginAttempt.count.mockResolvedValue(0); // not rate limited by default
});

describe("authenticateCredentials — EMPLOYER (username)", () => {
  it("1. active, unexpired employer + correct USERNAME + correct password → allowed", async () => {
    const password = "a-fictional-passphrase";
    const passwordHash = await hashPassword(password);
    const employer = baseEmployer({ passwordHash });
    mockUsersByIdentifier([employer]);

    const result = await authenticateCredentials("ActiveClient", password, IP); // mixed case on purpose

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

  it("2. an employer CANNOT authenticate using their email + password, even if one is on file", async () => {
    const password = "correct-passphrase-here";
    const passwordHash = await hashPassword(password);
    const employer = baseEmployer({ passwordHash, email: "client.contact@example.test" });
    mockUsersByIdentifier([employer]);

    const result = await authenticateCredentials("client.contact@example.test", password, IP);

    expect(result).toEqual({ ok: false, reason: "INVALID_CREDENTIALS" });
    // The email lookup happened (username-shape rejected an "@" value outright),
    // but the EMPLOYER match was discarded rather than authenticated.
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("wrong password → denied with generic reason", async () => {
    const passwordHash = await hashPassword("the-real-password");
    mockUsersByIdentifier([baseEmployer({ passwordHash })]);

    const result = await authenticateCredentials("activeclient", "totally-wrong-password", IP);

    expect(result).toEqual({ ok: false, reason: "INVALID_CREDENTIALS" });
    expect(mockPrisma.loginAttempt.create).toHaveBeenCalledWith({
      data: { identifierHash: expect.any(String), succeeded: false },
    });
  });

  it("unknown username → denied with the SAME generic reason as wrong password", async () => {
    mockUsersByIdentifier([]);

    const result = await authenticateCredentials("nobody", "whatever-password", IP);

    expect(result).toEqual({ ok: false, reason: "INVALID_CREDENTIALS" });
  });

  it("PENDING employer → denied even with correct password", async () => {
    const password = "correct-passphrase-here";
    const passwordHash = await hashPassword(password);
    mockUsersByIdentifier([baseEmployer({ passwordHash, status: "PENDING" })]);

    const result = await authenticateCredentials("activeclient", password, IP);

    expect(result).toEqual({ ok: false, reason: "INVALID_CREDENTIALS" });
  });

  it("15. SUSPENDED employer → denied even with correct password AND an unexpired access window", async () => {
    const password = "correct-passphrase-here";
    const passwordHash = await hashPassword(password);
    mockUsersByIdentifier([baseEmployer({ passwordHash, status: "SUSPENDED", accessExpiresAt: FUTURE })]);

    const result = await authenticateCredentials("activeclient", password, IP);

    expect(result).toEqual({ ok: false, reason: "INVALID_CREDENTIALS" });
  });

  it("INACTIVE employer → denied even with correct password", async () => {
    const password = "correct-passphrase-here";
    const passwordHash = await hashPassword(password);
    mockUsersByIdentifier([baseEmployer({ passwordHash, status: "INACTIVE" })]);

    const result = await authenticateCredentials("activeclient", password, IP);

    expect(result).toEqual({ ok: false, reason: "INVALID_CREDENTIALS" });
  });

  it("8. an employer whose 3-day access has expired is denied, distinguishably, even with correct credentials", async () => {
    const password = "correct-passphrase-here";
    const passwordHash = await hashPassword(password);
    mockUsersByIdentifier([baseEmployer({ passwordHash, accessExpiresAt: PAST })]);

    const result = await authenticateCredentials("activeclient", password, IP);

    expect(result).toEqual({ ok: false, reason: "ACCESS_EXPIRED" });
    expect(mockPrisma.user.update).not.toHaveBeenCalled(); // no lastLoginAt bump on a rejected login
  });

  it("an employer with no accessExpiresAt at all is treated as expired (fails safe)", async () => {
    const password = "correct-passphrase-here";
    const passwordHash = await hashPassword(password);
    mockUsersByIdentifier([baseEmployer({ passwordHash, accessExpiresAt: null })]);

    const result = await authenticateCredentials("activeclient", password, IP);

    expect(result).toEqual({ ok: false, reason: "ACCESS_EXPIRED" });
  });

  it("wrong password on an already-expired account still reports INVALID_CREDENTIALS, not ACCESS_EXPIRED (expiry is only revealed once the password is confirmed correct)", async () => {
    const passwordHash = await hashPassword("the-real-password");
    mockUsersByIdentifier([baseEmployer({ passwordHash, accessExpiresAt: PAST })]);

    const result = await authenticateCredentials("activeclient", "wrong-password", IP);

    expect(result).toEqual({ ok: false, reason: "INVALID_CREDENTIALS" });
  });
});

describe("authenticateCredentials — ADMIN (email, unchanged)", () => {
  it("7. an ACTIVE admin authenticates with their EMAIL + password exactly as before Phase 8", async () => {
    const password = "an-admin-passphrase";
    const passwordHash = await hashPassword(password);
    const admin = baseAdmin({ passwordHash });
    mockUsersByIdentifier([admin]);

    const result = await authenticateCredentials("Staff@sgmaid.example", password, IP);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user).toEqual({ id: "admin_1", role: "ADMIN", sessionVersion: 0 });
    }
  });

  it("an admin has no accessExpiresAt and is never subject to the 3-day check", async () => {
    const password = "an-admin-passphrase";
    const passwordHash = await hashPassword(password);
    mockUsersByIdentifier([baseAdmin({ passwordHash, accessExpiresAt: null })]);

    const result = await authenticateCredentials("staff@sgmaid.example", password, IP);

    expect(result.ok).toBe(true);
  });

  it("23. a plain, non-email-shaped value never resolves to an admin's email row", async () => {
    // An admin typing just "staff" (no @domain) should not somehow match
    // by coincidence — normalizeEmail("staff") !== "staff@sgmaid.example".
    mockUsersByIdentifier([baseAdmin({ passwordHash: await hashPassword("x") })]);

    const result = await authenticateCredentials("staff", "x", IP);

    expect(result).toEqual({ ok: false, reason: "INVALID_CREDENTIALS" });
  });
});

describe("rate limiting (unchanged behaviour, keyed by whichever identifier shape was used)", () => {
  it("blocks further attempts once the failure threshold is reached", async () => {
    mockPrisma.loginAttempt.count.mockResolvedValue(5); // at/over the configured max
    mockUsersByIdentifier([baseEmployer({ passwordHash: await hashPassword("x") })]);

    const result = await authenticateCredentials("activeclient", "x", IP);

    expect(result).toEqual({ ok: false, reason: "RATE_LIMITED" });
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("a successful login clears prior failed attempts", async () => {
    const password = "correct-passphrase-here";
    const passwordHash = await hashPassword(password);
    mockUsersByIdentifier([baseEmployer({ passwordHash })]);

    await authenticateCredentials("activeclient", password, IP);

    expect(mockPrisma.loginAttempt.deleteMany).toHaveBeenCalledWith({
      where: { identifierHash: expect.any(String), succeeded: false },
    });
  });
});
