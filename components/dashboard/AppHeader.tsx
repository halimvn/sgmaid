"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";

const APP_NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/maids", label: "Browse Helpers" },
  { href: "/dashboard/shortlist", label: "My Shortlist" },
  { href: "/dashboard/account", label: "My Account" },
];

/**
 * Active-route match shared by the desktop nav and the mobile drawer
 * below, so the two always agree (mobile responsive audit — Step 12).
 * `/dashboard` only matches itself exactly (otherwise it would also
 * light up on every other /dashboard/* route); every other entry also
 * matches its own nested routes, e.g. /dashboard/maids/[id] still shows
 * "Browse Helpers" as active, /dashboard/maids/[id]/biodata too.
 */
function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Employer portal app-shell header. Distinct from the marketing
 * SiteHeader by design (no WhatsApp/Find-Your-Helper CTAs — this is
 * an internal, authenticated-only screen once Phase 2 lands).
 *
 * Mobile responsive audit: the burger button previously rendered with
 * no onClick handler and no drawer markup at all — .appnav and
 * .appbar .right (Logout) are display:none below the 1080px breakpoint
 * (dashboard.css), so a mobile employer had literally no way to
 * navigate or log out. This component now owns that state itself, the
 * same pattern already used by components/SiteHeader.tsx.
 */
export default function AppHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // A route change (nav link, or browser back/forward) should always
  // close an open drawer rather than leave it hanging over the new page.
  // Adjusted during render (React's documented pattern for "state that
  // depends on a prop changing") rather than in a useEffect, which would
  // otherwise commit the open drawer for one extra frame before a
  // second, cascading render closed it.
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
        <nav className="appnav">
          {APP_NAV.map((link) => (
            <Link key={link.href} href={link.href} className={isNavActive(pathname, link.href) ? "cur" : undefined}>
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
        <button
          type="button"
          className="app-burger"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="app-mobile-nav"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24"><use href={mobileOpen ? "#i-close" : "#i-menu"} /></svg>
        </button>
      </div>
      <nav id="app-mobile-nav" className={`app-mobile-nav${mobileOpen ? " open" : ""}`}>
        {APP_NAV.map((link) => (
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
