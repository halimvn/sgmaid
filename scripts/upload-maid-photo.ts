/**
 * ============================================================
 * UPLOAD AN APPROVED CANDIDATE PHOTO (Phase 4.6.2)
 * ============================================================
 * Uploads a single, explicitly-approved candidate photo to the private
 * Supabase Storage bucket and records it as a PROFILE_PHOTO MaidDocument.
 *
 * This is NOT automatic extraction/generation — per the Phase 4.6 rule,
 * a photo is only ever added here because a human supplied and approved
 * this exact file for this exact candidate. There is no code path in
 * this app that scrapes, crops, or generates a face on its own; cropping
 * (if any) is a one-off manual step before running this script, not
 * something this script does.
 *
 * Usage:
 *   npm run upload:maid-photo -- --profileCode DV155 --file private-import-data/dv155-photo-cropped.jpg
 *
 * Refuses to run with NODE_ENV=production, same safety rail as the other
 * one-time Phase 4.6 scripts.
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/db";
import { getSupabaseStorageAdmin, getMaidDocumentBucket } from "../lib/storage/supabase-admin";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run: NODE_ENV=production. This script is for the development pilot only.");
  process.exit(1);
}

function parseArgs(): { profileCode: string; filePath: string } {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };
  const profileCode = get("--profileCode");
  const filePath = get("--file");
  if (!profileCode || !filePath) {
    console.error("Usage: npm run upload:maid-photo -- --profileCode <CODE> --file <path/to/photo.jpg>");
    process.exit(1);
  }
  return { profileCode, filePath };
}

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

async function main() {
  const { profileCode, filePath } = parseArgs();

  if (!fs.existsSync(filePath)) {
    throw new Error(`Photo file not found: ${filePath}`);
  }
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = MIME_BY_EXT[ext];
  if (!mimeType) {
    throw new Error(`Unsupported image extension "${ext}" — expected one of: ${Object.keys(MIME_BY_EXT).join(", ")}`);
  }

  const maid = await prisma.maidProfile.findUnique({ where: { profileCode }, select: { id: true } });
  if (!maid) {
    throw new Error(`No MaidProfile with profileCode "${profileCode}" — import the candidate first.`);
  }

  console.log(`Uploading approved photo for ${profileCode}…`);

  const buffer = fs.readFileSync(filePath);
  const storagePath = `${profileCode}/photo${ext}`;
  const supabase = getSupabaseStorageAdmin();
  const bucket = getMaidDocumentBucket();

  const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
    contentType: mimeType,
    upsert: true,
  });
  if (uploadError) {
    throw new Error(`Failed to upload photo to Supabase Storage: ${uploadError.message}`);
  }
  console.log(`  Uploaded to ${bucket}/${storagePath}`);

  await prisma.maidDocument.upsert({
    where: { maidId_type: { maidId: maid.id, type: "PROFILE_PHOTO" } },
    update: { storagePath, mimeType, originalFileName: path.basename(filePath) },
    create: { maidId: maid.id, type: "PROFILE_PHOTO", storagePath, mimeType, originalFileName: path.basename(filePath) },
  });

  console.log(`\nPhoto recorded for ${profileCode}.`);
  console.log(`  MaidProfile id: ${maid.id}`);
  console.log(`  Document: ${bucket}/${storagePath}`);
}

main()
  .catch((err) => {
    console.error("Upload failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
