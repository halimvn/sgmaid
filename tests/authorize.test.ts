import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests 11–14 from the Phase 2 spec: authorization decisions
 * (lib/auth/authorize.ts). evaluateAccess() is tested directly (the pure
 * logic core — no Next.js involved). requireActiveUser/requireEmployer/
 * requireAdmin are tested through a mocked next/navigation redirect()
 * (which really does throw in Next.js — we mock it to throw the same
 * way) and a mocked auth() session, so "redirects to /login" can be
 * asserted without needing a real request/response or a running server.
 *
 * Also covers Phase 8 spec test item #9: an EMPLOYER session that was
 * valid at sign-in loses access the moment accessExpiresAt passes, on
 * its very next authorization check — not just at the next login. This
 * is the single enforcement point every employer-facing service/route
 * relies on (each independently calls requireEmployer() — see e.g.
 * lib/services/maids.ts, lib/services/shortlist.ts,
 * lib/services/maid-documents.ts), so proving it here proves it
 * everywhere those call it.
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

const FUTURE = new Date(Date.now() + 60 * 60 * 1000); // +1h
const PAST = new Date(Date.now() - 60 * 1000); // -1min

function dbUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "emp_1",
    fullName: "[Fictional] Test Employer",
    username: "fictionalclient",
    email: null,
    role: "EMPLOYER",
    status: "ACTIVE",
    sessionVersion: 0,
    // Phase 8: every EMPLOYER fixture defaults to a comfortably-unexpired
    // access window so the pre-Phase-8 test cases above keep meaning what
    // they always meant ("an active employer is allowed") — the ADMIN
    // tests further down override role to ADMIN, which ignores this
    // field entirely.
    accessExpiresAt: FUTURE,
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

  it("9. an EMPLOYER whose 3-day access has expired is rejected, even with a still-valid session (sessionVersion matches, status ACTIVE)", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(dbUser({ accessExpiresAt: PAST }));

    const result = await evaluateAccess({ userId: "emp_1", tokenSessionVersion: 0 });

    expect(result).toEqual({ allowed: false, reason: "ACCESS_EXPIRED" });
  });

  it("an EMPLOYER with no accessExpiresAt at all is rejected (fails safe, never treated as unrestricted)", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(dbUser({ accessExpiresAt: null }));

    const result = await evaluateAccess({ userId: "emp_1", tokenSessionVersion: 0 });

    expect(result).toEqual({ allowed: false, reason: "ACCESS_EXPIRED" });
  });

  it("an ADMIN is never subject to accessExpiresAt, even if the column is somehow null", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(
      dbUser({ role: "ADMIN", username: null, email: "staff@sgmaid.example", accessExpiresAt: null })
    );

    const result = await evaluateAccess({ userId: "emp_1", tokenSessionVersion: 0 });

    expect(result.allowed).toBe(true);
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

  it("9. an already-signed-in employer's session stops working the moment their 3-day access expires — not just at their next login", async () => {
    // The session itself is otherwise perfectly valid (matching
    // sessionVersion, ACTIVE status) — only accessExpiresAt has passed
    // since this session was issued.
    mockAuth.mockResolvedValue({ user: { id: "emp_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser({ accessExpiresAt: PAST }));

    await expect(requireEmployer()).rejects.toThrow(/REDIRECT:\/login/);
  });

  it("14. requireAdmin redirects an authenticated EMPLOYER rather than granting admin access", async () => {
    mockAuth.mockResolvedValue({ user: { id: "emp_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser({ role: "EMPLOYER" }));

    await expect(requireAdmin()).rejects.toThrow(/REDIRECT:\/login/);
  });
});

/**
 * Phase 6 #1–5: the exact boundary /admin/* (app/admin/layout.tsx) and
 * every admin service function rely on — requireAdmin() is the same
 * function tested above, called with the same redirect-on-failure
 * semantics; these cases just spell out the specific admin scenarios
 * the Phase 6 spec asks to be proven.
 */
describe("Phase 6 — requireAdmin() boundary for /admin/*", () => {
  it("1/2. a logged-out (no session) caller cannot access admin", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(requireAdmin()).rejects.toThrow(/REDIRECT:\/login/);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("1. an authenticated EMPLOYER (not ADMIN) cannot access admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "emp_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser({ role: "EMPLOYER" }));

    await expect(requireAdmin()).rejects.toThrow(/REDIRECT:\/login/);
  });

  it("3. a PENDING admin cannot access admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "adm_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser({ id: "adm_1", role: "ADMIN", status: "PENDING" }));

    await expect(requireAdmin()).rejects.toThrow(/REDIRECT:\/login/);
  });

  it("4. a SUSPENDED admin cannot access admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "adm_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(dbUser({ id: "adm_1", role: "ADMIN", status: "SUSPENDED" }));

    await expect(requireAdmin()).rejects.toThrow(/REDIRECT:\/login/);
  });

  it("5. an ACTIVE admin can access admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "adm_1" }, sessionVersion: 0 });
    mockPrisma.user.findUnique.mockResolvedValue(
      dbUser({ id: "adm_1", fullName: "[Fictional] Test Admin", role: "ADMIN", status: "ACTIVE" })
    );

    const user = await requireAdmin();

    expect(user.id).toBe("adm_1");
    expect(user.role).toBe("ADMIN");
  });
});
