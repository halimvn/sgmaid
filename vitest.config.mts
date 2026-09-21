import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vitest config.
 *
 * Phase 2: unit tests for the authentication/security logic layer
 * (lib/auth/**) against mocked Prisma calls — no real database, no React
 * rendering, no Next.js request/response machinery.
 *
 * Phase 3 adds tests/maids-integration.test.ts, which deliberately runs
 * against the REAL development database (DATABASE_URL, loaded via
 * tests/setup.ts) to prove the actual Prisma query/service layer excludes
 * DRAFT/INACTIVE/hidden-availability profiles — not just a mocked stand-in
 * for one. See tests/README.md for the full breakdown.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "."),
      // See tests/stubs/server-only.ts — the real package throws outside
      // a Next.js "react-server" build, which Vitest's plain Node
      // environment is not.
      "server-only": path.resolve(dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    // Several suites share the one sgmaid-dev database and create/delete fixtures in
    // it (some assert on "newest N visible maids"), so files run one at a time.
    fileParallelism: false,
  },
});
