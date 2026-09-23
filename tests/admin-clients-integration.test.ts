import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";

/**
 * Phase 8 — the full staff-created client access lifecycle, run against
 * the REAL development database, not a mock: only `@/auth`'s auth() is
 * mocked (to switch between a fictional admin session and the
 * just-created fictional client session), exactly like
 * tests/admin-maids-integration.test.ts.
 *
 * Admin creates a client (username + password, ACTIVE, ~72h access) →
 * the client authenticates with that username + password → the client
 * (unexpired) can browse helpers, view a profile, and shortlist one →
 * access is expired (directly, in the DB, simulating 72h passing) → the
 * SAME already-issued session and the login itself are both denied
 * (spec test items #7–15) → Admin extends access by 3 days → the client
 * is restored → Admin resets the client's password, which also
 * invalidates the old password immediately (session revocation via
 * sessionVersion — spec test items #16–19). Everything created here —
 * the admin User, the client User, and the fictional MaidProfile fixture
 * — is deleted in afterAll; the client User row itself is never deleted
 * mid-test on expiry, matching the spec's "do not delete expired
 * clients" rule.
 */

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const { createClient, extendClientAccess, resetClientPassword } = await import("@/lib/services/admin/clients");
const { authenticateCredentials, normalizeEmail } = await import("@/lib/auth/credentials");
const { normalizeUsername } = await import("@/lib/auth/username");
const { buildLoginIdentifier } = await import("@/lib/auth/rate-limit");
const { listEmployerVisibleMaids, getEmployerVisibleMaidProfile } = await import("@/lib/services/maids");
const { parseMaidFilters } = await import("@/lib/validation/maid-filters");
const { addToShortlist, getShortlistedMaidIds } = await import("@/lib/services/shortlist");

const TEST_ADMIN_EMAIL = "phase8-integration-test-admin@example.test";
const TEST_USERNAME = "zztestp8client";
const TEST_EMAIL_ATTEMPT = "zztestp8client@example.test"; // the (deliberately rejected) email-login attempt below
const TEST_PASSWORD = "a-fictional-phase8-passphrase";
const TEST_PROFILE_CODE = "ZZTEST-P8-001";
const IP = "203.0.113.20";

// This suite calls the real authenticateCredentials() repeatedly against
// the real LoginAttempt-backed rate limiter (lib/auth/rate-limit.ts) —
// unlike every other integration suite here, which only ever mocks
// auth(). Re-running this file leaves failed-attempt rows behind under a
// few fixed identifier+IP hashes, which would eventually rate-limit a
// LATER run's legitimate "denied" assertions into a RATE_LIMITED result
// instead. Clear exactly those identifiers' rows before and after.
const CLEARED_IDENTIFIER_HASHES = [
  buildLoginIdentifier(normalizeUsername(TEST_USERNAME)!, IP),
  buildLoginIdentifier(normalizeEmail(TEST_EMAIL_ATTEMPT), IP),
];
async function clearLoginAttempts() {
  await prisma.loginAttempt.deleteMany({ where: { identifierHash: { in: CLEARED_IDENTIFIER_HASHES } } });
}

let adminId: string;
let clientId: string;
let maidId: string;

function asAdmin() {
  mockAuth.mockResolvedValue({ user: { id: adminId }, sessionVersion: 0 });
}
function asClient(sessionVersion = 0) {
  mockAuth.mockResolvedValue({ user: { id: clientId }, sessionVersion });
}

beforeAll(async () => {
  const admin = await prisma.user.create({
    data: { fullName: "[Fictional] Phase 8 Integration Test Admin", email: TEST_ADMIN_EMAIL, role: "ADMIN", status: "ACTIVE" },
  });
  adminId = admin.id;

  // A single ACTIVE+AVAILABLE fictional maid so the client can exercise
  // browse/profile/shortlist against something real.
  const maid = await prisma.maidProfile.create({
    data: {
      profileCode: TEST_PROFILE_CODE,
      name: "[Fictional] Phase 8 Test Maid",
      nationality: "Indonesian",
      dateOfBirth: new Date("1990-01-01"),
      yearsExperience: 3,
      profileStatus: "ACTIVE",
      availabilityStatus: "AVAILABLE",
    },
  });
  maidId = maid.id;

  await clearLoginAttempts();
});

afterAll(async () => {
  await clearLoginAttempts();
  // AuditLog.actor is onDelete: Restrict — remove this test's own audit
  // rows first (same pattern as tests/admin-maids-integration.test.ts).
  await prisma.auditLog.deleteMany({ where: { actorId: adminId } }).catch(() => {});
  await prisma.maidProfile.delete({ where: { id: maidId } }).catch(() => {});
  if (clientId) await prisma.user.delete({ where: { id: clientId } }).catch(() => {});
  await prisma.user.delete({ where: { id: adminId } }).catch(() => {});
  await prisma.$disconnect();
});

