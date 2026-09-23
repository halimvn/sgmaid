"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";

const ADMIN_NAV = [
  { href: "/admin", label: "Admin Home" },
  { href: "/admin/maids", label: "Maid Management" },
  { href: "/admin/clients", label: "Clients" },
];

/** Same active-route rule as components/dashboard/AppHeader.tsx's isNavActive() — kept as its own copy since this is a deliberately separate component. */
function isNavActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Admin portal app-shell header — Phase 6. Deliberately its own
 * component (not a reuse of components/dashboard/AppHeader.tsx, which
 * is the employer-facing shell with different nav) — the admin and
 * employer portals are different experiences, per the Phase 6 spec,
 * even though they share the same visual language and .appbar/.appnav
 * CSS primitives.
 *
 * Mobile responsive audit: same bug as AppHeader.tsx's burger had — no
 * onClick, no drawer markup, so mobile staff had no way to navigate or
 * log out. Light regression fix only (per the audit's admin scope: no
 * redesign) mirroring that same fix.
 */
export default function AdminHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Adjusted during render, not in a useEffect — see
  // components/dashboard/AppHeader.tsx's identical pattern for why.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    if (!mobileOpen) return;

    function onPointerDown(e: PointerEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  return (
    <header className="appbar" ref={headerRef}>
      <div className="appbarin">
        <Image src="/sgmaid-logo-colored.png" alt="SG Maid" width={190} height={80} className="logo" priority />
        <span className="chip admin-chip">Admin</span>
        <nav className="appnav">
          {ADMIN_NAV.map((link) => (
            <Link key={link.href} href={link.href} className={isNavActive(pathname, link.href) ? "cur" : undefined}>
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
        <button
          type="button"
          className="app-burger"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="admin-mobile-nav"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24"><use href={mobileOpen ? "#i-close" : "#i-menu"} /></svg>
        </button>
      </div>
      <nav id="admin-mobile-nav" className={`app-mobile-nav${mobileOpen ? " open" : ""}`}>
        {ADMIN_NAV.map((link) => (
          <Link key={link.href} href={link.href} className={isNavActive(pathname, link.href) ? "cur" : undefined}>
            {link.label}
          </Link>
        ))}
        <button type="button" className="app-mobile-nav__logout" onClick={() => signOut({ callbackUrl: "/login" })}>
          <svg viewBox="0 0 24 24"><use href="#i-logout" /></svg>
          Logout
        </button>
      </nav>
    </header>
  );
}
