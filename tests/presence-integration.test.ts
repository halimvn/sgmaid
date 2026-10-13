import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";

/**
 * "Employers viewing biodata right now" — live presence. Runs against the REAL development
 * database; only `@/auth` is mocked (to switch between fictional users). Real employers may be
 * online while this runs, so every assertion is a DIFFERENCE from a baseline count, never an
 * absolute number. Everything created is fictional (ZZTEST-PR- prefix) and removed in afterAll.
 */

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const { recordProfileView, clearProfileView, recordBiodataOpened, getLiveBiodataViewerCount, LIVE_WINDOW_SECONDS, BIODATA_OPEN_WINDOW_SECONDS } =
  await import("@/lib/services/presence");

const P = "ZZTEST-PR-";
const VISIBLE = `${P}VISIBLE`;
const HIDDEN = `${P}DRAFT`;
const EMAILS = { admin: "zztest-pr-admin@example.test" };

const ids: Record<string, string> = {};
const maidIds: Record<string, string> = {};
const as = (id: string) => mockAuth.mockResolvedValue({ user: { id }, sessionVersion: 0 });
const count = async () => (await getLiveBiodataViewerCount())!;

beforeAll(async () => {
  const soon = new Date(Date.now() + 60 * 60 * 1000);
  ids.admin = (await prisma.user.create({ data: { fullName: "[Fictional] PR Admin", email: EMAILS.admin, role: "ADMIN", status: "ACTIVE" } })).id;
  for (const key of ["one", "two"]) {
    ids[key] = (
      await prisma.user.create({
        data: { fullName: `[Fictional] PR Client ${key}`, username: `zztestpr${key}`, role: "EMPLOYER", status: "ACTIVE", accessExpiresAt: soon },
      })
    ).id;
  }
  for (const [code, profileStatus] of [[VISIBLE, "ACTIVE"], [HIDDEN, "DRAFT"]] as const) {
    maidIds[code] = (
      await prisma.maidProfile.create({
        data: { profileCode: code, name: `[Fictional] ${code}`, nationality: "Indonesian", profileStatus, availabilityStatus: "AVAILABLE" },
      })
    ).id;
  }
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { OR: [{ email: EMAILS.admin }, { username: { startsWith: "zztestpr" } }] } }); // cascades presence rows
  await prisma.maidProfile.deleteMany({ where: { profileCode: { startsWith: P } } });
  await prisma.$disconnect();
});

describe("live biodata viewers", () => {
  it("an employer viewing a helper's profile is counted, once, however often they ping", async () => {
    as(ids.one);
    const before = await count();
    expect(await recordProfileView(maidIds[VISIBLE])).toBe(true);
    expect(await count()).toBe(before + 1);
    expect(await recordProfileView(maidIds[VISIBLE])).toBe(true); // heartbeat
    expect(await count()).toBe(before + 1);
  });

  it("a second employer adds one more; the admin can read the number", async () => {
    as(ids.two);
    const before = await count();
    expect(await recordProfileView(maidIds[VISIBLE])).toBe(true);
    as(ids.admin);
    expect(await count()).toBe(before + 1);
  });

  it("leaving the page stops counting it", async () => {
    as(ids.two);
    const before = await count();
    await clearProfileView();
    expect(await count()).toBe(before - 1);
  });

  it("a stale heartbeat no longer counts", async () => {
    as(ids.one);
    await prisma.biodataPresence.update({ where: { employerId: ids.one }, data: { lastSeenAt: new Date(Date.now() - (LIVE_WINDOW_SECONDS + 5) * 1000) } });
    as(ids.admin);
    const before = await count();
    await prisma.biodataPresence.update({ where: { employerId: ids.one }, data: { lastSeenAt: new Date() } });
    expect(await count()).toBe(before + 1);
  });

  it("opening the biodata PDF counts as reading for a few minutes, then stops", async () => {
    as(ids.admin);
    await prisma.biodataPresence.update({ where: { employerId: ids.one }, data: { lastSeenAt: new Date(0), biodataOpenedAt: null } });
    const base = await count();

    await recordBiodataOpened(maidIds[VISIBLE], ids.one);
    expect(await count()).toBe(base + 1);

    // The profile tab is hidden while the PDF is open (no heartbeats), but the open itself still counts…
    await prisma.biodataPresence.update({ where: { employerId: ids.one }, data: { lastSeenAt: new Date(0) } });
    expect(await count()).toBe(base + 1);

    // …until the reading window has passed.
    await prisma.biodataPresence.update({
      where: { employerId: ids.one },
      data: { biodataOpenedAt: new Date(Date.now() - (BIODATA_OPEN_WINDOW_SECONDS + 5) * 1000) },
    });
    expect(await count()).toBe(base);
  });

  it("records nothing for a profile the employer is not allowed to see, or a malformed id", async () => {
    as(ids.two);
    await clearProfileView();
    const before = await count();
    expect(await recordProfileView(maidIds[HIDDEN])).toBe(false); // DRAFT: invisible to employers
    expect(await recordProfileView("../etc/passwd")).toBe(false);
    expect(await recordProfileView(undefined)).toBe(false);
    expect(await count()).toBe(before);
  });

  it("an admin viewing cannot register as an employer viewer", async () => {
    as(ids.admin);
    const before = await count();
    expect(await recordProfileView(maidIds[VISIBLE])).toBe(false);
    expect(await count()).toBe(before);
  });

  it("someone logged out gets no count and cannot record a view", async () => {
    mockAuth.mockResolvedValue(null);
    expect(await getLiveBiodataViewerCount()).toBeNull();
    expect(await recordProfileView(maidIds[VISIBLE])).toBe(false);
  });
});
