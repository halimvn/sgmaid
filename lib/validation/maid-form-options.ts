/**
 * Option lists for the admin Add/Edit Maid form. Kept free of server-only imports so the
 * (client) form component and the server-side validator share one definition.
 */

export const MAID_TYPE_OPTIONS = [
  { value: "NEW", label: "New Maid" },
  { value: "TRANSFER", label: "Transfer Maid" },
  { value: "EX_SINGAPORE", label: "Ex-Singapore Maid" },
  { value: "EX_OTHERS", label: "Ex-Others Maid" },
] as const;

export const MARITAL_STATUS_OPTIONS = [
  { value: "SINGLE", label: "Single" },
  { value: "MARRIED", label: "Married" },
  { value: "DIVORCED", label: "Divorced" },
  { value: "WIDOWED", label: "Widowed" },
] as const;

// The approved employer-facing Expertise categories — same set as
// lib/validation/maid-filters.ts EXPERTISE_CATEGORIES, and each maps to
// exactly one "generic" Skill row (see
// lib/services/admin/maids.ts ensureExpertiseSkills()) rather than any
// of the fine-grained, cuisine/age-specific skills real biodata imports
// use — an admin-entered profile only ever needs the category.
export const EXPERTISE_OPTIONS = [
  { value: "cooking", label: "Cooking" },
  { value: "eldercare", label: "Eldercare" },
  { value: "childcare", label: "Childcare" },
  { value: "infantcare", label: "Infantcare" },
  { value: "general-housekeeping", label: "General Housekeeping" },
  { value: "care-of-disabled", label: "Care of Disabled" },
] as const;
export type ExpertiseOptionValue = (typeof EXPERTISE_OPTIONS)[number]["value"];

export const PROFILE_STATUS_OPTIONS = ["DRAFT", "ACTIVE", "INACTIVE"] as const;
export const AVAILABILITY_STATUS_OPTIONS = ["AVAILABLE", "RESERVED", "PLACED", "UNAVAILABLE"] as const;

// Number of Employment History row slots rendered on the form. Fixed
// rather than dynamically add-able — an empty row (no country) is simply not saved.
export const EMPLOYMENT_HISTORY_ROW_COUNT = 4;
