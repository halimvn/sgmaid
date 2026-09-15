# SG Maid — Website & Employer Portal

Next.js (App Router) + TypeScript application for the SG Maid public website and employer dashboard.

## Status

**Phase 0 — Application Foundation** is complete: the project has been migrated from a
static, zero-build HTML site into a proper Next.js app, preserving the existing SG Maid
visual design and page content as closely as possible.

**Phase 1 / 1.5 — Database Foundation** is complete: a PostgreSQL data model (Prisma
schema, migrations, fictional dev seed data) is live on a real development database
(Supabase-hosted Postgres).

**Phase 2 — Authentication & Permissions** is complete: real Auth.js (v5) credentials
login, an invite-only employer account lifecycle (PENDING → password setup → ACTIVE),
server-side session validation re-checked against PostgreSQL on every request, and
genuine server-side protection on every `/dashboard/*` route.

**Phase 3 — Database-Driven Maid Profiles** is complete: `/dashboard/maids` and
`/dashboard/maids/[id]` now query PostgreSQL directly (server-side filtering, search,
pagination) through an employer-safe service layer that enforces its own authorization
and visibility rules — not just hidden navigation. `lib/data/mock-maids.ts` and the old
`types/maid.ts` have been removed; nothing in the app reads from them anymore.

**Phase 4 — Employer Shortlist** is complete: the "Shortlist" buttons on the maid
listing and detail pages are real Server Actions, `/dashboard/shortlist` reads the
authenticated employer's own rows from PostgreSQL, and one employer can never read,
add to, or remove from another employer's shortlist — enforced in the service layer
itself, not just by which links are shown.

**Phase 4.6 — Real Maid Data Pilot + Secure Biodata PDF** is complete: a single real
SG Maid candidate (a controlled pilot, not a bulk migration) has been imported
alongside the existing fictional profiles, and employers can securely view that
candidate's original biodata PDF through a private, signed-URL download flow. See
"Real maid data pilot & secure biodata storage (Phase 4.6)" below. See "What's next"
below.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts:

