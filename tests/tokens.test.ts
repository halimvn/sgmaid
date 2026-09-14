import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";

/**
 * Tests 7–10 and 15 from the Phase 2 spec: single-use auth tokens
 * (lib/auth/tokens.ts) and the account-setup completion flow
 * (lib/auth/account-setup.ts), against a tiny in-memory fake Prisma
 * (not a real database) that's stateful enough to exercise the real
 * "create → validate → consume → re-validate fails" lifecycle across
 * multiple calls within one test.
 */

type FakeToken = {
  id: string;
  userId: string;
  tokenHash: string;
  purpose: "ACCOUNT_SETUP" | "PASSWORD_RESET";
  expiresAt: Date;
  usedAt: Date | null;
};

type FakeUser = {
  id: string;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "INACTIVE";
  passwordHash: string | null;
  sessionVersion: number;
};

const state = vi.hoisted(() => ({
  tokens: new Map<string, FakeToken>(), // keyed by tokenHash
  users: new Map<string, FakeUser>(), // keyed by id
  nextId: 1,
}));

const mockPrisma = vi.hoisted(() => ({
  userAuthToken: {
    create: vi.fn(async ({ data }: { data: Omit<FakeToken, "id" | "usedAt"> }) => {
      const row: FakeToken = { id: `token_${state.nextId++}`, usedAt: null, ...data };
      state.tokens.set(row.tokenHash, row);
      return row;
    }),
    findUnique: vi.fn(async ({ where: { tokenHash } }: { where: { tokenHash: string } }) => {
      return state.tokens.get(tokenHash) ?? null;
    }),
    update: vi.fn(async ({ where: { id }, data }: { where: { id: string }; data: Partial<FakeToken> }) => {
      for (const row of state.tokens.values()) {
        if (row.id === id) Object.assign(row, data);
      }
    }),
    updateMany: vi.fn(async ({ where, data }: { where: { userId: string; purpose: string; usedAt: null }; data: Partial<FakeToken> }) => {
      for (const row of state.tokens.values()) {
        if (row.userId === where.userId && row.purpose === where.purpose && row.usedAt === null) {
          Object.assign(row, data);
        }
      }
    }),
  },
  user: {
    findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) => state.users.get(id) ?? null),
    update: vi.fn(async ({ where: { id }, data }: { where: { id: string }; data: Partial<FakeUser> }) => {
      const user = state.users.get(id);
      if (user) Object.assign(user, data);
      return user;
    }),
  },
  $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
}));

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

const { createAuthToken, validateAuthToken } = await import("@/lib/auth/tokens");
const { completeAccountSetup } = await import("@/lib/auth/account-setup");

beforeEach(() => {
  state.tokens.clear();
  state.users.clear();
  state.nextId = 1;
  vi.clearAllMocks();
  state.users.set("emp_1", { id: "emp_1", status: "PENDING", passwordHash: null, sessionVersion: 0 });
});

describe("auth tokens", () => {
  it("15. the raw token is never stored — only its SHA-256 hash is persisted", async () => {
    const { rawToken } = await createAuthToken("emp_1", "ACCOUNT_SETUP");
    const stored = [...state.tokens.values()][0];

    expect(stored.tokenHash).not.toBe(rawToken);
    expect(stored.tokenHash).toBe(crypto.createHash("sha256").update(rawToken).digest("hex"));
    // Sanity: nothing in the fake "database" contains the raw token string.
    expect(JSON.stringify([...state.tokens.values()])).not.toContain(rawToken);
  });

  it("9. an expired token is rejected", async () => {
    const { rawToken } = await createAuthToken("emp_1", "ACCOUNT_SETUP");
    const stored = [...state.tokens.values()][0];
    stored.expiresAt = new Date(Date.now() - 1000); // force expiry

    const result = await validateAuthToken(rawToken, "ACCOUNT_SETUP");

    expect(result).toEqual({ ok: false, reason: "EXPIRED" });
  });

  it("10. successful password setup activates the account", async () => {
    const { rawToken } = await createAuthToken("emp_1", "ACCOUNT_SETUP");

    const result = await completeAccountSetup(rawToken, "a-decent-length-passphrase", "a-decent-length-passphrase");

    expect(result).toEqual({ ok: true });
    expect(state.users.get("emp_1")?.status).toBe("ACTIVE");
    expect(state.users.get("emp_1")?.passwordHash).toBeTruthy();
  });

  it("7. an account setup token works once", async () => {
    const { rawToken } = await createAuthToken("emp_1", "ACCOUNT_SETUP");

    const result = await completeAccountSetup(rawToken, "a-decent-length-passphrase", "a-decent-length-passphrase");

    expect(result.ok).toBe(true);
  });

  it("8. an account setup token cannot be reused", async () => {
    const { rawToken } = await createAuthToken("emp_1", "ACCOUNT_SETUP");
    await completeAccountSetup(rawToken, "a-decent-length-passphrase", "a-decent-length-passphrase");

    // Second attempt with the SAME raw token, after the account is
    // already ACTIVE.
    const secondResult = await completeAccountSetup(rawToken, "another-passphrase-entirely", "another-passphrase-entirely");

    expect(secondResult).toEqual({ ok: false, reason: "INVALID_OR_EXPIRED" });
  });

  it("rejects a token for the wrong purpose", async () => {
    const { rawToken } = await createAuthToken("emp_1", "PASSWORD_RESET");

    const result = await validateAuthToken(rawToken, "ACCOUNT_SETUP");

    expect(result).toEqual({ ok: false, reason: "INVALID" });
  });

  it("creating a new token invalidates prior outstanding tokens of the same purpose", async () => {
    const first = await createAuthToken("emp_1", "ACCOUNT_SETUP");
    await createAuthToken("emp_1", "ACCOUNT_SETUP"); // e.g. invitation re-sent

    const result = await validateAuthToken(first.rawToken, "ACCOUNT_SETUP");

    expect(result).toEqual({ ok: false, reason: "USED" });
  });
});
