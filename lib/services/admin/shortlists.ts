import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/authorize";
import { EXPERTISE_CATEGORIES } from "@/lib/validation/maid-filters";

/**
 * Admin view of which helpers each client (employer) has shortlisted.
 *
 * Read-only. Every exported function calls requireAdmin() itself, first — same defense-in-depth
 * as lib/services/admin/clients.ts and maids.ts; the /admin layout guard is not the only check.
 * This is the staff-side counterpart of the employer's own shortlist
 * (lib/services/shortlist.ts), which is scoped to the logged-in employer and is untouched.
 *
 * Unlike the employer view, staff see every shortlisted profile whatever its status — a
 * shortlist row is deliberately kept when a helper is later placed or retired (that is
 * useful for follow-up), so the helper's current status is returned alongside it.
 */

export const SHORTLIST_PAGE_SIZE = 20;

export type AdminShortlistItem = {
  shortlistId: string;
  shortlistedAt: string;
  clientId: string;
  clientName: string;
  clientUsername: string | null;
  maidId: string;
  maidName: string;
  profileCode: string;
  profileStatus: string;
  availabilityStatus: string;
};

export type AdminShortlistResult = {
  items: AdminShortlistItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  /** Distinct clients with at least one shortlisted helper, across the whole (filtered) result. */
  clientCount: number;
};

export type AdminShortlistFilters = { search?: string; page: number };

export const SHARED_PAGE_SIZE = 10;

export type SharedHelperClient = {
  clientId: string;
  clientName: string;
  clientUsername: string | null;
  shortlistedAt: string;
};

export type SharedHelper = {
  maidId: string;
  name: string;
  profileCode: string;
  profileStatus: string;
  availabilityStatus: string;
  nationality: string;
  age: number | null;
  yearsExperience: number;
  heightCm: number | null;
  weightKg: number | null;
  maritalStatus: string | null;
  maidType: string | null;
  languages: string[];
  expertise: string[];
  hasPhoto: boolean;
  /** Every client who shortlisted her (always two or more), most recent first. */
  clients: SharedHelperClient[];
};

export type SharedHelpersResult = {
  items: SharedHelper[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

const EXPERTISE_LABEL_BY_PRISMA_CATEGORY: Record<string, string> = Object.fromEntries(
  Object.values(EXPERTISE_CATEGORIES).map((c) => [c.prismaCategory, c.label])
);

function ageFrom(dateOfBirth: Date | null): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) age--;
  return age;
}

/**
 * Helpers that MORE THAN ONE client has shortlisted, each with the clients who did — the
 * "Shared Helpers" tab. These are the ones likely to be in demand, so staff can follow up before
 * two clients both set their heart on the same person. Most-shortlisted first.
 *
 * `search` narrows to helpers matching by name/profile code, or shortlisted by a client matching
 * by name/username; a matching helper still lists ALL her clients, not only the matching one.
 */
export async function getSharedHelpers(filters: AdminShortlistFilters): Promise<SharedHelpersResult> {
  await requireAdmin();

  const clientScope: Prisma.ShortlistWhereInput = { employer: { role: "EMPLOYER" } };

  const groups = await prisma.shortlist.groupBy({
    by: ["maidId"],
    where: clientScope,
    having: { maidId: { _count: { gt: 1 } } },
    _count: { maidId: true },
  });
  const sharedIds = groups.map((g) => g.maidId);

  const search = filters.search;
  const contains = search ? { contains: search, mode: "insensitive" as const } : undefined;
  const where: Prisma.MaidProfileWhereInput = { id: { in: sharedIds } };
  if (contains) {
    where.OR = [
      { name: contains },
      { profileCode: contains },
      { shortlistedBy: { some: { employer: { OR: [{ fullName: contains }, { username: contains }] } } } },
    ];
  }

  const rows = await prisma.maidProfile.findMany({
    where,
    select: {
      id: true,
      name: true,
      profileCode: true,
      profileStatus: true,
      availabilityStatus: true,
      nationality: true,
      dateOfBirth: true,
      yearsExperience: true,
      heightCm: true,
      weightKg: true,
      maritalStatus: true,
      maidType: true,
      languages: true,
      skills: { select: { skill: { select: { category: true } } } },
      documents: { where: { type: "PROFILE_PHOTO" }, select: { id: true } },
      shortlistedBy: {
        where: clientScope,
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, employer: { select: { id: true, fullName: true, username: true } } },
      },
    },
  });

  const all: SharedHelper[] = rows.map((r) => ({
    maidId: r.id,
    name: r.name,
    profileCode: r.profileCode,
    profileStatus: r.profileStatus,
    availabilityStatus: r.availabilityStatus,
    nationality: r.nationality,
    age: ageFrom(r.dateOfBirth),
    yearsExperience: r.yearsExperience,
    heightCm: r.heightCm,
    weightKg: r.weightKg,
    maritalStatus: r.maritalStatus,
    maidType: r.maidType,
    languages: r.languages,
    expertise: Array.from(
      new Set(r.skills.map((s) => EXPERTISE_LABEL_BY_PRISMA_CATEGORY[s.skill.category]).filter((l): l is string => Boolean(l)))
    ),
    hasPhoto: r.documents.length > 0,
    clients: r.shortlistedBy.map((s) => ({
      clientId: s.employer.id,
      clientName: s.employer.fullName,
      clientUsername: s.employer.username,
      shortlistedAt: s.createdAt.toISOString(),
    })),
  }));

  // Most clients first; ties broken by whoever shortlisted her most recently, then by code for a stable order.
  all.sort(
    (a, b) =>
      b.clients.length - a.clients.length ||
      b.clients[0].shortlistedAt.localeCompare(a.clients[0].shortlistedAt) ||
      a.profileCode.localeCompare(b.profileCode)
  );

  const totalCount = all.length;
  const start = (filters.page - 1) * SHARED_PAGE_SIZE;
  return {
    items: all.slice(start, start + SHARED_PAGE_SIZE),
    page: filters.page,
    pageSize: SHARED_PAGE_SIZE,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / SHARED_PAGE_SIZE)),
  };
}

