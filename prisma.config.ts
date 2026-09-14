import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 CLI configuration (migrate, generate, db seed, studio, …).
 *
 * As of Prisma 7, the datasource connection URL is no longer declared in
 * schema.prisma — it lives here for CLI use, and separately as a driver
 * adapter for the runtime PrismaClient (see lib/db.ts).
 *
 * DATABASE_URL comes from .env (see .env.example for the expected format).
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
    url: env("DATABASE_URL"),
  },
});
