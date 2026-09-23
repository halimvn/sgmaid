/**
 * Shared inline SVG icon sprite for the marketing site.
 * Rendered once in the (site) layout; individual icons are referenced
 * elsewhere via <svg viewBox="0 0 24 24"><use href="#i-name" /></svg>.
 *
 * Consolidated from the icon <defs> blocks that were previously
 * duplicated inside every page's own inline <svg> sprite. Paths are
 * unchanged from the original design.
 */
export default function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <g id="i-child" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="6" r="2.6" /><path d="M8 10.5c-2.6 0-4 1.7-4 4v3h8v-3c0-2.3-1.4-4-4-4Z" />
          <circle cx="17" cy="10" r="2" /><path d="M17 13.5c-2 0-3 1.3-3 3v2.5h6v-2.5c0-1.7-1-3-3-3Z" />
        </g>
        <g id="i-elder" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="6" r="2.6" /><path d="M10 10.5c-2.7 0-4.3 1.8-4.3 4.3V19h5" /><path d="M13.5 19v-4l2.5-1" />
          <path d="M18.5 8.7c1 .9 1 2.4 0 3.3l-2.4 2.2-2.4-2.2c-1-.9-1-2.4 0-3.3.9-.8 2-.6 2.4.2.4-.8 1.5-1 2.4-.2Z" />
        </g>
        <g id="i-home" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 11 12 4l8 7" /><path d="M6 10v9h12v-9" />
          <path d="M12 18.5c2.5-1.7 3.6-3 3.6-4.4a1.9 1.9 0 0 0-3.6-.9 1.9 1.9 0 0 0-3.6.9c0 1.4 1.1 2.7 3.6 4.4Z" />
        </g>
        <g id="i-match" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="3" /><circle cx="16" cy="8" r="3" />
          <path d="M3 19c0-3 2.2-5 5-5s5 2 5 5" /><path d="M13.5 14.4c.8-.3 1.6-.4 2.5-.4 2.8 0 5 2 5 5" />
        </g>
        <g id="i-wallet" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8.5C4 7 5 6 6.5 6H17a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8.5Z" />
          <path d="M4 9h13" /><circle cx="16.5" cy="13" r="1.3" />
        </g>
        <g id="i-doorstep" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 20V9l7-5 7 5v11" /><path d="M10 20v-5h4v5" />
          <circle cx="12" cy="9.5" r="1.4" />
        </g>
        <g id="i-chat" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v6A2.5 2.5 0 0 1 17.5 15H9l-4 3.5V15H6.5" />
          <path d="M8 8h8M8 11h5" />
        </g>
        <g id="i-whatsapp" fill="currentColor" stroke="none">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.198.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.884 9.884zm8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
        </g>
        <g id="i-doc" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 3h7l4 4v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M13 3v5h5" />
          <path d="M8.5 14.5 11 17l4.5-5" />
        </g>
        <g id="i-check" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5 9.5 18 20 6" /></g>
        <g id="i-shield" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3 5 6v6c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6l-7-3Z" /><path d="M9 12l2 2 4-4.5" />
        </g>
        <g id="i-star" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4l2.5 5 5.5.8-4 3.9.9 5.5L12 16.5 7.1 19l.9-5.5-4-3.9L9.5 9 12 4Z" />
        </g>
        <g id="i-heart" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20c-6-3.8-8.5-7-8.5-10.3A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.5 3.3C20.5 13 18 16.2 12 20Z" />
        </g>
        <g id="i-clock" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></g>
        <g id="i-arrow" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h13M13 6l6 6-6 6" /></g>
        <g id="i-user" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="3.4" /><path d="M5.5 19.5c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /></g>
        <g id="i-people" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3" /><path d="M3.5 19c0-3 2.4-5.5 5.5-5.5S14.5 16 14.5 19" /><circle cx="17" cy="8.5" r="2.4" /><path d="M15.5 13.4c.5-.15 1-.2 1.5-.2 2.6 0 4.5 2 4.5 4.8" /></g>
        <g id="i-menu" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></g>
        {/* Swapped in for i-menu on the mobile burger button once its
            drawer is open, so the tap target visibly reads as "close"
            rather than staying a static hamburger — see SiteHeader.tsx /
            AppHeader.tsx / AdminHeader.tsx. */}
        <g id="i-close" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></g>
        <g id="i-pin" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21c4.5-4.5 7-8 7-11a7 7 0 0 0-14 0c0 3 2.5 6.5 7 11Z" /><circle cx="12" cy="10" r="2.5" /></g>
        <g id="i-info" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></g>
        <g id="i-plane" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13l6-1.5L15 4l2 1-4 8 5-1 2 2-6 3-2 4-2-1 1-4-3-3-3 1-1-2 3-2Z" /></g>
        <g id="i-ig" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="4" y="4" width="16" height="16" rx="4.5" /><circle cx="12" cy="12" r="3.6" /><circle cx="16.6" cy="7.4" r="1" fill="currentColor" stroke="none" /></g>
        <g id="i-fb" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 8.5H16V5.6c-.6-.1-1.6-.2-2.4-.2-2.4 0-3.9 1.4-3.9 4v2.1H7v3h2.7V21h3.2v-6.5H15l.4-3h-2.5v-1.6c0-.9.3-1.4 1.6-1.4Z" /></g>
        <g id="i-tt" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4c.4 2.3 1.9 3.9 4 4.2v3c-1.5 0-2.9-.4-4-1.2v6.2A5.8 5.8 0 1 1 8 10.6v3.2a2.7 2.7 0 1 0 2.8 2.7V4H14Z" /></g>
      </defs>
    </svg>
  );
}
