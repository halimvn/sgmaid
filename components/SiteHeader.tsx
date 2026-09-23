"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NAV_LINKS = [
  { href: "/about", label: "About Us" },
  { href: "/services", label: "Services" },
  { href: "/#helpers", label: "Our Helpers" },
  { href: "/contact", label: "Contact" },
];

/**
 * Shared marketing-site header. Current-page underline is derived from
 * the route automatically via usePathname(), replacing the per-page
 * "cur" class that used to be hand-set in each static HTML file.
 */
export default function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close on outside click / Escape — mirrors components/dashboard/AppHeader.tsx's
  // mobile drawer. Only wired up while the menu is actually open.
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
    <header className={`site-header${scrolled ? " scrolled" : ""}`} ref={headerRef}>
      <div className="header-in">
        <Link className="brand" href="/" aria-label="SG Maid home">
          <Image src="/sgmaid-logo-colored.png" alt="SG Maid" width={220} height={92} style={{ height: 48, width: "auto" }} priority />
        </Link>
        <nav className="nav">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={pathname === link.href ? "cur" : undefined}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="header-cta">
          <a className="btn btn--whatsapp" href="https://wa.me/6589983434" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24"><use href="#i-whatsapp" /></svg>
            WhatsApp Us Now
          </a>
          <Link className="btn btn--primary" href="/login">Find Your Helper</Link>
        </div>
        <button
          className="burger"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="site-mobile-nav"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24"><use href={mobileOpen ? "#i-close" : "#i-menu"} /></svg>
        </button>
      </div>
      <nav id="site-mobile-nav" className={`mobile-nav${mobileOpen ? " open" : ""}`}>
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
            {link.label}
          </Link>
        ))}
        <Link className="btn btn--primary" style={{ width: "100%" }} href="/login" onClick={() => setMobileOpen(false)}>
          Find Your Helper
        </Link>
      </nav>
    </header>
  );
}