export type ShortlistEvent = {
  id: string;
  at: string;
  clientName: string;
  maidName: string;
  profileCode: string;
};

/** Longest look-back for notifications: a tab left asleep for hours must not replay a backlog. */
const EVENT_LOOKBACK_MS = 10 * 60 * 1000;
const EVENT_LIMIT = 10;

/**
 * Helpers shortlisted after `since`, oldest first, for the admin dashboard's pop-up
 * notifications. `cursor` is what to pass as `since` next time: the server clock (so browser
 * clock drift never matters), or — when more than EVENT_LIMIT arrived at once — the last event
 * returned, so the rest follow on the next poll instead of being skipped. Without `since` (the
 * first call after a page loads) it returns no events: a notification is only for something
 * that happens while an admin is on the dashboard.
 */
export async function getShortlistEventsSince(since: Date | null): Promise<{ cursor: string; events: ShortlistEvent[] }> {
  await requireAdmin();

  const now = new Date();
  if (!since) return { cursor: now.toISOString(), events: [] };

  const floor = new Date(now.getTime() - EVENT_LOOKBACK_MS);
  const rows = await prisma.shortlist.findMany({
    where: { createdAt: { gt: since > floor ? since : floor, lte: now }, employer: { role: "EMPLOYER" } },
    orderBy: { createdAt: "asc" },
    take: EVENT_LIMIT,
    select: {
      id: true,
      createdAt: true,
      employer: { select: { fullName: true } },
      maid: { select: { name: true, profileCode: true } },
    },
  });

  const events = rows.map((r) => ({
    id: r.id,
    at: r.createdAt.toISOString(),
    clientName: r.employer.fullName,
    maidName: r.maid.name,
    profileCode: r.maid.profileCode,
  }));

  const more = events.length === EVENT_LIMIT;
  return { cursor: more ? events[events.length - 1].at : now.toISOString(), events };
}

/** Newest shortlists first, optionally narrowed by client name/username or helper name/profile code. */
export async function getAdminShortlists(filters: AdminShortlistFilters): Promise<AdminShortlistResult> {
  await requireAdmin();

  const where: Prisma.ShortlistWhereInput = { employer: { role: "EMPLOYER" } };
  if (filters.search) {
    const contains = { contains: filters.search, mode: "insensitive" as const };
    where.OR = [
      { employer: { fullName: contains } },
      { employer: { username: contains } },
      { maid: { name: contains } },
      { maid: { profileCode: contains } },
    ];
  }

  const skip = (filters.page - 1) * SHORTLIST_PAGE_SIZE;

  const [rows, totalCount, clients] = await Promise.all([
    prisma.shortlist.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: SHORTLIST_PAGE_SIZE,
      select: {
        id: true,
        createdAt: true,
        employer: { select: { id: true, fullName: true, username: true } },
        maid: { select: { id: true, name: true, profileCode: true, profileStatus: true, availabilityStatus: true } },
      },
    }),
    prisma.shortlist.count({ where }),
    prisma.shortlist.groupBy({ by: ["employerId"], where }),
  ]);

  return {
    items: rows.map((r) => ({
      shortlistId: r.id,
      shortlistedAt: r.createdAt.toISOString(),
      clientId: r.employer.id,
      clientName: r.employer.fullName,
      clientUsername: r.employer.username,
      maidId: r.maid.id,
      maidName: r.maid.name,
      profileCode: r.maid.profileCode,
      profileStatus: r.maid.profileStatus,
      availabilityStatus: r.maid.availabilityStatus,
    })),
    page: filters.page,
    pageSize: SHORTLIST_PAGE_SIZE,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / SHORTLIST_PAGE_SIZE)),
    clientCount: clients.length,
  };
}
