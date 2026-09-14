/**
 * ============================================================
 * DEVELOPMENT / PLACEHOLDER DATA — NOT REAL MAID BIODATA
 * ============================================================
 *
 * This file exists only so the dashboard listing has something to
 * render during Phase 0. Every value below is a bracketed placeholder,
 * matching exactly what the original static dashboard.html displayed —
 * no real candidate names, ages, nationalities or photos have been
 * entered anywhere in this project.
 *
 * Phase 1 (PostgreSQL + Prisma database foundation) has landed, but this
 * file is deliberately left in place — the dashboard pages below still
 * import from it. It will be deleted in the later "frontend database
 * integration" phase, once the dashboard is switched over to read from the
 * real MaidProfile table (see prisma/schema.prisma) via server-side
 * queries instead.
 *
 * Do not add real maid biodata to this file or to /public.
 */

import type { MaidProfile } from "@/types/maid";

export const MOCK_MAIDS: MaidProfile[] = Array.from({ length: 6 }).map((_, i) => ({
  id: String(i + 1),
  candidateCode: "SGM-0000",
  name: "[Helper Name]",
  nationality: "[Nationality]",
  age: 0,
  yearsExperience: 0,
  availabilityStatus: "available",
  skills: [{ id: "placeholder", name: "[Key skills]" }],
  employmentHistory: [],
}));