```bash
npm run build            # production build
npm run start             # run the production build
npm run lint               # ESLint
npm run typecheck        # tsc --noEmit
npm test                    # vitest — authentication/security unit tests
npm run dev:invite -- --name "Jane Tan" --email jane@example.test   # dev-only: create an employer + setup link
npm run dev:reset-link -- --email jane@example.test                # dev-only: create a password-reset link
npm run setup:maid-storage                                          # Phase 4.6: create the private Supabase Storage bucket
npm run import:real-maid -- --input path/to/local-only.json         # Phase 4.6: one-time real-candidate import
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
  login/page.tsx           /login — real Auth.js credentials login (Phase 2)
  setup-password/          /setup-password?token=… — employer account-setup (Phase 2)
    page.tsx, actions.ts
  reset-password/          /reset-password?token=… — password-reset completion (Phase 2)
    page.tsx, actions.ts
  api/auth/[...nextauth]/route.ts   Auth.js route handler — delegates to auth.ts
  dashboard/
    layout.tsx             app shell — calls requireEmployer() (Phase 2 server-side guard)
    not-found.tsx            on-brand 404 for a hidden/nonexistent maid id (Phase 3)
    dashboard.css           dashboard-only styles
    page.tsx                /dashboard — welcome + shortlist summary
    maids/page.tsx           /dashboard/maids — real Postgres listing: search, filters, pagination (Phase 3)
    maids/[id]/page.tsx      /dashboard/maids/:id — real Postgres profile detail (Phase 3)
    maids/[id]/biodata/route.ts   GET-only Route Handler: authorizes, then redirects to a
                              short-lived private Supabase Storage signed URL (Phase 4.6) —
                              never a Server Action, so "open PDF in a new tab" works
    shortlist/page.tsx        /dashboard/shortlist — the authenticated employer's own shortlist (Phase 4)

/components                shared UI: SiteHeader, SiteFooter, MobileBar, IconSprite,
                            dashboard/AppHeader, dashboard/MaidCard, dashboard/ShortlistCard,
                            site/FaqAccordion, LoginForm, SetupPasswordForm, ResetPasswordForm

/lib
  db.ts                      Prisma Client singleton (server-only — never import from a Client Component)
  maid-visibility.ts          Phase 3: THE central employer-visibility policy (profileStatus=ACTIVE,
                              availabilityStatus in AVAILABLE/RESERVED) — every employer-facing maid
                              query goes through this, never a duplicated inline filter
  services/
    maids.ts                  Phase 3: employer-safe maid data layer — calls requireEmployer() itself,
                              returns DTOs (EmployerMaidListItem/EmployerMaidProfile) via explicit
                              Prisma `select`, never a raw model or internalNotes
    shortlist.ts               Phase 4: employer-safe shortlist data layer — calls requireEmployer()
                              itself; every write is scoped to that employer's id, never a client-
                              supplied one. Reuses lib/maid-visibility.ts for "can this be newly
                              shortlisted", and keeps (not deletes) a Shortlist row if the maid later
                              becomes non-visible, presenting a generic "no longer available" state
    maid-documents.ts           Phase 4.6: getBiodataSignedUrl()/hasBiodataDocument() — calls
                              requireEmployer() AND re-checks lib/maid-visibility.ts before ever
                              looking up a MaidDocument row, and only requests a signed URL from
                              Supabase Storage after both checks succeed (never before)
  storage/
    supabase-admin.ts           Phase 4.6: server-only ("server-only" import) Supabase Storage admin
                              client — service-role key never reaches a Client Component or bundle
  actions/
    shortlist.ts                Phase 4: "use server" wrappers (addMaidToShortlist/
                              removeMaidFromShortlist) bound to a maid id and used directly as
                              <form action={...}> — revalidates /dashboard/maids,
                              /dashboard/maids/[id], /dashboard/shortlist, /dashboard
  validation/
    maid-filters.ts            Phase 3: zod validation for /dashboard/maids search params (search,
                              nationality, age, experience, skill, availability, page) — invalid
                              values degrade to "no filter", never a Prisma error
    shortlist.ts                 Phase 4: zod validation for a maid id passed into a shortlist
                              operation — malformed input never reaches Prisma
    maid-id.ts                   Phase 4.6: shared maid-id shape validation (parseMaidId) — extracted
                              from validation/shortlist.ts so lib/services/maid-documents.ts can
                              reuse the exact same "malformed id fails safe" rule
  auth/                      Phase 2 authentication/security logic (all server-only)
    constants.ts             token TTLs, password rules, rate-limit thresholds — no magic numbers
    password.ts               bcryptjs hashing/verification
    tokens.ts                  single-use hashed tokens (account setup + password reset)
    credentials.ts             core login decision logic (used by auth.ts's Credentials provider)
    rate-limit.ts               persistent (Postgres-backed) login rate limiting
    account-setup.ts            PENDING + token → ACTIVE + password
    password-reset.ts            token → new password, bumps sessionVersion (revokes old sessions)
    authorize.ts                 evaluateAccess() + requireActiveUser()/requireEmployer()/requireAdmin()
    request-ip.ts                 best-effort client IP for rate limiting

auth.ts                     Auth.js (next-auth v5) config — Credentials provider, JWT sessions
scripts/
  create-dev-employer-invite.ts   DEV-ONLY: create/reset a PENDING employer + print a setup link
  create-dev-password-reset.ts     DEV-ONLY: print a password-reset link for an existing user
  setup-maid-storage-bucket.ts       Phase 4.6: idempotent one-time setup of the private Supabase
                              Storage bucket used for biodata PDFs — refuses to leave it public
  import-real-maid.ts                Phase 4.6: one-time, zod-validated import of a single real
                              candidate from a gitignored local JSON + PDF (see
                              `private-import-data/`, never committed) — not a bulk importer,
                              refuses to run with NODE_ENV=production

/prisma
  schema.prisma              PostgreSQL data model — maid/skill/training/shortlist/consultation/
                              enquiry models (Phase 1) + User.sessionVersion, UserAuthToken,
                              AuthTokenPurpose, LoginAttempt (Phase 2) + MaidDocument,
                              MaidProfile.heightCm/weightKg/maritalStatus/maidType,
                              EmploymentHistory.startYear/endYear (Phase 4.6)
  seed.ts                    fictional dev seed data — 18 maid profiles (Phase 1: 8, Phase 3: +10 for
                              pagination/filter testing) — see "Database (PostgreSQL + Prisma)" below.
                              The Phase 4.6 real pilot candidate is deliberately NOT here — see below
  migrations/                 20260914103655_init_sgmaid_database (Phase 1),
                              20260914104846_add_auth_foundation (Phase 2)
                              (Phase 3 and Phase 4 added no new migrations — the existing Shortlist
                              model, with its UNIQUE(employerId, maidId), already covered Phase 4)
                              20260915021704_add_maid_documents_and_real_data_fields (Phase 4.6)

prisma.config.ts             Prisma 7 CLI config (schema location, migrations path, seed command,
                              datasource URL for the CLI — separate from lib/db.ts's runtime config)

/tests                       vitest tests — lib/auth/** (Phase 2), lib/services/maids.ts /
                              lib/validation/maid-filters.ts (Phase 3), lib/services/shortlist.ts
                              (Phase 4), lib/services/maid-documents.ts (Phase 4.6, mocked Prisma +
                              mocked Supabase Storage, fictional fixtures only) — includes
                              real-database integration suites — see tests/README.md

/types
  next-auth.d.ts             Auth.js Session/JWT type augmentation

/public                     static assets served at the site root (logo images)
```

