/**
 * ============================================================
 * ONE-TIME SETUP — private maid document Storage bucket (Phase 4.6)
 * ============================================================
 * Creates the Supabase Storage bucket used to hold biodata PDFs and
 * (Phase 4.6.2) explicitly-approved candidate photos, if it doesn't
 * already exist — and widens an already-existing bucket's allowed MIME
 * types if it predates the photo document type. Idempotent — safe to
 * run more than once.
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

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

async function main() {
  const supabase = getSupabaseStorageAdmin();
  const bucketName = getMaidDocumentBucket();

  const { data: existing, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    throw new Error(`Failed to list Supabase Storage buckets: ${listError.message}`);
  }

  const bucket = existing?.find((b) => b.name === bucketName);
  if (bucket) {
    console.log(`Bucket "${bucketName}" already exists (public: ${bucket.public}).`);
    if (bucket.public) {
      console.warn(
        `⚠ WARNING: bucket "${bucketName}" is PUBLIC. This bucket must be private — please fix this in the Supabase dashboard (Storage → ${bucketName} → Settings) before storing any real biodata PDFs.`
      );
    }
    const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
      public: false,
      fileSizeLimit: "10MB",
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    });
    if (updateError) {
      throw new Error(`Failed to update bucket "${bucketName}" MIME allowlist: ${updateError.message}`);
    }
    console.log(`  Allowed MIME types confirmed: ${ALLOWED_MIME_TYPES.join(", ")}`);
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(bucketName, {
    public: false, // private — access only via short-lived signed URLs generated server-side
    fileSizeLimit: "10MB",
    allowedMimeTypes: ALLOWED_MIME_TYPES,
  });

  if (createError) {
    throw new Error(`Failed to create bucket "${bucketName}": ${createError.message}`);
  }

  console.log(`Created private bucket "${bucketName}" (${ALLOWED_MIME_TYPES.join(", ")}, 10MB limit).`);
}

main().catch((err) => {
  console.error("Bucket setup failed:", err);
  process.exitCode = 1;
});
