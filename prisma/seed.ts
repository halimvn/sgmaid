/**
 * ============================================================
 * REFERENCE-DATA SEED — Skill taxonomy + Training modules ONLY
 * ============================================================
 * This script deliberately seeds NO maid profiles. The fictional demo
 * candidates it used to create (SG-00001..SG-00018) were removed once real
 * pilot data was in use; the normal way to add a maid is now the Admin
 * Dashboard (Add New Maid -> Save Draft -> upload biodata/photo ->
 * Publish). Real people must never become committed seed fixtures: do NOT
 * put real candidate data, passport/FIN numbers, addresses, or biodata into
 * this file. Automated tests that need a maid create their own throwaway
 * fictional records and clean them up (see tests/*-integration.test.ts).
 *
 * This script does NOT create any login-capable accounts either.
 *
 * Run with:
 *   npx prisma db seed
 * (requires a working DATABASE_URL — see README.md)
 */

import "dotenv/config";
import { PrismaClient, SkillCategory } from "@prisma/client";
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

async function main() {
  console.log("Seeding reference data (skills + training modules; no maid profiles)…");

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
