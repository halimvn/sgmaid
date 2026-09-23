"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

/**
 * Real credentials login — Phase 2, revised Phase 8.
 *
 * Deliberately calls signIn() with redirect:false so a failed attempt
 * can show an inline, generic message without a full page reload/
 * navigation — Auth.js still performs the actual authentication
 * server-side (see auth.ts → lib/auth/credentials.ts); this component
 * only submits the form and renders the result.
 *
 * Phase 8: the identifier field is now "Username", not "Email address" —
 * SG Maid staff create client/employer access directly (see
 * /admin/clients), and a client logs in with the username staff gave
 * them, never an email. (SG Maid staff/ADMIN accounts still authenticate
 * fine here too — see lib/auth/credentials.ts for how the same field
 * quietly also accepts an admin's email; there is deliberately no
 * separate admin login page.)
 *
 * The error message is intentionally the same generic string for every
 * failure Auth.js reports except rate limiting and expired access —
 * never "username not found" or "wrong password" (see
 * lib/auth/credentials.ts for why).
 */
export default function LoginForm() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setStatus("loading");

    const form = new FormData(e.currentTarget);
    const identifier = String(form.get("identifier") ?? "");
    const password = String(form.get("password") ?? "");

    try {
      const result = await signIn("credentials", { identifier, password, redirect: false });

      if (!result || result.error) {
        setError(
          result?.code === "rate_limited"
            ? "Too many attempts. Please wait a few minutes and try again."
            : result?.code === "access_expired"
              ? "Your access has expired. Please contact SG Maid for assistance."
              : "Unable to sign in with those details."
        );
        setStatus("idle");
        return;
      }

      // Role-aware landing (Phase 6: admins go to /admin, employers to
      // /dashboard) — see app/post-login/page.tsx for why this is a
      // server-side hop rather than a client-side role check.
      router.push("/post-login");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("idle");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <p className="form-notice form-notice--error" role="alert">
          {error}
        </p>
      )}
      <div className="field">
        <label htmlFor="login-identifier">Username</label>
        <input
          id="login-identifier"
          name="identifier"
          type="text"
          placeholder="your username"
          autoComplete="username"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </div>
      <button className="btn btn--primary btn--block" type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Signing in…" : "Log In"}
      </button>
      {/* Phase 8: clients no longer get a self-service email reset flow
          (see lib/services/admin/clients.ts resetClientPassword()) — a
          forgotten password is an assisted, staff-side reset. */}
      <p style={{ marginTop: 12, textAlign: "center", fontSize: "0.85rem", color: "var(--ink-45, #7a7a85)" }}>
        Forgot your login details? Contact SG Maid for assistance.
      </p>
    </form>
  );
}
