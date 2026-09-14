import "server-only";
import type { Prisma } from "@prisma/client";

/**
 * Central employer-visibility policy for maid profiles — Phase 3.
 *
 * A single source of truth so this rule is never duplicated (and never
 * drifts) across the listing service, the detail service, or any future
 * caller. Every employer-facing maid query MUST go through
 * employerVisibleMaidWhere() rather than hand-rolling its own filter.
 *
 * Profile status: only ACTIVE profiles are ever employer-visible.
 * DRAFT (still being entered by staff) and INACTIVE (withdrawn/retired)
 * must behave as if they don't exist to an employer — including via a
 * manually guessed URL, not just in the listing grid.
 *
 * Availability status: AVAILABLE and RESERVED are shown in normal
 * employer browsing. PLACED (already deployed with another employer) and
 * UNAVAILABLE are hidden from normal browse — there is currently no
 * legitimate reason for an employer to see or filter for a candidate who
 * isn't placeable. A user-selected availability filter can only narrow
 * *within* this set, never widen past it (see lib/validation/maid-filters.ts).
 */
export const EMPLOYER_VISIBLE_AVAILABILITY_STATUSES = ["AVAILABLE", "RESERVED"] as const;

export type EmployerVisibleAvailabilityStatus = (typeof EMPLOYER_VISIBLE_AVAILABILITY_STATUSES)[number];

export function isEmployerVisibleAvailability(value: string): value is EmployerVisibleAvailabilityStatus {
  return (EMPLOYER_VISIBLE_AVAILABILITY_STATUSES as readonly string[]).includes(value);
}

/**
 * The base `where` clause every employer-facing maid query must include.
 * Additional filters (nationality, skill, etc.) are combined with this
 * via AND — they narrow the result set, they can never widen it past
 * this policy.
 */
export function employerVisibleMaidWhere(): Prisma.MaidProfileWhereInput {
  return {
    profileStatus: "ACTIVE",
    availabilityStatus: { in: [...EMPLOYER_VISIBLE_AVAILABILITY_STATUSES] },
  };
}
