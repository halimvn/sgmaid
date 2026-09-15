import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = { title: "Employer Login — SG Maid" };

/**
 * Employer login. Connected to real Auth.js credentials authentication
 * as of Phase 2 — see auth.ts and lib/auth/credentials.ts. The
 * server-side session check that actually protects /dashboard/* lives in
 * app/dashboard/layout.tsx (via lib/auth/authorize.ts), not here.
 *
 * `?setup=success` is the redirect target after a successful
 * /setup-password completion (see app/setup-password) — shows a friendly
 * confirmation banner instead of silently landing back on a blank form.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string; reset?: string }>;
}) {
  const { setup, reset } = await searchParams;

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "48px 24px",
        position: "relative",
        overflow: "hidden",
        background: "var(--cream)",
      }}
    >
      <svg
        className="rings"
        viewBox="0 0 200 200"
        aria-hidden="true"
        style={{ top: -140, right: -140, width: 420, height: 420, color: "var(--purple)", opacity: 0.1 }}
      >
        <circle cx="100" cy="100" r="26" stroke="currentColor" />
        <circle cx="100" cy="100" r="46" stroke="currentColor" />
        <circle cx="100" cy="100" r="66" stroke="currentColor" />
        <circle cx="100" cy="100" r="86" stroke="currentColor" />
      </svg>

      <div className="card" style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <Link href="/" style={{ display: "inline-flex" }} aria-label="SG Maid home">
            <Image src="/sgmaid-logo-colored.png" alt="SG Maid" width={160} height={68} style={{ height: 52, width: "auto" }} />
          </Link>
          <span className="eyebrow" style={{ marginBottom: 0 }}>Employer Portal</span>
        </div>
        <h1 style={{ fontSize: "1.7rem", marginBottom: 8 }}>Log in to your account</h1>
        <p style={{ fontSize: ".92rem", color: "var(--ink-70)", marginBottom: 24 }}>
          Not registered yet? <Link href="/contact" style={{ color: "var(--purple)", fontWeight: 600 }}>Contact us</Link> to
          request secure employer access.
        </p>

        {setup === "success" && (
          <p className="form-notice form-notice--success">Your account is ready. You can now sign in.</p>
        )}
        {reset === "success" && (
          <p className="form-notice form-notice--success">Your password has been reset. You can now sign in.</p>
        )}

        <LoginForm />

        <p className="form-alt">
          <Link href="/">← Back to the public site</Link>
        </p>
      </div>
    </main>
  );
}
