import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma Client singleton — Server-only.
 *
 * Never import this file from a Client Component ("use client"). It should
 * only be reached from Server Components, Route Handlers, and Server
 * Actions — none of which exist yet for maid data in Phase 1 (see the
 * Phase 1 "DO NOT BUILD YET" list: no maid API endpoints, no DB queries in
 * pages this phase).
 *
 * Prisma 7 no longer accepts a bare `new PrismaClient()` reading
 * `DATABASE_URL` implicitly — a driver adapter must be passed explicitly.
 * See prisma.config.ts for the CLI-side (migrate/generate/seed) connection
 * configuration, which is separate from this runtime configuration.
 *
 * The standard Next.js dev pattern below stashes the client on `globalThis`
 * so hot-reloading in `next dev` reuses one PrismaClient/connection pool
 * instead of creating a new one on every module reload.
 */

declare global {
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and point it at " +
        "your PostgreSQL instance before using lib/db.ts."
    );
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
