"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const ADMIN_NAV = [
  { href: "/admin", label: "Admin Home" },
  { href: "/admin/maids", label: "Maid Management" },
  { href: "/admin/clients", label: "Clients" },
];

/**
 * Admin portal app-shell header — Phase 6. Deliberately its own
 * component (not a reuse of components/dashboard/AppHeader.tsx, which
 * is the employer-facing shell with different nav) — the admin and
 * employer portals are different experiences, per the Phase 6 spec,
 * even though they share the same visual language and .appbar/.appnav
 * CSS primitives.
 */
export default function AdminHeader() {
  const pathname = usePathname();

  return (
    <header className="appbar">
      <div className="appbarin">
        <Image src="/sgmaid-logo-colored.png" alt="SG Maid" width={190} height={80} className="logo" priority />
        <span className="chip admin-chip">Admin</span>
        <nav className="appnav">
          {ADMIN_NAV.map((link) => (
            <Link key={link.href} href={link.href} className={pathname === link.href ? "cur" : undefined}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="right">
          <button type="button" className="logout" onClick={() => signOut({ callbackUrl: "/login" })}>
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
