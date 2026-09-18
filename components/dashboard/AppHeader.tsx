"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const APP_NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/maids", label: "Browse Helpers" },
  { href: "/dashboard/shortlist", label: "My Shortlist" },
  { href: "/dashboard/account", label: "My Account" },
];

/**
 * Employer portal app-shell header. Distinct from the marketing
 * SiteHeader by design (no WhatsApp/Find-Your-Helper CTAs — this is
 * an internal, authenticated-only screen once Phase 2 lands).
 */
export default function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="appbar">
      <div className="appbarin">
        <Image src="/sgmaid-logo-colored.png" alt="SG Maid" width={190} height={80} className="logo" priority />
        <nav className="appnav">
          {APP_NAV.map((link) => (
            <Link key={link.href} href={link.href} className={pathname === link.href ? "cur" : undefined}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="right">
          {/* Real session destroy (Phase 2) — clears the Auth.js session cookie server-side, then redirects to /login. */}
          <button
            type="button"
            className="logout"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <svg viewBox="0 0 24 24"><use href="#i-logout" /></svg>
            Logout
          </button>
        </div>
        <button className="app-burger" aria-label="Open menu">
          <svg viewBox="0 0 24 24"><use href="#i-menu" /></svg>
        </button>
      </div>
    </header>
  );
}
