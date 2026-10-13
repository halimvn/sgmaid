import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";

/**
 * Admin "Client Shortlists" view — which helpers each client has shortlisted. Runs against the
 * REAL development database; only `@/auth` is mocked (to switch between a fictional admin,
 * staff member and employer). Everything created is fictional (ZZTEST-SL- prefix) and removed
 * in afterAll.
 */

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const { getAdminShortlists } = await import("@/lib/services/admin/shortlists");

const P = "ZZTEST-SL-";
const MAID_A = `${P}A`; // ACTIVE + AVAILABLE
const MAID_B = `${P}B`; // INACTIVE — shortlist row must still show for staff
const EMAILS = {
  admin: "zztest-sl-admin@example.test",
  staff: "zztest-sl-staff@example.test",
  clientOne: "zztest-sl-client1@example.test",
  clientTwo: "zztest-sl-client2@example.test",
};

const ids: Record<string, string> = {};
const maidIds: Record<string, string> = {};
const as = (id: string) => mockAuth.mockResolvedValue({ user: { id }, sessionVersion: 0 });

async function removeFixtures() {
  await prisma.maidProfile.deleteMany({ where: { profileCode: { startsWith: P } } }); // cascades shortlists
  // The two clients have a username but no email, so match on both.
  await prisma.user.deleteMany({ where: { OR: [{ email: { in: Object.values(EMAILS) } }, { username: { startsWith: "zztestsl" } }] } });
}

beforeAll(async () => {
  await removeFixtures(); // clear leftovers from any aborted earlier run
  const soon = new Date(Date.now() + 60 * 60 * 1000);
  const mk = async (key: string, data: Parameters<typeof prisma.user.create>[0]["data"]) => {
    ids[key] = (await prisma.user.create({ data })).id;
  };
  await mk("admin", { fullName: "[Fictional] SL Admin", email: EMAILS.admin, role: "ADMIN", status: "ACTIVE" });
  await mk("staff", { fullName: "[Fictional] SL Staff", email: EMAILS.staff, role: "STAFF", status: "ACTIVE" });
  await mk("clientOne", { fullName: "[Fictional] SL Client One", username: "zztestslone", role: "EMPLOYER", status: "ACTIVE", accessExpiresAt: soon });
  await mk("clientTwo", { fullName: "[Fictional] SL Client Two", username: "zztestsltwo", role: "EMPLOYER", status: "ACTIVE", accessExpiresAt: soon });

  for (const [code, profileStatus] of [[MAID_A, "ACTIVE"], [MAID_B, "INACTIVE"]] as const) {
    maidIds[code] = (
      await prisma.maidProfile.create({
        data: { profileCode: code, name: `[Fictional] ${code}`, nationality: "Indonesian", profileStatus, availabilityStatus: "AVAILABLE" },
      })
    ).id;
  }

  await prisma.shortlist.createMany({
    data: [
      { employerId: ids.clientOne, maidId: maidIds[MAID_A] },
      { employerId: ids.clientOne, maidId: maidIds[MAID_B] },
      { employerId: ids.clientTwo, maidId: maidIds[MAID_A] },
    ],
  });
});

afterAll(async () => {
  await removeFixtures();
  await prisma.$disconnect();
});

describe("admin shortlists", () => {
  it("admin sees who shortlisted which helper, including a helper who is no longer active", async () => {
    as(ids.admin);
    const result = await getAdminShortlists({ search: P, page: 1 });
    expect(result.totalCount).toBe(3);
    expect(result.clientCount).toBe(2);

    const one = result.items.filter((i) => i.clientId === ids.clientOne);
    expect(one.map((i) => i.profileCode).sort()).toEqual([MAID_A, MAID_B]);
    const retired = one.find((i) => i.profileCode === MAID_B)!;
    expect(retired.profileStatus).toBe("INACTIVE"); // not hidden from staff
    expect(retired.clientName).toBe("[Fictional] SL Client One");
    expect(retired.clientUsername).toBe("zztestslone");
    expect(retired.maidId).toBe(maidIds[MAID_B]);
  });

  it("staff can see it too", async () => {
    as(ids.staff);
    const result = await getAdminShortlists({ search: P, page: 1 });
    expect(result.totalCount).toBe(3);
  });

  it("searches by client username and by helper code", async () => {
    as(ids.admin);
    const byClient = await getAdminShortlists({ search: "zztestsltwo", page: 1 });
    expect(byClient.items.map((i) => i.profileCode)).toEqual([MAID_A]);
    const byMaid = await getAdminShortlists({ search: MAID_B, page: 1 });
    expect(byMaid.items.map((i) => i.clientId)).toEqual([ids.clientOne]);
  });

  it("an employer cannot use it", async () => {
    as(ids.clientOne);
    await expect(getAdminShortlists({ page: 1 })).rejects.toThrow();
  });

  it("nobody logged in cannot use it", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(getAdminShortlists({ page: 1 })).rejects.toThrow();
  });
});
