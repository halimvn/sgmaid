import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authenticateCredentials } from "@/lib/auth/credentials";
import { getClientIp } from "@/lib/auth/request-ip";

// A distinct, non-sensitive error code (see CredentialsSignin's own
// docs: it ends up in the redirect URL, so it must never hint at *why*
// specifically a login failed) — used only so the client can show
// "too many attempts" instead of the generic message. It reveals
// nothing about whether the account exists.
class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited";
}

/**
 * Auth.js (next-auth v5) configuration — Phase 2.
 *
 * Session strategy is JWT, not database-backed: the Credentials provider
 * only supports JWT sessions (Auth.js doesn't persist credentials-based
 * logins to an adapter). This is fine for this project's design, because
 * authorization was never meant to trust the session payload anyway —
 * see lib/auth/authorize.ts, which re-reads role/status/sessionVersion
 * from PostgreSQL on every protected request regardless of what's in the
 * signed cookie.
 *
 * The session/JWT payload is kept minimal by design: only the user id and
 * the sessionVersion captured at sign-in time. No passwordHash, no
 * internal notes, no role/status cached for authorization decisions.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email = typeof credentials?.email === "string" ? credentials.email : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const ip = getClientIp(request);
        const result = await authenticateCredentials(email, password, ip);
        if (!result.ok) {
          if (result.reason === "RATE_LIMITED") throw new RateLimitedSignin();
          return null;
        }

        // Returned fields become the `user` object passed to the jwt()
        // callback below — kept to exactly what the session needs.
        return {
          id: result.user.id,
          role: result.user.role,
          sessionVersion: result.user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.sessionVersion = user.sessionVersion;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.sub === "string") {
        session.user.id = token.sub;
      }
      session.sessionVersion = typeof token.sessionVersion === "number" ? token.sessionVersion : 0;
      return session;
    },
  },
});
