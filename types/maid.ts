/**
 * Temporary frontend types for the employer dashboard.
 *
 * These describe the shape of data the UI currently expects. They are
 * NOT database models yet — once PostgreSQL + Prisma are introduced
 * (Phase 1), Prisma will generate the real persisted types and these
 * will either be replaced by them or narrowed into view-model types
 * derived from them. Kept intentionally simple for now.
 */

export type AvailabilityStatus = "available" | "deployed" | "reserved";

export interface MaidSkill {
  id: string;
  name: string; // e.g. "Childcare", "Elderly care", "Cooking"
}

export interface EmploymentHistoryEntry {
  id: string;
  employerDescription: string; // anonymised summary, not a live employer link
  roleSummary: string;
  startDate: string; // ISO date
  endDate?: string; // ISO date, absent if this is still ongoing
}

export interface MaidProfile {
  id: string;
  candidateCode: string; // e.g. "SGM-0000"
  name: string;
  nationality: string;
  age: number;
  yearsExperience: number;
  availabilityStatus: AvailabilityStatus;
  skills: MaidSkill[];
  employmentHistory: EmploymentHistoryEntry[];
  photoUrl?: string; // absent for every current record — see mock-maids.ts
}
