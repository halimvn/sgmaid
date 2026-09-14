import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vitest config — Phase 2.
 *
 * Scope: unit tests for the authentication/security logic layer
 * (lib/auth/**) only. These are pure Node-environment tests against
 * mocked Prisma calls — no real database, no React rendering, no Next.js
 * request/response machinery. See tests/README.md for why the
 * redirect-throwing route guards (requireActiveUser/etc.) are deliberately
 * NOT exercised here — their pure logic core (evaluateAccess) is.
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
  },
});
