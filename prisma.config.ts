import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 CLI configuration (migrate, generate, db seed, studio, …).
 *
 * As of Prisma 7, the datasource connection URL is no longer declared in
 * schema.prisma — it lives here for CLI use, and separately as a driver
 * adapter for the runtime PrismaClient (see lib/db.ts).
 *
 * The CLI uses DIRECT_URL (not DATABASE_URL) deliberately: on pooled
 * providers like Supabase/Neon, Prisma Migrate needs a direct connection —
 * migrations don't work reliably through a transaction pooler (PgBouncer).
 * The running app instead uses the pooled DATABASE_URL at runtime (see
 * lib/db.ts). For a plain self-hosted Postgres both env vars can just be
 * the same value. See .env.example for the expected format of each.
 * No default/fallback URL is provided — there is no shared or assumed
 * database for this project.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
