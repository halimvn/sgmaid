/**
 * ============================================================
 * REAL MAID DATA IMPORT — single-candidate pilot (Phase 4.6)
 * ============================================================
 * Imports exactly one candidate from a local, gitignored JSON input file
 * (see private-import-data/ — never committed) plus the original biodata
 * PDF, uploading the PDF to the private Supabase Storage bucket and
 * writing the structured fields to PostgreSQL via Prisma.
 *
 * This is NOT a bulk importer and NOT a general-purpose tool — it exists
 * to prove the pilot pipeline works end-to-end for one real record. Real
 * candidates are additional to the fictional seed data — this script
 * never touches prisma/seed.ts and never deletes any existing profile.
 *
 * Usage:
 *   npm run import:real-maid -- --input private-import-data/dv155.json
 *
 * The input JSON's shape mirrors the mapping table already reviewed and
 * approved for this candidate — see the Phase 4.6 report. Refuses to run
 * with NODE_ENV=production, same safety rail as the dev invite scripts.
 */

import "dotenv/config";
import fs from "node:fs";
import { z } from "zod";
import { prisma } from "../lib/db";
import { getSupabaseStorageAdmin, getMaidDocumentBucket } from "../lib/storage/supabase-admin";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run: NODE_ENV=production. This script is for the development pilot only.");
  process.exit(1);
}

const inputSchema = z.object({
  profileCode: z.string().min(1),
  name: z.string().min(1),
  nationality: z.string().min(1),
  dateOfBirth: z.string().min(1), // ISO date string, e.g. "1992-08-07"
  languages: z.array(z.string()).default([]),
  yearsExperience: z.number().int().min(0),
  heightCm: z.number().int().positive().nullable().optional(),
  weightKg: z.number().int().positive().nullable().optional(),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"]).nullable().optional(),
  maidType: z.enum(["NEW", "TRANSFER"]).nullable().optional(),
  profileStatus: z.enum(["DRAFT", "ACTIVE", "INACTIVE"]),
  availabilityStatus: z.enum(["AVAILABLE", "RESERVED", "PLACED", "UNAVAILABLE"]),
  internalNotes: z.string().nullable().optional(),
  skills: z.array(z.object({ slug: z.string().min(1), note: z.string().optional() })).default([]),
  employmentHistory: z
    .array(
      z.object({
        country: z.string().min(1),
        startYear: z.number().int().nullable().optional(),
        endYear: z.number().int().nullable().optional(),
        duties: z.string().nullable().optional(),
        householdDescription: z.string().nullable().optional(),
      })
    )
    .default([]),
  biodataPdfSourcePath: z.string().min(1),
});

function parseArgs(): { inputPath: string } {
  const args = process.argv.slice(2);
  const i = args.indexOf("--input");
  const inputPath = i !== -1 ? args[i + 1] : undefined;
  if (!inputPath) {
    console.error("Usage: npm run import:real-maid -- --input private-import-data/<file>.json");
    process.exit(1);
  }
  return { inputPath };
}

async function main() {
  const { inputPath } = parseArgs();

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }
  const raw = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  const input = inputSchema.parse(raw);

  if (!fs.existsSync(input.biodataPdfSourcePath)) {
    throw new Error(`Biodata PDF not found at: ${input.biodataPdfSourcePath}`);
  }

  console.log(`Importing pilot candidate ${input.profileCode}…`);

  // 1. Upload the original PDF to private Supabase Storage.
  const pdfBuffer = fs.readFileSync(input.biodataPdfSourcePath);
  const storagePath = `${input.profileCode}/biodata.pdf`;
  const supabase = getSupabaseStorageAdmin();
  const bucket = getMaidDocumentBucket();

  const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, pdfBuffer, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (uploadError) {
    throw new Error(`Failed to upload biodata PDF to Supabase Storage: ${uploadError.message}`);
  }
  console.log(`  Uploaded biodata PDF to ${bucket}/${storagePath}`);

  // 2. Upsert the MaidProfile itself.
  const maid = await prisma.maidProfile.upsert({
    where: { profileCode: input.profileCode },
    update: {
      name: input.name,
      nationality: input.nationality,
      dateOfBirth: new Date(input.dateOfBirth),
      languages: input.languages,
      yearsExperience: input.yearsExperience,
      heightCm: input.heightCm ?? null,
      weightKg: input.weightKg ?? null,
      maritalStatus: input.maritalStatus ?? null,
      maidType: input.maidType ?? null,
      profileStatus: input.profileStatus,
      availabilityStatus: input.availabilityStatus,
      internalNotes: input.internalNotes ?? null,
    },
    create: {
      profileCode: input.profileCode,
      name: input.name,
      nationality: input.nationality,
      dateOfBirth: new Date(input.dateOfBirth),
      languages: input.languages,
      yearsExperience: input.yearsExperience,
      heightCm: input.heightCm ?? null,
      weightKg: input.weightKg ?? null,
      maritalStatus: input.maritalStatus ?? null,
      maidType: input.maidType ?? null,
      profileStatus: input.profileStatus,
      availabilityStatus: input.availabilityStatus,
      internalNotes: input.internalNotes ?? null,
    },
  });

  // 3. Replace child rows (idempotent re-run), same pattern as prisma/seed.ts.
  await prisma.employmentHistory.deleteMany({ where: { maidId: maid.id } });
  await prisma.maidSkill.deleteMany({ where: { maidId: maid.id } });

  for (const [index, entry] of input.employmentHistory.entries()) {
    await prisma.employmentHistory.create({
      data: {
        maidId: maid.id,
        country: entry.country,
        startYear: entry.startYear ?? null,
        endYear: entry.endYear ?? null,
        duties: entry.duties ?? null,
        householdDescription: entry.householdDescription ?? null,
        displayOrder: index,
      },
    });
  }

  for (const skill of input.skills) {
    const skillRow = await prisma.skill.findUnique({ where: { slug: skill.slug } });
    if (!skillRow) {
      throw new Error(`Unknown skill slug "${skill.slug}" — no matching Skill row exists. Add it first if genuinely new.`);
    }
    await prisma.maidSkill.create({
      data: { maidId: maid.id, skillId: skillRow.id },
    });
  }

  // 4. Record the biodata document.
  await prisma.maidDocument.upsert({
    where: { maidId_type: { maidId: maid.id, type: "BIODATA_PDF" } },
    update: { storagePath, mimeType: "application/pdf" },
    create: { maidId: maid.id, type: "BIODATA_PDF", storagePath, mimeType: "application/pdf" },
  });

  console.log(`\nImported ${input.profileCode} successfully.`);
  console.log(`  MaidProfile id: ${maid.id}`);
  console.log(`  Employment history rows: ${input.employmentHistory.length}`);
  console.log(`  Skills imported: ${input.skills.length}`);
  console.log(`  Biodata document: ${bucket}/${storagePath}`);
}

main()
  .catch((err) => {
    console.error("Import failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
