import type { DefaultSession } from "next-auth";

/**
 * Auth.js type augmentation — Phase 2.
 *
 * Keeps the session/JWT payload's shape minimal and explicit: just enough
 * to identify the user and detect a revoked session (see
 * lib/auth/authorize.ts for why role/status are never read from here for
 * authorization decisions — only re-fetched from the database).
 */
declare module "next-auth" {
  interface User {
    role?: "EMPLOYER" | "ADMIN";
    sessionVersion?: number;
  }

  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
    sessionVersion: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sessionVersion?: number;
  }
}
