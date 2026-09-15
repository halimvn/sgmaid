/**
 * ============================================================
 * ONE-TIME SETUP — private maid biodata Storage bucket (Phase 4.6)
 * ============================================================
 * Creates the Supabase Storage bucket used to hold biodata PDFs, if it
 * doesn't already exist. Idempotent — safe to run more than once.
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to already be set
 * in your local .env (see .env.example). Never prints the service-role
 * key or any bucket contents.
 *
 * Usage:
 *   npm run setup:maid-storage
 */

import "dotenv/config";
import { getSupabaseStorageAdmin, getMaidDocumentBucket } from "../lib/storage/supabase-admin";

async function main() {
  const supabase = getSupabaseStorageAdmin();
  const bucketName = getMaidDocumentBucket();

  const { data: existing, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    throw new Error(`Failed to list Supabase Storage buckets: ${listError.message}`);
  }

  if (existing?.some((b) => b.name === bucketName)) {
    const bucket = existing.find((b) => b.name === bucketName)!;
    console.log(`Bucket "${bucketName}" already exists (public: ${bucket.public}).`);
    if (bucket.public) {
      console.warn(
        `⚠ WARNING: bucket "${bucketName}" is PUBLIC. This bucket must be private — please fix this in the Supabase dashboard (Storage → ${bucketName} → Settings) before storing any real biodata PDFs.`
      );
    }
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(bucketName, {
    public: false, // private — access only via short-lived signed URLs generated server-side
    fileSizeLimit: "10MB",
    allowedMimeTypes: ["application/pdf"],
  });

  if (createError) {
    throw new Error(`Failed to create bucket "${bucketName}": ${createError.message}`);
  }

  console.log(`Created private bucket "${bucketName}" (PDF only, 10MB limit).`);
}

main().catch((err) => {
  console.error("Bucket setup failed:", err);
  process.exitCode = 1;
});
