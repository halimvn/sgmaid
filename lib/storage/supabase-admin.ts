import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase Storage admin client — Phase 4.6.
 *
 * Uses the service-role key, which can read/write any bucket regardless
 * of Row Level Security — this must never be imported into a Client
 * Component, never prefixed NEXT_PUBLIC_, and never logged. It exists
 * only to generate short-lived signed URLs for the private
 * `maid-biodata` bucket, after our own requireEmployer() +
 * employer-visibility checks already passed — see
 * lib/services/maid-documents.ts, which is the only intended caller.
 *
 * This is unrelated to Prisma/PostgreSQL: the app's data (MaidProfile,
 * MaidDocument, etc.) is still exclusively Prisma against Supabase's
 * Postgres. This client talks to Supabase Storage only, never the
 * database, and never replaces Prisma as the data layer.
 */
function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. See .env.example.`);
  }
  return value;
}

let cachedClient: ReturnType<typeof createClient> | undefined;

export function getSupabaseStorageAdmin() {
  if (!cachedClient) {
    const url = getEnv("SUPABASE_URL");
    const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    cachedClient = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return cachedClient;
}

export function getMaidDocumentBucket(): string {
  return process.env.SUPABASE_MAID_DOCUMENT_BUCKET ?? "maid-biodata";
}
