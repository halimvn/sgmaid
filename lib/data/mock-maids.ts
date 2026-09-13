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
 * This will be deleted once Phase 1 (PostgreSQL + Prisma) lands and
 * the dashboard reads from the real MaidProfile table instead.
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
