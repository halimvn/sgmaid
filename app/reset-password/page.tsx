import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { validateAuthToken } from "@/lib/auth/tokens";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/constants";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export const metadata: Metadata = { title: "Reset Your Password — SG Maid" };

/**
 * Password-reset completion page — Phase 2 backend foundation. There is
 * no email delivery yet (see scripts/create-dev-password-reset.ts for
 * how to generate a link in development); this page and its Server
 * Action are ready for the moment a real "forgot password" trigger and
 * email provider exist.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const validation = token ? await validateAuthToken(token, "PASSWORD_RESET") : null;
  const linkIsUsable = Boolean(validation?.ok);

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

        {linkIsUsable && token ? (
          <>
            <h1 style={{ fontSize: "1.7rem", marginBottom: 8 }}>Reset your password</h1>
            <p style={{ fontSize: ".92rem", color: "var(--ink-70)", marginBottom: 24 }}>
              Choose a new password for your SG Maid employer account.
            </p>
            <ResetPasswordForm token={token} minLength={PASSWORD_MIN_LENGTH} />
          </>
        ) : (
          <>
            <h1 style={{ fontSize: "1.7rem", marginBottom: 8 }}>This link is no longer valid</h1>
            <p className="form-notice form-notice--error">
              This password reset link is invalid, expired, or has already been used.
            </p>
            <p style={{ fontSize: ".92rem", color: "var(--ink-70)" }}>
              Please <Link href="/contact" style={{ color: "var(--purple)", fontWeight: 600 }}>contact SG Maid</Link> or
              request a new one.
            </p>
          </>
        )}

        <p className="form-alt">
          <Link href="/">← Back to the public site</Link>
        </p>
      </div>
    </main>
  );
}
