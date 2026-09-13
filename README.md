# SG Maid — Website & Employer Portal

Next.js (App Router) + TypeScript application for the SG Maid public website and employer dashboard.

## Status

**Phase 0 — Application Foundation** is complete: the project has been migrated from a
static, zero-build HTML site into a proper Next.js app, preserving the existing SG Maid
visual design and page content as closely as possible. No backend exists yet — see
"What's next" below.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts:

```bash
npm run build       # production build
npm run start        # run the production build
npm run lint          # ESLint
npm run typecheck   # tsc --noEmit
```

## Project structure

```
/app
  layout.tsx              root layout (Poppins font, global metadata)
  globals.css              shared design tokens + primitives (buttons, cards, header, footer…)
  (site)/                  public marketing site — route group, no "/site" in the URL
    layout.tsx             header + footer + mobile bar shared by every public page
    site.css               marketing-only section styles (hero, promises, pricing, FAQ…)
    page.tsx               / — homepage
    about/page.tsx         /about
    services/page.tsx      /services
    contact/page.tsx       /contact
  login/page.tsx           /login — UI only, no auth wired up yet
  dashboard/
    layout.tsx             app shell (gate banner + header) — Phase 2 auth guard goes here
    dashboard.css           dashboard-only styles
    page.tsx                /dashboard — welcome + shortlist summary
    maids/page.tsx           /dashboard/maids — filters sidebar + helper listing
    maids/[id]/page.tsx      /dashboard/maids/:id — profile detail (placeholder)
    shortlist/page.tsx        /dashboard/shortlist — employer shortlist (placeholder)

/components                shared UI: SiteHeader, SiteFooter, MobileBar, IconSprite,
                            dashboard/AppHeader, dashboard/MaidCard, site/FaqAccordion

/lib
  data/mock-maids.ts        DEVELOPMENT/PLACEHOLDER helper data — no real biodata

/types
  maid.ts                    temporary frontend types (MaidProfile, MaidSkill, EmploymentHistoryEntry)

/public                     static assets served at the site root (logo images)
```

The original static HTML files (`index.html`, `about.html`, `services.html`,
`contact.html`, `dashboard.html`) are still present at the repo root as a reference
copy of the pre-migration design. They are inert as far as the Next.js app is
concerned and can be removed once the migration above is verified.

## What's next (not yet built)

Per the agreed phased plan — none of the following exist yet:

- PostgreSQL + Prisma (database)
- Auth.js credentials login, sessions, password hashing, route protection
- Real maid data (the dashboard currently shows placeholder cards only)
- Shortlist persistence
- `/api/enquiries` (public contact/enquiry forms) and `/api/consultations`
  (authenticated employer consultation requests) — kept as two separate endpoints
  by design once built
- Admin role / admin panel

**Maid biodata must never be publicly accessible or checked into this repo** — see the
Phase 0 audit for the full security notes.
