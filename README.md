# SG Maid — Website & Employer Portal

Next.js (App Router) + TypeScript application for the SG Maid public website and employer dashboard.

## Status

**Phase 0 — Application Foundation** is complete: the project has been migrated from a
static, zero-build HTML site into a proper Next.js app, preserving the existing SG Maid
visual design and page content as closely as possible.

**Phase 1 — Database Foundation** is complete: a PostgreSQL data model (Prisma schema,
migrations setup, and fictional dev seed data) now exists. Nothing reads from it yet —
the dashboard still renders from `lib/data/mock-maids.ts`, and no login, API routes, or
frontend database integration exist yet. See "What's next" below.

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
  db.ts                      Prisma Client singleton (server-only — never import from a Client Component)

/prisma
  schema.prisma              PostgreSQL data model (User, MaidProfile, EmploymentHistory, Skill,
                              MaidSkill, TrainingModule, MaidTraining, Shortlist,
                              ConsultationRequest, Enquiry)
  seed.ts                    fictional dev seed data — see "Database (PostgreSQL + Prisma)" below

prisma.config.ts             Prisma 7 CLI config (schema location, migrations path, seed command,
                              datasource URL for the CLI — separate from lib/db.ts's runtime config)

/types
  maid.ts                    temporary frontend types (MaidProfile, MaidSkill, EmploymentHistoryEntry)

/public                     static assets served at the site root (logo images)
```

The original static HTML files (`index.html`, `about.html`, `services.html`,
`contact.html`, `dashboard.html`) are still present at the repo root as a reference
copy of the pre-migration design. They are inert as far as the Next.js app is
concerned and can be removed once the migration above is verified.

## Database (PostgreSQL + Prisma)

Phase 1 added the data model only — no API routes, auth, or frontend queries yet.

**1. Provide a PostgreSQL database.** Any Postgres 13+ instance works: a local install,
Docker, or a hosted provider (Supabase, Neon, Railway, RDS, etc). There is no shared or
default database for this project — you must point it at your own.

**2. Configure `DATABASE_URL`.** Copy `.env.example` to `.env` and set:

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
```

Never commit `.env` (it's gitignored) or put real credentials in `.env.example`.

**3. Run the first migration** (creates all tables from `prisma/schema.prisma`):

```bash
npx prisma migrate dev --name init_sgmaid_database
```

**4. Generate the Prisma Client** (also runs automatically after `migrate dev`, and
after `npm install`; run manually if you only edited the schema):

```bash
npx prisma generate
```

**5. Seed fictional development data** (varied nationalities, skills, availability
states, employment histories, and training-completion states — see `prisma/seed.ts`;
none of it is real candidate biodata, and no login-capable accounts are created):

```bash
npx prisma db seed
```

Notes:

- Prisma 7 moved the connection URL out of `schema.prisma` — the CLI (migrate/generate/
  seed) reads it from `prisma.config.ts`, while the runtime `PrismaClient` in `lib/db.ts`
  gets it via a `@prisma/adapter-pg` driver adapter. Both ultimately read the same
  `DATABASE_URL` env var; there's nothing extra to configure.
- Never import `lib/db.ts` from a Client Component (`"use client"`) — it must only be
  reached from Server Components, Route Handlers, or Server Actions, none of which
  query maid data yet.

## What's next (not yet built)

Per the agreed phased plan — none of the following exist yet:

- Auth.js credentials login, sessions, password hashing, route protection
- Any API routes (maid search/filter, shortlist, consultations, enquiries, admin CRUD)
- Frontend database integration — the dashboard still reads from
  `lib/data/mock-maids.ts`, not from the Prisma `MaidProfile` table
- Shortlist persistence (the `Shortlist` model exists; no add/remove logic yet)
- `/api/enquiries` (public contact/enquiry forms) and `/api/consultations`
  (authenticated employer consultation requests) — kept as two separate endpoints
  by design once built
- Admin role / admin panel

**Maid biodata must never be publicly accessible or checked into this repo** — see the
Phase 0 audit for the full security notes.
