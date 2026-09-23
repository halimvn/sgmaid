/** Icon sprite for the employer dashboard app shell. */
export default function DashboardIconSprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <g id="i-menu" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></g>
        {/* Swapped in for i-menu on the mobile burger button once its
            drawer is open — see AppHeader.tsx / AdminHeader.tsx. */}
        <g id="i-close" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></g>
        <g id="i-search" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.3-4.3" /></g>
        <g id="i-logout" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></g>
        <g id="i-user" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="3.4" /><path d="M5.5 19.5c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /></g>
        <g id="i-info" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></g>
        <g id="i-check" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5 9.5 18 20 6" /></g>
        <g id="i-arrow" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h13M13 6l6 6-6 6" /></g>
        {/* Used by the maid-listing filter sidebar's chip-group labels
            (Maid Type/Expertise/Marital/Language) — see
            app/dashboard/maids/page.tsx. Missing here previously meant
            those <use href="#i-..."> references resolved to nothing, but
            still reserved their 15px+7px gap of layout space, making
            those labels look indented relative to Age/Experience/
            Availability. Paths copied verbatim from components/IconSprite.tsx. */}
        <g id="i-people" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3" /><path d="M3.5 19c0-3 2.4-5.5 5.5-5.5S14.5 16 14.5 19" /><circle cx="17" cy="8.5" r="2.4" /><path d="M15.5 13.4c.5-.15 1-.2 1.5-.2 2.6 0 4.5 2 4.5 4.8" /></g>
        <g id="i-star" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4l2.5 5 5.5.8-4 3.9.9 5.5L12 16.5 7.1 19l.9-5.5-4-3.9L9.5 9 12 4Z" />
        </g>
        <g id="i-heart" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20c-6-3.8-8.5-7-8.5-10.3A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.5 3.3C20.5 13 18 16.2 12 20Z" />
        </g>
        <g id="i-chat" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v6A2.5 2.5 0 0 1 17.5 15H9l-4 3.5V15H6.5" />
          <path d="M8 8h8M8 11h5" />
        </g>
      </defs>
    </svg>
  );
}
