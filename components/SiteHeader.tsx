"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`site-header${scrolled ? " scrolled" : ""}`}>
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
          <a className="btn btn--whatsapp" href="/contact">
            <svg viewBox="0 0 24 24"><use href="#i-whatsapp" /></svg>
            WhatsApp an Expert
          </a>
          <Link className="btn btn--primary" href="/#find">Find Your Helper</Link>
        </div>
        <button
          className="burger"
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24"><use href="#i-menu" /></svg>
        </button>
      </div>
      <nav className={`mobile-nav${mobileOpen ? " open" : ""}`}>
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
            {link.label}
          </Link>
        ))}
        <Link className="btn btn--primary" style={{ width: "100%" }} href="/#find" onClick={() => setMobileOpen(false)}>
          Find Your Helper
        </Link>
      </nav>
    </header>
  );
}