The original static HTML files (`index.html`, `about.html`, `services.html`,
`contact.html`, `dashboard.html`) are still present at the repo root as a reference
copy of the pre-migration design. They are inert as far as the Next.js app is
concerned and can be removed once the migration above is verified.

## Database (PostgreSQL + Prisma)

**1. Provide a PostgreSQL database.** Any Postgres 13+ instance works: a local install,
Docker, or a hosted provider (Supabase, Neon, Railway, RDS, etc). There is no shared or
default database for this project — you must point it at your own. (This project's own
development database is hosted on Supabase — Postgres only, not Supabase Auth.)

**2. Configure `DATABASE_URL` and `DIRECT_URL`.** Copy `.env.example` to `.env` and set
both. For a plain self-hosted Postgres they can be the same value:

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
DIRECT_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
```

For a pooled/serverless provider (Supabase, Neon), `DATABASE_URL` is the **pooled**
connection string (used by the running app — `lib/db.ts`) and `DIRECT_URL` is the
**direct** one (used by Prisma Migrate/CLI — `prisma.config.ts`); see the comments in
`.env.example` for exactly which Supabase dashboard fields map to which. Never commit
`.env` (it's gitignored) or put real credentials in `.env.example`.

**3. Run migrations** (creates all tables from `prisma/schema.prisma`):

```bash
npx prisma migrate dev
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
  seed) reads `DIRECT_URL` from `prisma.config.ts`, while the runtime `PrismaClient` in
  `lib/db.ts` gets `DATABASE_URL` via a `@prisma/adapter-pg` driver adapter.
- Never import `lib/db.ts` from a Client Component (`"use client"`) — it must only be
  reached from Server Components, Route Handlers, Server Actions, or scripts.

## Authentication (Auth.js v5, Phase 2)

Real credentials login is wired up. The employer account lifecycle is invite-only —
there is no public self-registration form:

```
SG Maid staff create/approve access → User row created, status=PENDING, passwordHash=null
  → one-time ACCOUNT_SETUP link generated
  → employer opens /setup-password?token=…, chooses a password
  → status becomes ACTIVE
  → employer logs in at /login
  → server-side session, re-validated against PostgreSQL on every /dashboard/* request
```

**Required env var:** `AUTH_SECRET` — generate a strong local value (`npx auth secret` or
`openssl rand -base64 33`) and put it only in your local `.env`. Never commit a real
value; `.env.example` has a placeholder only.

**There is no admin UI or transactional email provider yet.** To exercise the real
invitation/reset flow in development, use the dev-only scripts (refuse to run with
`NODE_ENV=production`, never print/store a real password):

```bash
npm run dev:invite -- --name "Jane Tan" --email jane@example.test --mobile "+65 9123 4567"
npm run dev:reset-link -- --email jane@example.test
```

Each prints a one-time local URL (`/setup-password?token=…` or `/reset-password?token=…`)
— open it in a browser to complete the flow. Tokens are single-use, expire (24h for
setup, 1h for reset), and only a SHA-256 hash of each is ever stored.

