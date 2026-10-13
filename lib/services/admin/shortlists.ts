import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/authorize";

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
