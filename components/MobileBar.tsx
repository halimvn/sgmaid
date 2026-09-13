import Link from "next/link";

/** Sticky mobile action bar shown at the bottom of marketing pages on small screens. */
export default function MobileBar() {
  return (
    <div className="mobile-bar">
      <a className="btn btn--whatsapp" href="/contact">
        <svg viewBox="0 0 24 24"><use href="#i-whatsapp" /></svg>
        WhatsApp
      </a>
      <Link className="btn btn--primary" href="/#find">Find Your Helper</Link>
    </div>
  );
}