**Session design:** sessions are JWT-based (required by the Credentials provider) and
kept minimal — just the user id and a `sessionVersion` snapshot. Authorization never
trusts the session's cached role/status: `lib/auth/authorize.ts`'s `evaluateAccess()`
re-reads the `User` row from PostgreSQL on every protected request, so an
ACTIVE → SUSPENDED change (or a password reset, which bumps `sessionVersion`) takes
effect immediately, even for an already-issued, still validly-signed session.

**Route protection:** every `/dashboard/*` route shares `app/dashboard/layout.tsx`,
which calls `requireEmployer()` — a server-side check, not a client-side redirect — so a
non-ACTIVE or non-EMPLOYER visitor never receives the page's data in the first place.

**Tests:** `npm test` runs the authentication/security unit tests (see `tests/README.md`).

## Maid profiles (Phase 3)

`/dashboard/maids` and `/dashboard/maids/[id]` are backed by PostgreSQL, through
`lib/services/maids.ts`. That service — not just page-level navigation or hidden links —
is the actual privacy boundary: every exported function calls `requireEmployer()` itself
and only ever returns explicit DTOs built with Prisma `select`, so `internalNotes` (and
anything else not on the DTO) simply isn't in the object, not just hidden from the JSX.

**Visibility policy** (`lib/maid-visibility.ts`, the single source of truth): a maid
profile is employer-visible only when `profileStatus = ACTIVE` **and**
`availabilityStatus` is `AVAILABLE` or `RESERVED`. `DRAFT`/`INACTIVE` profiles and
`PLACED`/`UNAVAILABLE` availability are excluded from both the listing **and** direct
`/dashboard/maids/[id]` lookup — a guessed id for any of those returns the exact same
generic `notFound()` as a nonexistent one, revealing nothing about which case it was.

**Filters** (all server-side, via URL search params, validated in
`lib/validation/maid-filters.ts`): Age (bucketed), Experience (bucketed), Availability
(`AVAILABLE`/`RESERVED` only — a filter can never surface a hidden status), plus
free-text Search (name or candidate ID) and pagination (12/page).

