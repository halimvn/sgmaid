import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = { title: "Employer Login — SG Maid" };

/**
 * Employer login — new page (no equivalent existed in the original
 * static site). UI only for Phase 0: the form does not submit
 * anywhere yet. Real credentials auth (Auth.js, bcrypt/argon2,
 * server-side sessions) arrives in Phase 2 — see app/dashboard/layout.tsx
 * for where the resulting session check will be applied.
 */
export default function LoginPage() {
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
        <Link href="/" style={{ display: "inline-flex", marginBottom: 24 }} aria-label="SG Maid home">
          <Image src="/sgmaid-logo-colored.png" alt="SG Maid" width={160} height={68} style={{ height: 36, width: "auto" }} />
        </Link>
        <span className="eyebrow">Employer Portal</span>
        <h1 style={{ fontSize: "1.7rem", marginBottom: 8 }}>Log in to your account</h1>
        <p style={{ fontSize: ".92rem", color: "var(--ink-70)", marginBottom: 24 }}>
          Not registered yet? <Link href="/contact" style={{ color: "var(--purple)", fontWeight: 600 }}>Contact us</Link> to
          request secure employer access.
        </p>

        <LoginForm />

        <p className="form-alt">
          <Link href="/">← Back to the public site</Link>
        </p>
      </div>
    </main>
  );
}