describe("Phase 8 — staff-created client access against the real database", () => {
  it("Admin → Clients → Create Client Access: creates an ACTIVE client with a ~72h access window", async () => {
    asAdmin();

    const result = await createClient({
      fullName: "[Fictional] Phase 8 Test Client",
      username: TEST_USERNAME,
      password: TEST_PASSWORD,
      confirmPassword: TEST_PASSWORD,
      mobileNumber: undefined,
      email: undefined,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    clientId = result.id;

    const row = await prisma.user.findUniqueOrThrow({ where: { id: clientId } });
    expect(row.status).toBe("ACTIVE");
    expect(row.role).toBe("EMPLOYER");
    expect(row.username).toBe(TEST_USERNAME);
    expect(row.passwordHash).not.toBeNull();
    expect(row.passwordHash).not.toBe(TEST_PASSWORD);
    expect(row.accessExpiresAt!.getTime()).toBeGreaterThan(Date.now() + 71 * 60 * 60 * 1000);
  });

  it("1. the client authenticates with USERNAME + password (real DB, real bcrypt)", async () => {
    const result = await authenticateCredentials(TEST_USERNAME, TEST_PASSWORD, IP);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.id).toBe(clientId);
      expect(result.user.role).toBe("EMPLOYER");
    }
  });

  it("2. the client CANNOT authenticate with email + password (this account has no email at all)", async () => {
    const result = await authenticateCredentials(TEST_EMAIL_ATTEMPT, TEST_PASSWORD, IP);
    expect(result).toEqual({ ok: false, reason: "INVALID_CREDENTIALS" });
  });

  it("7. an unexpired, ACTIVE client can browse helpers, view a profile, and shortlist one", async () => {
    asClient();

    const listing = await listEmployerVisibleMaids(parseMaidFilters({}));
    expect(listing.items.some((m) => m.id === maidId)).toBe(true);

    const profile = await getEmployerVisibleMaidProfile(maidId);
    expect(profile?.profileCode).toBe(TEST_PROFILE_CODE);

    const shortlistResult = await addToShortlist(maidId);
    expect(shortlistResult.ok).toBe(true);

    const shortlisted = await getShortlistedMaidIds();
    expect(shortlisted.has(maidId)).toBe(true);
  });

  it("8/9/10/11/14. once access expires, the SAME already-issued session loses access on its very next request — listing, profile, and shortlist all reject", async () => {
    // Simulate 72 hours passing without deleting the User row — per the
    // spec, an expired client still exists but cannot access the portal.
    await prisma.user.update({ where: { id: clientId }, data: { accessExpiresAt: new Date(Date.now() - 1000) } });

    asClient(); // the exact same session as the previous test — never re-authenticated

    await expect(listEmployerVisibleMaids(parseMaidFilters({}))).rejects.toBeDefined();
    await expect(getEmployerVisibleMaidProfile(maidId)).rejects.toBeDefined();
    await expect(getShortlistedMaidIds()).rejects.toBeDefined();

    // And the client row itself was never deleted.
    const stillExists = await prisma.user.findUnique({ where: { id: clientId } });
    expect(stillExists).not.toBeNull();
  });

  it("8. a fresh login attempt with correct credentials is now denied as expired, distinguishably", async () => {
    const result = await authenticateCredentials(TEST_USERNAME, TEST_PASSWORD, IP);
    expect(result).toEqual({ ok: false, reason: "ACCESS_EXPIRED" });
  });

  it("15. SUSPENDED blocks login regardless of the access window, and is restored independently of expiry", async () => {
    await prisma.user.update({ where: { id: clientId }, data: { status: "SUSPENDED", accessExpiresAt: new Date(Date.now() + 60 * 60 * 1000) } });

    const result = await authenticateCredentials(TEST_USERNAME, TEST_PASSWORD, IP);
    expect(result).toEqual({ ok: false, reason: "INVALID_CREDENTIALS" });

    // Restore for the rest of the suite.
    await prisma.user.update({ where: { id: clientId }, data: { status: "ACTIVE", accessExpiresAt: new Date(Date.now() - 1000) } });
  });

  it("17. Admin can reactivate a fully expired client's access for another 3 days", async () => {
    asAdmin();

    const result = await extendClientAccess(clientId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(new Date(result.accessExpiresAt).getTime()).toBeGreaterThan(Date.now() + 71 * 60 * 60 * 1000);
  });

  it("confirms the client can log in and access the dashboard again after Admin extends access", async () => {
    const loginResult = await authenticateCredentials(TEST_USERNAME, TEST_PASSWORD, IP);
    expect(loginResult.ok).toBe(true);

    asClient();
    const listing = await listEmployerVisibleMaids(parseMaidFilters({}));
    expect(listing.items.some((m) => m.id === maidId)).toBe(true);
  });

  it("18/19. Admin sets a new password: the old password stops working immediately (sessionVersion bump), the new one works", async () => {
    const beforeRow = await prisma.user.findUniqueOrThrow({ where: { id: clientId } });

    asAdmin();
    const NEW_PASSWORD = "a-different-fictional-passphrase";
    const result = await resetClientPassword(clientId, NEW_PASSWORD);
    expect(result.ok).toBe(true);

    const afterRow = await prisma.user.findUniqueOrThrow({ where: { id: clientId } });
    expect(afterRow.sessionVersion).toBe(beforeRow.sessionVersion + 1);

    const oldPasswordResult = await authenticateCredentials(TEST_USERNAME, TEST_PASSWORD, IP);
    expect(oldPasswordResult).toEqual({ ok: false, reason: "INVALID_CREDENTIALS" });

    const newPasswordResult = await authenticateCredentials(TEST_USERNAME, NEW_PASSWORD, IP);
    expect(newPasswordResult.ok).toBe(true);

    // An already-issued session captured at the OLD sessionVersion (0) is
    // also rejected by evaluateAccess() — not just a fresh login.
    asClient(0);
    await expect(listEmployerVisibleMaids(parseMaidFilters({}))).rejects.toBeDefined();
  });

  it("12/13. an expired client cannot access biodata or photo document routes either", async () => {
    const { getBiodataSignedUrl, getMaidPhotoSignedUrl } = await import("@/lib/services/maid-documents");

    await prisma.user.update({ where: { id: clientId }, data: { accessExpiresAt: new Date(Date.now() - 1000) } });
    asClient(1); // sessionVersion 1 — matches the post-password-reset row

    await expect(getBiodataSignedUrl(maidId)).rejects.toBeDefined();
    await expect(getMaidPhotoSignedUrl(maidId)).rejects.toBeDefined();
  });
});