**Phase 4.6.3 revised the filter structure**: Maid Type, Expertise, and Marital are
multi-select checkbox-chip groups (OR semantics within each — e.g. selecting both
Childcare and Cooking returns candidates with *either*), submitted the same
zero-client-JS way (a checked box's `name` just repeats in the query string). Expertise
is restricted to five approved employer-facing categories (Cooking, Eldercare,
Childcare, Infantcare, General Housekeeping) mapped onto the existing
`Skill.category` taxonomy — a `PET_CARE` category still exists in the schema for
already-seeded data but is deliberately not one of the five. Language is a new
multi-select filter whose *options* are computed dynamically from real,
normalized `MaidProfile.languages` values (`getEmployerVisibleLanguages()` in
`lib/services/maids.ts`) — never a hardcoded list, and spelling/naming variants (e.g.
"Bahasa"/"Indonesian") collapse into one canonical option. The single-value Nationality
dropdown was removed from the sidebar (every current candidate is Indonesian — a
one-option filter had no value to an employer), but `nationality` remains a real,
queryable `MaidProfile` field; the capability just isn't wired to a UI control anymore.

No `/api/maids` route was created — every consumer of maid data is a Next.js Server
Component that can call `lib/services/maids.ts` directly, and there's no mobile app or
third-party client yet that would need a REST endpoint.

## Shortlist (Phase 4)

The "Shortlist" button on `MaidCard` and the maid detail page, and "Remove" on
`/dashboard/shortlist`, are real Server Actions (`lib/actions/shortlist.ts`) backed by
`lib/services/shortlist.ts` — which, like the maid service, calls `requireEmployer()`
itself and derives the employer's identity only from that session, never from a
client-supplied `employerId`. Every write's `WHERE` clause is scoped to
`employerId = <that employer>`, so one employer's request can never touch another's row
regardless of what maid id is submitted.

Adding a maid re-checks Phase 3's visibility policy (`lib/maid-visibility.ts`) — only a
currently employer-visible maid can be newly shortlisted, and adding the same maid twice
is idempotent (`upsert` against the existing `UNIQUE(employerId, maidId)` constraint, no
duplicate row, no raw Prisma error surfaced). If a shortlisted maid's profile later
becomes DRAFT/INACTIVE or its availability moves to PLACED/UNAVAILABLE, the `Shortlist`
row is deliberately kept (not deleted) — the employer's saved history is preserved — but
`/dashboard/shortlist` falls back to a generic "This candidate is no longer available"
state with no nationality/age/experience/skills and no working "View Profile" link,
never revealing which internal status caused it.

No `/api/shortlist` route was created, for the same reason as `/api/maids` — every
caller is a Server Component or a Server Action.

## Real maid data pilot & secure biodata storage (Phase 4.6)

A **single** real SG Maid candidate has been imported as a controlled pilot, to prove
the extraction → schema → dashboard → secure-PDF pipeline before any bulk migration.
It coexists with the fictional seed profiles (which are still required for tests,
filters, pagination, and demos) — nothing fictional was removed or replaced.

**What changed in the data model:** `MaidProfile` gained `heightCm`, `weightKg`,
`maritalStatus`, and `maidType` (all optional) — the fields the reference dashboard
design actually needs; everything else from a biodata PDF (address, contact details,
health information, etc.) is deliberately **not** stored as structured, queryable data.
`EmploymentHistory.startDate`/`endDate` became nullable, with parallel `startYear`/
`endYear` fields added, because real biodata frequently gives only a year — the app
never fabricates a day/month to satisfy a `DateTime` column.

**Biodata PDFs are not files in this repo.** Each is uploaded to a **private** Supabase
Storage bucket (`SUPABASE_MAID_DOCUMENT_BUCKET`, default `maid-biodata`), addressed by
a new `MaidDocument` model that stores only a `storagePath` (e.g.
`{profileCode}/biodata.pdf`) — never a public URL, and `storagePath` never appears in
any employer-facing DTO. Employers open a PDF via `GET
/dashboard/maids/[id]/biodata`, which:

1. runs `requireEmployer()` (rejects logged-out/PENDING/SUSPENDED sessions),
2. re-checks Phase 3's `employerVisibleMaidWhere()` (a DRAFT/INACTIVE/hidden-
   availability maid's biodata cannot be requested even with a guessed id),
3. only then asks Supabase Storage for a **signed URL**, valid for 120 seconds, and
4. redirects the browser to it (opens in a new tab; never stored server- or client-side).

A signed URL is never generated before both checks pass — this is the property the
Phase 4.6 test suite (`tests/maid-documents-service.test.ts`) exists to prove, alongside
a live manual test that a URL genuinely expires and that logged-out/incognito requests
are rejected.

**Real-data import is a one-time script, not the seed file.** `scripts/import-real-maid.ts`
reads a gitignored local JSON (`private-import-data/`, never committed) plus the source
PDF, and upserts one `MaidProfile` — real candidate data never goes through
`prisma/seed.ts`. Anything ambiguous or conflicting in the source PDF (e.g. two
skills-assessment tables disagreeing on a single skill) was excluded from the import and
recorded in the maid's staff-only `internalNotes`, rather than guessed.

**New npm scripts:**

```bash
npm run setup:maid-storage    # one-time: create the private Supabase Storage bucket
npm run import:real-maid -- --input path/to/local-only.json   # one-time real-candidate import
```

**New environment variables** (see `.env.example` — names only, no real values ever
committed): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_MAID_DOCUMENT_BUCKET`.
This is Supabase **Storage**, unrelated to `DATABASE_URL`/`DIRECT_URL` — Prisma/Postgres
remains the only database layer; Supabase's own database client is not used anywhere in
this app.

## What's next (not yet built)

Per the agreed phased plan — none of the following exist yet:

- Consultation request submission, public enquiry submission
- `/api/enquiries` and `/api/consultations` — kept as two separate endpoints by design
  once built
- Admin UI (the `requireAdmin()` permission helper exists; no admin screens yet)
- Real transactional email delivery for account-setup/password-reset links (currently
  dev-only scripts — see "Authentication" above)
- Real maid photographs (the Phase 4.6 pilot candidate has no photo asset yet —
  `photoUrl` is left null rather than showing a scraped or generated substitute;
  `MaidCard`/detail page already render a real `photoUrl` when one exists)
- Bulk real-data import tooling — Phase 4.6 is a single-candidate pilot script only,
  by design; a general importer is a separate, later effort
- Consultation request submission is still fictional-data-only end to end (Phase 5,
  not started)

**Maid biodata must never be publicly accessible or checked into this repo** — see the
Phase 0 audit for the full security notes.
