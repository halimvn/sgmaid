/**
 * ============================================================
 * DEVELOPMENT SEED DATA — FICTIONAL, NOT REAL MAID BIODATA
 * ============================================================
 * Every name, nationality, date, and history entry below is invented for
 * local development and filter/UI testing only. None of it corresponds to
 * a real candidate. Do NOT put real passport numbers, FIN numbers,
 * addresses, or biodata into this file or into any seed data.
 *
 * This script does NOT create any login-capable accounts — no employer
 * User rows are seeded with a usable password. Authentication and
 * account creation are Phase 2 concerns.
 *
 * Run with:
 *   npx prisma db seed
 * (requires a working DATABASE_URL — see README.md)
 */

import "dotenv/config";
import { PrismaClient, SkillCategory, SkillLevel, MaidType, MaritalStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set — cannot seed. See .env.example.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ------------------------------------------------------------
// Reference data: Skills
// ------------------------------------------------------------
// Categories mirror the SkillCategory enum, which in turn mirrors the
// household needs already named in the site copy (services page: "your
// specific requirements for childcare, elderly care, or housekeeping").

const SKILLS: { name: string; slug: string; category: SkillCategory }[] = [
  // Phase 4.6.3: infant care is its own approved employer-facing
  // "Infantcare" expertise category, distinct from general/school-age
  // "Childcare" — see lib/validation/maid-filters.ts EXPERTISE_CATEGORIES.
  { name: "Infant Care", slug: "infant-care", category: SkillCategory.INFANT_CARE },
  { name: "School-Age Childcare", slug: "school-age-childcare", category: SkillCategory.CHILDCARE },
  { name: "Elderly Companionship", slug: "elderly-companionship", category: SkillCategory.ELDERLY_CARE },
  { name: "Mobility & Fall Assistance", slug: "mobility-fall-assistance", category: SkillCategory.ELDERLY_CARE },
  { name: "General Housekeeping", slug: "general-housekeeping", category: SkillCategory.HOUSEKEEPING },
  { name: "Laundry & Ironing", slug: "laundry-ironing", category: SkillCategory.HOUSEKEEPING },
  { name: "Indonesian Home Cooking", slug: "indonesian-home-cooking", category: SkillCategory.COOKING },
  { name: "Chinese Home Cooking", slug: "chinese-home-cooking", category: SkillCategory.COOKING },
  { name: "Pet Care (Dogs)", slug: "pet-care-dogs", category: SkillCategory.PET_CARE },
  { name: "Pet Care (Cats)", slug: "pet-care-cats", category: SkillCategory.PET_CARE },
];

// ------------------------------------------------------------
// Reference data: Training modules
// ------------------------------------------------------------
// The first two are named directly in the existing site copy
// (app/(site)/about/page.tsx, app/(site)/contact/page.tsx). The other two
// are plausible companion modules for a domestic-helper agency, added only
// so seed data can exercise "multiple modules per maid" and varied
// completion states — they are not claims about a real curriculum.

const TRAINING_MODULES: { title: string; description: string; category: string; displayOrder: number }[] = [
  {
    title: "One-Day Training Handbook",
    description: "Core orientation covering household routines, safety basics, and employer expectations.",
    category: "orientation",
    displayOrder: 1,
  },
  {
    title: "Settling-In Program (SIP)",
    description: "Structured check-ins during a candidate's first weeks with a new household.",
    category: "orientation",
    displayOrder: 2,
  },
  {
    title: "Household Safety & Hygiene",
    description: "Kitchen safety, cleaning-product handling, and basic first aid awareness.",
    category: "safety",
    displayOrder: 3,
  },
  {
    title: "Childcare & Elderly Care Refresher",
    description: "Refresher module on supervision practices for households with children or elderly members.",
    category: "care-skills",
    displayOrder: 4,
  },
];

// ------------------------------------------------------------
// Fictional maid profiles
// ------------------------------------------------------------
// Nationalities lean Indonesian (the agency's stated specialty — see
// app/(site)/about/page.tsx "Own Indonesian Training Centres" and
// app/(site)/services/page.tsx "recruiting skilled Indonesian domestic
// helpers"), with a couple of other nationalities included so the
// dashboard's Nationality filter has more than one value to test against.

type SeedMaid = {
  profileCode: string;
  name: string;
  nationality: string;
  dateOfBirth: Date;
  languages: string[];
  yearsExperience: number;
  profileStatus: "DRAFT" | "ACTIVE" | "INACTIVE";
  availabilityStatus: "AVAILABLE" | "RESERVED" | "PLACED" | "UNAVAILABLE";
  // Phase 4.6.3: added to a subset of employer-visible profiles only, so
  // the revised Maid Type/Marital filters have real combinations to
  // exercise (all four MaidType and MaritalStatus values are covered
  // across the profiles below, plus at least one left null on purpose —
  // see SG-00015 — to exercise "unknown marital status is never invented,
  // never matched by a specific filter" behaviour). Left undefined
  // (→ null) on every profile that predates Phase 4.6, unchanged.
  maidType?: MaidType;
  maritalStatus?: MaritalStatus;
  internalNotes?: string;
  skills: { slug: string; level: SkillLevel; years?: number }[];
  trainings: { title: string; completed: boolean; completedAt?: Date }[];
  employmentHistory: {
    country: string;
    startDate: Date;
    endDate?: Date;
    duties: string;
    householdDescription: string;
    reasonForLeaving?: string;
  }[];
};

const MAIDS: SeedMaid[] = [
  {
    profileCode: "SG-00001",
    name: "[Fictional] Siti Rahayu",
    nationality: "Indonesian",
    dateOfBirth: new Date("1992-03-14"),
    languages: ["Bahasa Indonesia", "English"],
    yearsExperience: 6,
    profileStatus: "ACTIVE",
    availabilityStatus: "AVAILABLE",
    maidType: MaidType.NEW,
    maritalStatus: MaritalStatus.SINGLE,
    skills: [
      { slug: "infant-care", level: SkillLevel.EXPERIENCED, years: 4 },
      { slug: "general-housekeeping", level: SkillLevel.EXPERT, years: 6 },
      { slug: "indonesian-home-cooking", level: SkillLevel.EXPERT, years: 6 },
    ],
    trainings: [
      { title: "One-Day Training Handbook", completed: true, completedAt: new Date("2019-02-01") },
      { title: "Settling-In Program (SIP)", completed: true, completedAt: new Date("2019-02-20") },
      { title: "Household Safety & Hygiene", completed: true, completedAt: new Date("2022-05-10") },
    ],
    employmentHistory: [
      {
        country: "Singapore",
        startDate: new Date("2019-03-01"),
        endDate: new Date("2021-06-30"),
        duties: "Infant care, general housekeeping",
        householdDescription: "Family of 4 with a newborn, condominium unit",
        reasonForLeaving: "Contract completed, employer relocated overseas",
      },
      {
        country: "Singapore",
        startDate: new Date("2021-09-01"),
        endDate: new Date("2024-08-31"),
        duties: "Full household management, cooking",
        householdDescription: "Family of 3, landed property",
        reasonForLeaving: "Contract completed",
      },
    ],
  },
  {
    profileCode: "SG-00002",
    name: "[Fictional] Nurul Hidayah",
    nationality: "Indonesian",
    dateOfBirth: new Date("1996-07-22"),
    languages: ["Bahasa Indonesia"],
    yearsExperience: 2,
    profileStatus: "ACTIVE",
    availabilityStatus: "AVAILABLE",
    // New Maid + Childcare + Married + Bahasa Indonesia — matches the
    // Phase 4.6.3 spec's own worked filter-combination example.
    maidType: MaidType.NEW,
    maritalStatus: MaritalStatus.MARRIED,
    skills: [
      { slug: "school-age-childcare", level: SkillLevel.INTERMEDIATE, years: 2 },
      { slug: "laundry-ironing", level: SkillLevel.EXPERIENCED, years: 2 },
    ],
    trainings: [
      { title: "One-Day Training Handbook", completed: true, completedAt: new Date("2023-01-15") },
      { title: "Settling-In Program (SIP)", completed: false },
    ],
    employmentHistory: [
      {
        country: "Singapore",
        startDate: new Date("2023-02-01"),
        duties: "School-age childcare, laundry",
        householdDescription: "Family of 4 with two school-going children, HDB flat",
      },
    ],
  },
  {
    profileCode: "SG-00003",
    name: "[Fictional] Maria Santos",
    nationality: "Filipino",
    dateOfBirth: new Date("1988-11-02"),
    languages: ["English", "Tagalog"],
    yearsExperience: 10,
    profileStatus: "ACTIVE",
    availabilityStatus: "RESERVED",
    // Ex-Singapore Maid + Eldercare + English — matches the Phase 4.6.3
    // spec's own second worked filter-combination example.
    maidType: MaidType.EX_SINGAPORE,
    maritalStatus: MaritalStatus.DIVORCED,
    internalNotes: "[Fictional] Currently in final interview stage with a shortlisting employer.",
    skills: [
      { slug: "elderly-companionship", level: SkillLevel.EXPERT, years: 8 },
      { slug: "mobility-fall-assistance", level: SkillLevel.EXPERT, years: 8 },
      { slug: "general-housekeeping", level: SkillLevel.EXPERIENCED, years: 10 },
    ],
    trainings: [
      { title: "One-Day Training Handbook", completed: true, completedAt: new Date("2015-04-01") },
      { title: "Settling-In Program (SIP)", completed: true, completedAt: new Date("2015-04-18") },
      { title: "Childcare & Elderly Care Refresher", completed: true, completedAt: new Date("2023-09-05") },
    ],
    employmentHistory: [
      {
        country: "Singapore",
        startDate: new Date("2015-05-01"),
        endDate: new Date("2023-12-31"),
        duties: "Elderly companionship and mobility support",
        householdDescription: "Elderly couple, condominium unit",
        reasonForLeaving: "Employer moved into assisted-living facility",
      },
    ],
  },
  {
    profileCode: "SG-00004",
    name: "[Fictional] Dewi Kusuma",
    nationality: "Indonesian",
    dateOfBirth: new Date("1994-01-30"),
    languages: ["Bahasa Indonesia", "English"],
    yearsExperience: 5,
    profileStatus: "ACTIVE",
    availabilityStatus: "PLACED",
    skills: [
      { slug: "general-housekeeping", level: SkillLevel.EXPERIENCED, years: 5 },
      { slug: "pet-care-dogs", level: SkillLevel.INTERMEDIATE, years: 3 },
      { slug: "chinese-home-cooking", level: SkillLevel.EXPERIENCED, years: 4 },
    ],
    trainings: [
      { title: "One-Day Training Handbook", completed: true, completedAt: new Date("2020-06-01") },
      { title: "Settling-In Program (SIP)", completed: true, completedAt: new Date("2020-06-15") },
    ],
    employmentHistory: [
      {
        country: "Singapore",
        startDate: new Date("2020-07-01"),
        duties: "Housekeeping, pet care, cooking",
        householdDescription: "Family of 3 with a dog, landed property",
      },
    ],
  },
  {
    profileCode: "SG-00005",
    name: "[Fictional] Aye Chan Mya",
    nationality: "Myanmarese",
    dateOfBirth: new Date("1999-09-09"),
    languages: ["Burmese", "English"],
    yearsExperience: 1,
    profileStatus: "ACTIVE",
    availabilityStatus: "AVAILABLE",
    maidType: MaidType.EX_OTHERS,
    maritalStatus: MaritalStatus.SINGLE,
    skills: [{ slug: "general-housekeeping", level: SkillLevel.BEGINNER, years: 1 }],
    trainings: [{ title: "One-Day Training Handbook", completed: true, completedAt: new Date("2024-03-01") }],
    employmentHistory: [],
  },
  {
    profileCode: "SG-00006",
    name: "[Fictional] Yuli Astuti",
    nationality: "Indonesian",
    dateOfBirth: new Date("1990-05-18"),
    languages: ["Bahasa Indonesia"],
    yearsExperience: 8,
    profileStatus: "ACTIVE",
    availabilityStatus: "UNAVAILABLE",
    internalNotes: "[Fictional] On approved home leave; expected back on the market next quarter.",
    skills: [
      { slug: "infant-care", level: SkillLevel.EXPERT, years: 8 },
      { slug: "school-age-childcare", level: SkillLevel.EXPERT, years: 6 },
      { slug: "indonesian-home-cooking", level: SkillLevel.EXPERIENCED, years: 8 },
    ],
    trainings: [
      { title: "One-Day Training Handbook", completed: true, completedAt: new Date("2016-08-01") },
      { title: "Settling-In Program (SIP)", completed: true, completedAt: new Date("2016-08-20") },
      { title: "Childcare & Elderly Care Refresher", completed: true, completedAt: new Date("2021-11-01") },
    ],
    employmentHistory: [
      {
        country: "Singapore",
        startDate: new Date("2016-09-01"),
        endDate: new Date("2024-05-31"),
        duties: "Infant and school-age childcare, cooking",
        householdDescription: "Family of 5, landed property",
        reasonForLeaving: "Contract completed",
      },
    ],
  },
  {
    profileCode: "SG-00007",
    name: "[Fictional] Ratna Wulandari",
    nationality: "Indonesian",
    dateOfBirth: new Date("2001-02-11"),
    languages: ["Bahasa Indonesia"],
    yearsExperience: 0,
    profileStatus: "DRAFT",
    availabilityStatus: "UNAVAILABLE",
    internalNotes: "[Fictional] Profile still being entered by staff; not yet ready for employer visibility.",
    skills: [],
    trainings: [{ title: "One-Day Training Handbook", completed: false }],
    employmentHistory: [],
  },
  {
    profileCode: "SG-00008",
    name: "[Fictional] Josephine Cruz",
    nationality: "Filipino",
    dateOfBirth: new Date("1985-12-05"),
    languages: ["English", "Tagalog"],
    yearsExperience: 12,
    profileStatus: "INACTIVE",
    availabilityStatus: "UNAVAILABLE",
    internalNotes: "[Fictional] Withdrew from the market; kept for historical records only.",
    skills: [
      { slug: "elderly-companionship", level: SkillLevel.EXPERT, years: 12 },
      { slug: "general-housekeeping", level: SkillLevel.EXPERT, years: 12 },
    ],
    trainings: [
      { title: "One-Day Training Handbook", completed: true, completedAt: new Date("2012-01-10") },
      { title: "Settling-In Program (SIP)", completed: true, completedAt: new Date("2012-01-25") },
    ],
    employmentHistory: [
      {
        country: "Singapore",
        startDate: new Date("2012-02-01"),
        endDate: new Date("2023-10-31"),
        duties: "Elderly care, full household management",
        householdDescription: "Elderly individual living alone, condominium unit",
        reasonForLeaving: "Candidate returned home permanently",
      },
    ],
  },

  // ------------------------------------------------------------
  // Phase 3 addition: 10 more fictional, employer-visible profiles
  // (ACTIVE + AVAILABLE/RESERVED) purely so the dashboard's pagination
  // (12/page) and filter combinations have enough real rows to exercise
  // a genuine second page and every skill category / several
  // nationalities. Same fictional-data rules as above — no real people.
  // ------------------------------------------------------------
  {
    profileCode: "SG-00009",
    name: "[Fictional] Putri Lestari",
    nationality: "Indonesian",
    dateOfBirth: new Date("1998-04-12"),
    languages: ["Bahasa Indonesia"],
    yearsExperience: 3,
    profileStatus: "ACTIVE",
    availabilityStatus: "AVAILABLE",
    maidType: MaidType.TRANSFER,
    maritalStatus: MaritalStatus.SINGLE,
    skills: [
      { slug: "pet-care-dogs", level: SkillLevel.INTERMEDIATE, years: 2 },
      { slug: "general-housekeeping", level: SkillLevel.EXPERIENCED, years: 3 },
    ],
    trainings: [{ title: "One-Day Training Handbook", completed: true, completedAt: new Date("2023-05-01") }],
    employmentHistory: [
      {
        country: "Singapore",
        startDate: new Date("2023-06-01"),
        duties: "Housekeeping, dog care",
        householdDescription: "Couple with one dog, condominium unit",
      },
    ],
  },
  {
    profileCode: "SG-00010",
    name: "[Fictional] Carmela Reyes",
    nationality: "Filipino",
    dateOfBirth: new Date("1993-08-19"),
    languages: ["English", "Tagalog"],
    yearsExperience: 6,
    profileStatus: "ACTIVE",
    availabilityStatus: "AVAILABLE",
    maidType: MaidType.EX_SINGAPORE,
    maritalStatus: MaritalStatus.WIDOWED,
    skills: [
      { slug: "elderly-companionship", level: SkillLevel.EXPERIENCED, years: 6 },
      { slug: "mobility-fall-assistance", level: SkillLevel.INTERMEDIATE, years: 4 },
    ],
    trainings: [
      { title: "One-Day Training Handbook", completed: true, completedAt: new Date("2018-03-01") },
      { title: "Childcare & Elderly Care Refresher", completed: true, completedAt: new Date("2022-07-15") },
    ],
    employmentHistory: [
      {
        country: "Singapore",
        startDate: new Date("2018-04-01"),
        endDate: new Date("2024-02-28"),
        duties: "Elderly companionship",
        householdDescription: "Elderly couple, HDB flat",
        reasonForLeaving: "Contract completed",
      },
    ],
  },
  {
    profileCode: "SG-00011",
    name: "[Fictional] Thida Win",
    nationality: "Myanmarese",
    dateOfBirth: new Date("2002-01-25"),
    languages: ["Burmese"],
    yearsExperience: 1,
    profileStatus: "ACTIVE",
    availabilityStatus: "RESERVED",
    maidType: MaidType.NEW,
    maritalStatus: MaritalStatus.SINGLE,
    internalNotes: "[Fictional] In discussion with a shortlisting employer.",
    skills: [{ slug: "infant-care", level: SkillLevel.BEGINNER, years: 1 }],
    trainings: [{ title: "One-Day Training Handbook", completed: true, completedAt: new Date("2024-06-01") }],
    employmentHistory: [],
  },
  {
    profileCode: "SG-00012",
    name: "[Fictional] Endang Suryani",
    nationality: "Indonesian",
    dateOfBirth: new Date("1986-11-03"),
    languages: ["Bahasa Indonesia", "English"],
    yearsExperience: 9,
    profileStatus: "ACTIVE",
    availabilityStatus: "AVAILABLE",
    maidType: MaidType.TRANSFER,
    maritalStatus: MaritalStatus.MARRIED,
    skills: [
      { slug: "chinese-home-cooking", level: SkillLevel.EXPERIENCED, years: 5 },
      { slug: "general-housekeeping", level: SkillLevel.EXPERT, years: 9 },
    ],
    trainings: [
      { title: "One-Day Training Handbook", completed: true, completedAt: new Date("2015-09-01") },
      { title: "Settling-In Program (SIP)", completed: true, completedAt: new Date("2015-09-18") },
    ],
    employmentHistory: [
      {
        country: "Singapore",
        startDate: new Date("2015-10-01"),
        duties: "Cooking, full household management",
        householdDescription: "Family of 4, landed property",
      },
    ],
  },
  {
    profileCode: "SG-00013",
    name: "[Fictional] Kumari Perera",
    nationality: "Sri Lankan",
    dateOfBirth: new Date("1996-06-07"),
    languages: ["English", "Sinhala"],
    yearsExperience: 4,
    profileStatus: "ACTIVE",
    availabilityStatus: "AVAILABLE",
    maidType: MaidType.NEW,
    maritalStatus: MaritalStatus.SINGLE,
    skills: [{ slug: "pet-care-cats", level: SkillLevel.EXPERIENCED, years: 4 }],
    trainings: [{ title: "One-Day Training Handbook", completed: true, completedAt: new Date("2020-02-01") }],
    employmentHistory: [
      {
        country: "Singapore",
        startDate: new Date("2020-03-01"),
        endDate: new Date("2024-01-31"),
        duties: "Cat care, light housekeeping",
        householdDescription: "Single professional with two cats, condominium unit",
        reasonForLeaving: "Contract completed",
      },
    ],
  },
  {
    profileCode: "SG-00014",
    name: "[Fictional] Luzviminda Bautista",
    nationality: "Filipino",
    dateOfBirth: new Date("1981-03-22"),
    languages: ["English", "Tagalog"],
    yearsExperience: 15,
    profileStatus: "ACTIVE",
    availabilityStatus: "RESERVED",
    maidType: MaidType.EX_OTHERS,
    maritalStatus: MaritalStatus.WIDOWED,
    internalNotes: "[Fictional] Currently in final interview stage.",
    skills: [
      { slug: "elderly-companionship", level: SkillLevel.EXPERT, years: 15 },
      { slug: "laundry-ironing", level: SkillLevel.EXPERT, years: 15 },
    ],
    trainings: [
      { title: "One-Day Training Handbook", completed: true, completedAt: new Date("2009-05-01") },
      { title: "Childcare & Elderly Care Refresher", completed: true, completedAt: new Date("2021-03-01") },
    ],
    employmentHistory: [
      {
        country: "Singapore",
        startDate: new Date("2009-06-01"),
        endDate: new Date("2023-12-31"),
        duties: "Elderly care, laundry",
        householdDescription: "Elderly individual, landed property",
        reasonForLeaving: "Contract completed",
      },
    ],
  },
  {
    profileCode: "SG-00015",
    name: "[Fictional] Rina Marpaung",
    nationality: "Indonesian",
    dateOfBirth: new Date("2004-09-14"),
    languages: ["Bahasa Indonesia"],
    yearsExperience: 0,
    profileStatus: "ACTIVE",
    availabilityStatus: "AVAILABLE",
    // Deliberately no skills/employment history yet — a genuinely new
    // candidate, useful for testing the UI's handling of empty/missing
    // optional data. Also deliberately left with maidType/maritalStatus
    // both unset (→ null) — Phase 4.6.3's Marital filter must never
    // invent a value for this profile, and must exclude it whenever a
    // specific marital filter is applied.
    skills: [],
    trainings: [{ title: "One-Day Training Handbook", completed: false }],
    employmentHistory: [],
  },
  {
    profileCode: "SG-00016",
    name: "[Fictional] Sreymom Chan",
    nationality: "Cambodian",
    dateOfBirth: new Date("1991-12-30"),
    languages: ["Khmer", "English"],
    yearsExperience: 7,
    profileStatus: "ACTIVE",
    availabilityStatus: "AVAILABLE",
    maidType: MaidType.TRANSFER,
    maritalStatus: MaritalStatus.MARRIED,
    skills: [
      { slug: "school-age-childcare", level: SkillLevel.EXPERIENCED, years: 7 },
      { slug: "general-housekeeping", level: SkillLevel.EXPERIENCED, years: 7 },
    ],
    trainings: [
      { title: "One-Day Training Handbook", completed: true, completedAt: new Date("2017-08-01") },
      { title: "Household Safety & Hygiene", completed: true, completedAt: new Date("2020-01-15") },
    ],
    employmentHistory: [
      {
        country: "Singapore",
        startDate: new Date("2017-09-01"),
        duties: "School-age childcare, housekeeping",
        householdDescription: "Family of 4 with two children, HDB flat",
      },
    ],
  },
  {
    profileCode: "SG-00017",
    name: "[Fictional] Remedios Torres",
    nationality: "Filipino",
    dateOfBirth: new Date("1976-02-18"),
    languages: ["English", "Tagalog"],
    yearsExperience: 20,
    profileStatus: "ACTIVE",
    availabilityStatus: "AVAILABLE",
    maidType: MaidType.EX_SINGAPORE,
    maritalStatus: MaritalStatus.MARRIED,
    skills: [
      { slug: "elderly-companionship", level: SkillLevel.EXPERT, years: 20 },
      { slug: "mobility-fall-assistance", level: SkillLevel.EXPERT, years: 18 },
      { slug: "general-housekeeping", level: SkillLevel.EXPERT, years: 20 },
    ],
    trainings: [
      { title: "One-Day Training Handbook", completed: true, completedAt: new Date("2005-01-10") },
      { title: "Settling-In Program (SIP)", completed: true, completedAt: new Date("2005-01-25") },
      { title: "Childcare & Elderly Care Refresher", completed: true, completedAt: new Date("2023-04-01") },
    ],
    employmentHistory: [
      {
        country: "Singapore",
        startDate: new Date("2005-02-01"),
        endDate: new Date("2022-06-30"),
        duties: "Elderly care, full household management",
        householdDescription: "Elderly couple, landed property",
        reasonForLeaving: "Contract completed",
      },
    ],
  },
  {
    profileCode: "SG-00018",
    name: "[Fictional] Wulan Sari",
    nationality: "Indonesian",
    dateOfBirth: new Date("1999-07-08"),
    languages: ["Bahasa Indonesia"],
    yearsExperience: 2,
    profileStatus: "ACTIVE",
    availabilityStatus: "RESERVED",
    maidType: MaidType.NEW,
    maritalStatus: MaritalStatus.DIVORCED,
    internalNotes: "[Fictional] Shortlisted by an employer, awaiting consultation.",
    skills: [
      { slug: "pet-care-dogs", level: SkillLevel.INTERMEDIATE, years: 2 },
      { slug: "pet-care-cats", level: SkillLevel.INTERMEDIATE, years: 2 },
    ],
    trainings: [{ title: "One-Day Training Handbook", completed: true, completedAt: new Date("2022-10-01") }],
    employmentHistory: [
      {
        country: "Singapore",
        startDate: new Date("2022-11-01"),
        endDate: new Date("2024-10-31"),
        duties: "Pet care (dogs and cats), light housekeeping",
        householdDescription: "Family of 3 with two pets, condominium unit",
        reasonForLeaving: "Contract completed",
      },
    ],
  },
];

async function main() {
  console.log("Seeding fictional development data (NOT real biodata)…");

  // Skills
  const skillBySlug = new Map<string, { id: string }>();
  for (const skill of SKILLS) {
    const row = await prisma.skill.upsert({
      where: { slug: skill.slug },
      update: { name: skill.name, category: skill.category },
      create: skill,
    });
    skillBySlug.set(skill.slug, row);
  }
  console.log(`  Skills: ${skillBySlug.size}`);

  // Training modules
  const moduleByTitle = new Map<string, { id: string }>();
  for (const mod of TRAINING_MODULES) {
    const row = await prisma.trainingModule.upsert({
      where: { title: mod.title },
      update: mod,
      create: mod,
    });
    moduleByTitle.set(mod.title, row);
  }
  console.log(`  Training modules: ${moduleByTitle.size}`);

  // Maid profiles + related rows
  for (const maid of MAIDS) {
    const profile = await prisma.maidProfile.upsert({
      where: { profileCode: maid.profileCode },
      update: {
        name: maid.name,
        nationality: maid.nationality,
        dateOfBirth: maid.dateOfBirth,
        languages: maid.languages,
        yearsExperience: maid.yearsExperience,
        profileStatus: maid.profileStatus,
        availabilityStatus: maid.availabilityStatus,
        maidType: maid.maidType ?? null,
        maritalStatus: maid.maritalStatus ?? null,
        internalNotes: maid.internalNotes,
      },
      create: {
        profileCode: maid.profileCode,
        name: maid.name,
        nationality: maid.nationality,
        dateOfBirth: maid.dateOfBirth,
        languages: maid.languages,
        yearsExperience: maid.yearsExperience,
        profileStatus: maid.profileStatus,
        availabilityStatus: maid.availabilityStatus,
        maidType: maid.maidType ?? null,
        maritalStatus: maid.maritalStatus ?? null,
        internalNotes: maid.internalNotes,
      },
    });

    // Replace child rows on re-seed so the script stays idempotent.
    await prisma.employmentHistory.deleteMany({ where: { maidId: profile.id } });
    await prisma.maidSkill.deleteMany({ where: { maidId: profile.id } });
    await prisma.maidTraining.deleteMany({ where: { maidId: profile.id } });

    for (const [index, entry] of maid.employmentHistory.entries()) {
      await prisma.employmentHistory.create({
        data: {
          maidId: profile.id,
          country: entry.country,
          startDate: entry.startDate,
          endDate: entry.endDate,
          duties: entry.duties,
          householdDescription: entry.householdDescription,
          reasonForLeaving: entry.reasonForLeaving,
          displayOrder: index,
        },
      });
    }

    for (const skill of maid.skills) {
      const skillRow = skillBySlug.get(skill.slug);
      if (!skillRow) throw new Error(`Unknown skill slug in seed data: ${skill.slug}`);
      await prisma.maidSkill.create({
        data: {
          maidId: profile.id,
          skillId: skillRow.id,
          experienceLevel: skill.level,
          yearsExperience: skill.years,
        },
      });
    }

    for (const training of maid.trainings) {
      const moduleRow = moduleByTitle.get(training.title);
      if (!moduleRow) throw new Error(`Unknown training module in seed data: ${training.title}`);
      await prisma.maidTraining.create({
        data: {
          maidId: profile.id,
          trainingModuleId: moduleRow.id,
          completed: training.completed,
          completedAt: training.completedAt,
        },
      });
    }
  }
  console.log(`  Maid profiles: ${MAIDS.length}`);

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
