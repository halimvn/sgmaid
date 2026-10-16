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

const { getAdminShortlists, getShortlistEventsSince, getSharedHelpers } = await import("@/lib/services/admin/shortlists");

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

  it("Shared Helpers: only helpers shortlisted by more than one client, each with all of her clients", async () => {
    as(ids.admin);
    const result = await getSharedHelpers({ search: P, page: 1 });
    const codes = result.items.map((h) => h.profileCode);
    expect(codes).toContain(MAID_A); // clientOne + clientTwo
    expect(codes).not.toContain(MAID_B); // clientOne only — not shared

    const a = result.items.find((h) => h.profileCode === MAID_A)!;
    expect(a.clients.map((c) => c.clientId).sort()).toEqual([ids.clientOne, ids.clientTwo].sort());
    expect(a.clients[0]).toMatchObject({ clientName: expect.stringContaining("SL Client"), clientUsername: expect.stringMatching(/^zztestsl/) });
    expect(a).toMatchObject({ nationality: "Indonesian", yearsExperience: 0, hasPhoto: false, languages: [], expertise: [] });
  });

  it("Shared Helpers: a search by a client still lists ALL of that helper's clients", async () => {
    as(ids.admin);
    const result = await getSharedHelpers({ search: "zztestsltwo", page: 1 });
    const a = result.items.find((h) => h.profileCode === MAID_A)!;
    expect(a.clients).toHaveLength(2);
    const none = await getSharedHelpers({ search: "no-such-client-or-helper-zzz", page: 1 });
    expect(none.items).toEqual([]);
  });

  it("searches by client username and by helper code", async () => {
    as(ids.admin);
    const byClient = await getAdminShortlists({ search: "zztestsltwo", page: 1 });
    expect(byClient.items.map((i) => i.profileCode)).toEqual([MAID_A]);
    const byMaid = await getAdminShortlists({ search: MAID_B, page: 1 });
    expect(byMaid.items.map((i) => i.clientId)).toEqual([ids.clientOne]);
  });

  it("notifications: only shortlists made after the cursor come back, oldest first, with the cursor advancing", async () => {
    as(ids.admin);
    // First call after a page loads: no events, just a starting cursor.
    const start = await getShortlistEventsSince(null);
    expect(start.events).toEqual([]);

    // Something happens while the admin is on the dashboard…
    const created = await prisma.shortlist.create({ data: { employerId: ids.clientTwo, maidId: maidIds[MAID_B] } });
    const next = await getShortlistEventsSince(new Date(start.cursor));
    const mine = next.events.filter((e) => e.profileCode.startsWith(P));
    expect(mine.map((e) => e.id)).toEqual([created.id]);
    expect(mine[0]).toMatchObject({ clientName: "[Fictional] SL Client Two", maidName: `[Fictional] ${MAID_B}`, profileCode: MAID_B });

    // …and is not reported again on the following poll.
    const again = await getShortlistEventsSince(new Date(next.cursor));
    expect(again.events.filter((e) => e.profileCode.startsWith(P))).toEqual([]);
  });

  it("notifications: an old cursor does not replay a backlog (look-back is capped)", async () => {
    as(ids.admin);
    await prisma.shortlist.updateMany({ where: { employerId: ids.clientOne }, data: { createdAt: new Date(Date.now() - 60 * 60 * 1000) } });
    const result = await getShortlistEventsSince(new Date(Date.now() - 24 * 60 * 60 * 1000));
    expect(result.events.filter((e) => e.profileCode.startsWith(P) && e.clientName.endsWith("One"))).toEqual([]);
  });

  it("an employer cannot use it", async () => {
    as(ids.clientOne);
    await expect(getAdminShortlists({ page: 1 })).rejects.toThrow();
    await expect(getShortlistEventsSince(null)).rejects.toThrow();
    await expect(getSharedHelpers({ page: 1 })).rejects.toThrow();
  });

  it("nobody logged in cannot use it", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(getAdminShortlists({ page: 1 })).rejects.toThrow();
  });
});
