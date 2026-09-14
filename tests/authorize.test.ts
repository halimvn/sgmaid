import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests 11–14 from the Phase 2 spec: authorization decisions
 * (lib/auth/authorize.ts). evaluateAccess() is tested directly (the pure
 * logic core — no Next.js involved). requireActiveUser/requireEmployer/
 * requireAdmin are tested through a mocked next/navigation redirect()
 * (which really does throw in Next.js — we mock it to throw the same
 * way) and a mocked auth() session, so "redirects to /login" can be
 * asserted without needing a real request/response or a running server.
 */

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
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

const { evaluateAccess, requireActiveUser, requireEmployer, requireAdmin } = await import("@/lib/auth/authorize");

function dbUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "emp_1",
    fullName: "[Fictional] Test Employer",
    email: "employer@example.test",
    role: "EMPLOYER",
    status: "ACTIVE",
    sessionVersion: 0,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("evaluateAccess (pure logic)", () => {
  it("12. an active employer's session is allowed", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(dbUser());

    const result = await evaluateAccess({ userId: "emp_1", tokenSessionVersion: 0 });

    expect(result.allowed).toBe(true);
  });

  it("13. a suspended user's existing session is rejected on the next authorization check", async () => {
    // Simulates: the session was issued while ACTIVE, but the DB row has
    // since been changed to SUSPENDED — exactly the scenario the spec
    // requires to be caught on the very next request, not at next login.
    mockPrisma.user.findUnique.mockResolvedValue(dbUser({ status: "SUSPENDED" }));

    const result = await evaluateAccess({ userId: "emp_1", tokenSessionVersion: 0 });

    expect(result).toEqual({ allowed: false, reason: "NOT_ACTIVE" });
  });

  it("14. an employer cannot pass themselves off as ADMIN — role is read from the database, never from the caller", async () => {
    // The function has no parameter for "the role the user claims to
    // be" at all — only `requiredRole`, which is what the ROUTE demands.
    // Here we simulate a route that requires ADMIN, for a user whose DB
    // row says EMPLOYER: it must be rejected regardless of anything the
    // client could have sent.
    mockPrisma.user.findUnique.mockResolvedValue(dbUser({ role: "EMPLOYER" }));

    const result = await evaluateAccess({ userId: "emp_1", tokenSessionVersion: 0, requiredRole: "ADMIN" });

    expect(result).toEqual({ allowed: false, reason: "WRONG_ROLE" });
  });

  it("rejects a session whose sessionVersion no longer matches the database (revoked)", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(dbUser({ sessionVersion: 2 }));

    const result = await evaluateAccess({ userId: "emp_1", tokenSessionVersion: 0 });

    expect(result).toEqual({ allowed: false, reason: "SESSION_REVOKED" });
  });

  it("rejects a userId that no longer exists", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const result = await evaluateAccess({ userId: "ghost", tokenSessionVersion: 0 });

    expect(result).toEqual({ allowed: false, reason: "NOT_FOUND" });
  });
});

describe("requireActiveUser / requireEmployer / requireAdmin (redirect wrappers)", () => {
  it("11. an unauthenticated (logged-out) caller is redirected to /login", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(requireActiveUser()).rejects.toThrow(/REDIRECT:\/login/);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("12. an authenticated, active employer is allowed through (no redirect)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "emp_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser());

    const user = await requireEmployer();

    expect(user.id).toBe("emp_1");
  });

  it("13. a session for a now-suspended user is rejected on the next request", async () => {
    mockAuth.mockResolvedValue({ user: { id: "emp_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser({ status: "SUSPENDED" }));

    await expect(requireActiveUser()).rejects.toThrow(/REDIRECT:\/login/);
  });

  it("14. requireAdmin redirects an authenticated EMPLOYER rather than granting admin access", async () => {
    mockAuth.mockResolvedValue({ user: { id: "emp_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser({ role: "EMPLOYER" }));

    await expect(requireAdmin()).rejects.toThrow(/REDIRECT:\/login/);
  });
});
