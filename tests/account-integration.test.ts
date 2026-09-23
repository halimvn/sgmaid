import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

/**
 * Phase 7 — the employer "My Account" service against the REAL
 * development database, not a mock: only `@/auth`'s auth() is mocked
 * (to switch between two fictional employer sessions), exactly like
 * tests/maids-integration.test.ts and tests/shortlist-integration.test.ts.
 *
 * Two throwaway, non-login-capable-by-us-directly fictional employer
 * Users (A and B) are created in beforeAll with real bcrypt-hashed
 * passwords and removed in afterAll. No real employer data is used.
 */

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const { getEmployerAccount, updateEmployerProfile, changeEmployerPassword } = await import("@/lib/services/account");

const EMPLOYER_A_EMAIL = "phase7-account-test-a@example.test";
const EMPLOYER_B_EMAIL = "phase7-account-test-b@example.test";
const INITIAL_PASSWORD = "the-initial-fictional-password";

let employerAId: string;
let employerBId: string;

function actingAs(userId: string) {
  mockAuth.mockResolvedValue({ user: { id: userId }, sessionVersion: 0 });
}

beforeAll(async () => {
  const passwordHash = await hashPassword(INITIAL_PASSWORD);
  const [userA, userB] = await Promise.all([
    prisma.user.create({
      data: {
        fullName: "[Fictional] Phase 7 Employer A",
        email: EMPLOYER_A_EMAIL,
        role: "EMPLOYER",
        status: "ACTIVE",
        mobileNumber: "+65 9111 1111",
        passwordHash,
        // Phase 8: an EMPLOYER now needs an unexpired accessExpiresAt to pass requireEmployer().
        accessExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    }),
    prisma.user.create({
      data: {
        fullName: "[Fictional] Phase 7 Employer B",
        email: EMPLOYER_B_EMAIL,
        role: "EMPLOYER",
        status: "ACTIVE",
        mobileNumber: "+65 9222 2222",
        passwordHash,
        accessExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    }),
  ]);
  employerAId = userA.id;
  employerBId = userB.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [employerAId, employerBId] } } });
  await prisma.$disconnect();
});

describe("Phase 7 — My Account against the real database", () => {
  it("5. an ACTIVE employer's account data matches their own real row", async () => {
    actingAs(employerAId);

    const account = await getEmployerAccount();

    expect(account.fullName).toBe("[Fictional] Phase 7 Employer A");
    expect(account.email).toBe(EMPLOYER_A_EMAIL);
    expect(account.mobileNumber).toBe("+65 9111 1111");
    expect(account.statusLabel).toBe("Active");
  });

  it("7/8. name and mobile number update, round-tripped through real Postgres", async () => {
    actingAs(employerAId);

    await updateEmployerProfile({ fullName: "[Fictional] Phase 7 Employer A (updated)", mobileNumber: "+65 9333 3333" });

    const row = await prisma.user.findUniqueOrThrow({ where: { id: employerAId }, select: { fullName: true, mobileNumber: true } });
    expect(row.fullName).toBe("[Fictional] Phase 7 Employer A (updated)");
    expect(row.mobileNumber).toBe("+65 9333 3333");

    const account = await getEmployerAccount();
    expect(account.fullName).toBe("[Fictional] Phase 7 Employer A (updated)");
    expect(account.mobileNumber).toBe("+65 9333 3333");
  });

  it("mobile number can be cleared back to null", async () => {
    actingAs(employerAId);

    await updateEmployerProfile({ fullName: "[Fictional] Phase 7 Employer A (updated)", mobileNumber: null });

    const row = await prisma.user.findUniqueOrThrow({ where: { id: employerAId }, select: { mobileNumber: true } });
    expect(row.mobileNumber).toBeNull();
  });

  it("9. email is never changed by updateEmployerProfile (not accepted as an input at all)", async () => {
    actingAs(employerAId);

    await updateEmployerProfile({ fullName: "[Fictional] Phase 7 Employer A (updated again)", mobileNumber: "+65 9333 3333" });

    const row = await prisma.user.findUniqueOrThrow({ where: { id: employerAId }, select: { email: true } });
    expect(row.email).toBe(EMPLOYER_A_EMAIL);
  });

  it("6. updating Employer A's profile never touches Employer B's real row", async () => {
    actingAs(employerAId);
    await updateEmployerProfile({ fullName: "[Fictional] Phase 7 Employer A (A's own change)", mobileNumber: "+65 9444 4444" });

    const bRow = await prisma.user.findUniqueOrThrow({ where: { id: employerBId }, select: { fullName: true, mobileNumber: true } });
    expect(bRow.fullName).toBe("[Fictional] Phase 7 Employer B");
    expect(bRow.mobileNumber).toBe("+65 9222 2222");
  });

  it("13. changing Employer A's password with the wrong current password is rejected, and Employer B's password is untouched", async () => {
    actingAs(employerAId);

    const result = await changeEmployerPassword("definitely-the-wrong-password", "a-brand-new-fictional-password-1");
    expect(result).toEqual({ ok: false, reason: "WRONG_CURRENT_PASSWORD" });

    const bRow = await prisma.user.findUniqueOrThrow({ where: { id: employerBId }, select: { passwordHash: true } });
    expect(await verifyPassword(INITIAL_PASSWORD, bRow.passwordHash!)).toBe(true);
  });

  it("12/15/16. a correct current password changes Employer A's password and increments sessionVersion; Employer B is unaffected", async () => {
    actingAs(employerAId);

    const before = await prisma.user.findUniqueOrThrow({ where: { id: employerAId }, select: { sessionVersion: true } });

    const newPassword = "a-brand-new-fictional-password-2";
    const result = await changeEmployerPassword(INITIAL_PASSWORD, newPassword);
    expect(result).toEqual({ ok: true });

    const after = await prisma.user.findUniqueOrThrow({
      where: { id: employerAId },
      select: { sessionVersion: true, passwordHash: true },
    });
    expect(after.sessionVersion).toBe(before.sessionVersion + 1);

    // The new password verifies; the old one no longer does.
    expect(await verifyPassword(newPassword, after.passwordHash!)).toBe(true);
    expect(await verifyPassword(INITIAL_PASSWORD, after.passwordHash!)).toBe(false);

    // Employer B's own password and sessionVersion are completely untouched.
    const bRow = await prisma.user.findUniqueOrThrow({ where: { id: employerBId }, select: { sessionVersion: true, passwordHash: true } });
    expect(bRow.sessionVersion).toBe(0);
    expect(await verifyPassword(INITIAL_PASSWORD, bRow.passwordHash!)).toBe(true);
  });

  it("17/18. role and status are never accepted or changed by any My Account operation", async () => {
    actingAs(employerBId);

    await updateEmployerProfile({ fullName: "[Fictional] Phase 7 Employer B (renamed)", mobileNumber: "+65 9555 5555" });

    const row = await prisma.user.findUniqueOrThrow({ where: { id: employerBId }, select: { role: true, status: true } });
    expect(row.role).toBe("EMPLOYER");
    expect(row.status).toBe("ACTIVE");
  });
});
