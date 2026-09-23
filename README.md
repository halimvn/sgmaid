# SG Maid — Website & Employer Portal

Next.js (App Router) + TypeScript application for the SG Maid public website and employer dashboard.

## Status

**Phase 0 — Application Foundation** is complete: the project has been migrated from a
static, zero-build HTML site into a proper Next.js app, preserving the existing SG Maid
visual design and page content as closely as possible.

**Phase 1 / 1.5 — Database Foundation** is complete: a PostgreSQL data model (Prisma
schema, migrations, reference-data seed) is live on a real development database
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

**Phase 4.6 — Real Maid Data Pilot + Secure Biodata PDF** is complete: four real SG
Maid candidates (a controlled pilot, not a bulk migration) have been imported alongside
the (since-removed) fictional demo profiles, and employers can securely view a candidate's original
biodata PDF and (where supplied) photo through private, signed-URL delivery. The
employer-facing profile is a deliberately **short profile** — see "Real maid data pilot
& secure biodata storage (Phase 4.6)" below.

**Phase 6 — SG Maid Admin Dashboard: Maid Management** is complete: authorised SG Maid
staff (role `ADMIN`) can add, edit, publish, and retire maid profiles themselves at
`/admin`, without needing a script or direct database access for normal day-to-day
onboarding. See "Admin dashboard (Phase 6)" below.

**Phase 7 — Employer My Account** is complete: `/dashboard/account` lets an authenticated
employer view their account, edit Full Name/Mobile Number, and change their password —
username and access expiry stay read-only (see Phase 8). See "Employer My Account (Phase 7)"
below.

**Phase 8 — Staff-Created Client Access** is complete: SG Maid staff create employer/client
login access directly from `/admin/clients` — a username and a temporary password, active
immediately with a 3-day access window. Employers now log in with **username + password**,
never email; ADMIN staff are unaffected and still log in with email. See "Staff-created
client access (Phase 8)" below.

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
npm run dev:invite-admin -- --name "Staff Name" --email staff@sgmaid.example  # Phase 6: create the first/next admin
npm run dev:reset-link -- --email jane@example.test                # dev-only: create a password-reset link
npm run setup:maid-storage                                          # Phase 4.6: create the private Supabase Storage bucket
npm run import:real-maid -- --input path/to/local-only.json         # Phase 4.6: one-time real-candidate import (emergency/migration only — see Phase 6)
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
    account/                  /dashboard/account — Phase 7, employer "My Account"
      page.tsx, actions.ts    Personal Details / Security / Account sections; two
                              useActionState Server Actions (update profile, change
                              password) — see "Employer My Account (Phase 7)" below
  admin/                    Phase 6 — separate route tree from /dashboard, own experience
    layout.tsx               app shell — calls requireAdmin() (server-side guard, same pattern
                              as dashboard/layout.tsx's requireEmployer())
    admin.css                 admin-only styles (self-contained — not a dashboard.css import)
    page.tsx                  /admin — profile-count stats + Manage Maids / Add New Maid
    maids/page.tsx             /admin/maids — practical table: filter by Profile Status/
                              Availability/Maid Type, search by Name/Profile Code
    maids/new/page.tsx          /admin/maids/new — Add New Maid form (Server Action)
    maids/[id]/edit/page.tsx     /admin/maids/[id]/edit — same form, prefilled
    maids/[id]/page.tsx           /admin/maids/[id] — "Preview Employer Profile": the exact
                              short-profile card an employer would see, admin-authorized
                              (no DRAFT/Active restriction), never the full admin record
    maids/[id]/biodata/route.ts,
    maids/[id]/photo/route.ts     admin-gated equivalents of the employer document routes —
                              requireAdmin() + a fresh signed URL, no visibility check (an
                              admin must be able to preview a DRAFT profile's documents)
  post-login/page.tsx        role-aware landing after /login — requireActiveUser() + a fresh
                              DB read decides /admin vs /dashboard; role is deliberately never
                              in the client-visible session (see auth.ts), so this can't be a
                              client-side redirect

/components                shared UI: SiteHeader, SiteFooter, MobileBar, IconSprite,
                            dashboard/AppHeader, dashboard/MaidCard, dashboard/ShortlistCard,
                            dashboard/AccountDetailsForm, dashboard/ChangePasswordForm,
                            dashboard/AccountStatusCard (Phase 7 — My Account),
                            admin/AdminHeader, admin/MaidForm, MaidShortProfileCard (shared by
                            the employer profile page and the admin preview page — one
                            presentational component, not two hand-maintained copies),
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
    admin/maids.ts               Phase 6: admin maid-management data layer — every export calls
                              requireAdmin() itself (defense in depth beyond the layout guard);
                              create/update run Storage upload → Prisma transaction (MaidProfile
                              + MaidSkill + EmploymentHistory) → MaidDocument upsert → AuditLog,
                              in that order, since Storage can't join a Postgres transaction. A
                              requested ACTIVE that doesn't meet the minimum publish requirements
                              (Profile Code, Name, Maid Type, ≥1 Expertise, a Biodata PDF on
                              file) is saved as Draft instead, never silently published
  language-taxonomy.ts        Phase 4.6.3 / 6: the one normalizeLanguageLabel()/
                              parseAndNormalizeLanguages() used by both the employer Language
                              filter and admin data entry, so "Bahasa" and "Bahasa Indonesia"
                              are always the same stored value, never two
  storage/
    supabase-admin.ts           Phase 4.6: server-only ("server-only" import) Supabase Storage admin
                              client — service-role key never reaches a Client Component or bundle
  actions/
    shortlist.ts                Phase 4: "use server" wrappers (addMaidToShortlist/
                              removeMaidFromShortlist) bound to a maid id and used directly as
                              <form action={...}> — revalidates /dashboard/maids,
                              /dashboard/maids/[id], /dashboard/shortlist, /dashboard
    admin/maids.ts                Phase 6: createMaidAction/updateMaidAction/
                              updateMaidStatusAction — plain `action={fn}` Server Actions (no
                              useActionState/Client Component); a validation or duplicate-code
                              failure redirects back to the same form with `?error=...`, success
                              redirects to Edit with `?saved=1` (and `?publishGaps=...` if a
                              requested Active was held back as Draft)
  validation/
    maid-filters.ts            Phase 3: zod validation for /dashboard/maids search params (search,
                              nationality, age, experience, skill, availability, page) — invalid
                              values degrade to "no filter", never a Prisma error
    shortlist.ts                 Phase 4: zod validation for a maid id passed into a shortlist
                              operation — malformed input never reaches Prisma
    maid-id.ts                   Phase 4.6: shared maid-id shape validation (parseMaidId) — extracted
                              from validation/shortlist.ts so lib/services/maid-documents.ts can
                              reuse the exact same "malformed id fails safe" rule
    admin-maid.ts                 Phase 6: zod schema + FormData parser for the Add/Edit Maid form
                              (profileCode/name/DOB/maidType/maritalStatus/languages/height/
                              weight/yearsExperience/expertise/employmentHistory/statuses), plus
                              server-side photo/PDF MIME+size validators and the admin list's own
                              filter parser — never trusts browser `accept=` or client input
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
  create-dev-admin-invite.ts        Phase 6: DEV-ONLY: identical flow, role=ADMIN — the way to
                              create the first (and any subsequent) SG Maid staff account; reuses
                              the same invitation/password-setup architecture unchanged
  create-dev-password-reset.ts     DEV-ONLY: print a password-reset link for an existing user
  setup-maid-storage-bucket.ts       Phase 4.6/6: idempotent one-time setup of the private
                              Supabase Storage bucket used for biodata PDFs and photos — refuses
                              to leave it public; MIME allowlist widened in Phase 6.2 for images
  import-real-maid.ts                Phase 4.6: one-time, zod-validated import of a single real
                              candidate from a gitignored local JSON + PDF (see
                              `private-import-data/`, never committed) — not a bulk importer,
                              refuses to run with NODE_ENV=production. Kept as a controlled
                              migration/emergency tool (Phase 6 Step 30) — normal day-to-day
                              onboarding now goes through the Admin Dashboard instead

/prisma
  schema.prisma              PostgreSQL data model — maid/skill/training/shortlist/consultation/
                              enquiry models (Phase 1) + User.sessionVersion, UserAuthToken,
                              AuthTokenPurpose, LoginAttempt (Phase 2) + MaidDocument,
                              MaidProfile.heightCm/weightKg/maritalStatus/maidType,
                              EmploymentHistory.startYear/endYear (Phase 4.6) + AuditLog (Phase 6)
  seed.ts                    reference-data seed only — Skill + TrainingModule taxonomy, NO maid
                              profiles (the 18 fictional demo maids were removed) — see "Database" below.
                              The Phase 4.6 real pilot candidates are deliberately NOT here — see below
  migrations/                 20260914103655_init_sgmaid_database (Phase 1),
                              20260914104846_add_auth_foundation (Phase 2)
                              (Phase 3 and Phase 4 added no new migrations — the existing Shortlist
                              model, with its UNIQUE(employerId, maidId), already covered Phase 4)
                              20260915021704_add_maid_documents_and_real_data_fields,
                              20260915042936_add_profile_photo_document_type,
                              20260915045522_expand_maid_type_and_skill_categories (Phase 4.6)
                              20260915133049_add_audit_log (Phase 6)

prisma.config.ts             Prisma 7 CLI config (schema location, migrations path, seed command,
                              datasource URL for the CLI — separate from lib/db.ts's runtime config)

/tests                       vitest tests — lib/auth/** (Phase 2), lib/services/maids.ts /
                              lib/validation/maid-filters.ts (Phase 3), lib/services/shortlist.ts
                              (Phase 4), lib/services/maid-documents.ts (Phase 4.6, mocked Prisma +
                              mocked Supabase Storage, fictional fixtures only), lib/services/
                              admin/maids.ts (Phase 6, mocked-auth-boundary unit tests + a full
                              create→publish→deactivate real-database integration suite) —
                              includes real-database integration suites — see tests/README.md

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

**5. Seed reference data** (the Skill taxonomy and Training modules — see
`prisma/seed.ts`; it deliberately seeds **no maid profiles** and no login-capable
accounts. Add maids through the Admin Dashboard; tests create their own throwaway
fictional fixtures):

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
is restricted to a fixed set of approved employer-facing categories (Cooking, Eldercare,
Childcare, Infantcare, General Housekeeping, Care of Disabled) mapped onto the existing
`Skill.category` taxonomy — a `PET_CARE` category still exists in the schema for
already-seeded data but is deliberately not one of the approved categories. Language is a new
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
It originally coexisted with 18 fictional seed profiles; those demo profiles have since
been removed (seed.ts no longer creates them) — tests build their own throwaway fixtures.

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

## Admin dashboard (Phase 6)

`/admin` is a real, working operational tool: authorised SG Maid staff (`User.role =
ADMIN`) can add, edit, publish, and retire maid profiles themselves — **the point of
this phase is to remove the need for a script or direct database access for normal
day-to-day onboarding.** `scripts/import-real-maid.ts` still exists and is still the
right tool for a bulk/emergency migration, but it is no longer how a single new
candidate gets added week to week.

**Getting admin access.** There's no in-app "invite another admin" screen yet (same gap
as employer invitations — see "Authentication" above), so the first (and any
subsequent) admin account is created the same dev-only way an employer is:

```bash
npm run dev:invite-admin -- --name "Staff Name" --email staff@sgmaid.example
```

This reuses Phase 2's invitation/password-setup flow completely unchanged — `role:
"ADMIN"` is the only difference from the employer script, and `completeAccountSetup()`
never even looks at role. After setting a password at the printed `/setup-password`
link, sign in at `/login` as normal; `/post-login` reads the real (freshly re-checked)
role from PostgreSQL and lands an admin on `/admin`, an employer on `/dashboard` — this
decision is deliberately never made client-side, because `role` is deliberately not in
the session/JWT payload at all (see `auth.ts`).

**Security boundary** — same shape as the employer portal, doubled: `/admin/*` is a
separate route tree (`app/admin/layout.tsx`), not a role check bolted onto
`/dashboard`, guarded server-side by `requireAdmin()`. Every function in
`lib/services/admin/maids.ts` calls `requireAdmin()` itself too — the layout guard is
defense in depth, not the only check, exactly like the employer service layer.

**Add/Edit Maid form** (`/admin/maids/new`, `/admin/maids/[id]/edit` — one shared
component, `components/admin/MaidForm.tsx`) covers only the structured fields the
employer-facing short profile actually needs — it is deliberately **not** a
reproduction of the full FDW biodata questionnaire:

- Basic Information: Profile Code (unique), Name, Date of Birth (age is derived, never
  entered directly), Maid Type, Marital Status (or "Not Provided"), Languages
  (free-typed, normalized through the same `lib/language-taxonomy.ts` the employer
  filter uses — "Bahasa" and "Bahasa Indonesia" always collapse to one stored value),
  Height/Weight, Years of Experience.
- Expertise: the same approved categories as the employer filter — each maps to
  one "generic" `Skill` row (`cooking-general`, etc.; `general-housekeeping` is reused
  from the existing fictional-seed skill, not duplicated) rather than the fine-grained,
  cuisine/age-specific skills a real biodata import uses.
- Employment History: optional, year-precision only (never a fabricated exact date),
  four fixed row slots rather than a dynamically add-able list — a blank row is simply
  not saved, so the whole form stays a plain server `<form>` + Server Action with zero
  client JS, same convention as the employer filter sidebar.
- Profile Photo / Biodata PDF: server-validated MIME + size (JPEG/PNG/WEBP ≤8MB;
  PDF-only ≤10MB — never trusts the browser's `accept=`), uploaded to the same private
  `maid-biodata` Supabase Storage bucket and `MaidDocument` model Phase 4.6 already
  built (`PROFILE_PHOTO`/`BIODATA_PDF`) — no second storage architecture. Re-uploading
  replaces the existing object at the same path; nothing is ever written to `/public`
  and no public Storage URL is ever generated.
- Profile Status / Availability Status: a **new** profile always starts `DRAFT` +
  `UNAVAILABLE`, regardless of what the form's selects show — creating a profile never
  auto-publishes it. Requesting `ACTIVE` is validated against a minimum bar (Profile
  Code, Name, Maid Type, at least one Expertise, a Biodata PDF on file, and a Profile
  Photo on file); if it isn't met, everything typed is still saved, just with
  `profileStatus` held at `DRAFT` and a banner explaining exactly what's missing — never
  a silent publish, never a lost form.

**Preview Employer Profile** (`/admin/maids/[id]`) renders the exact same short-profile
card an employer would see — `components/MaidShortProfileCard.tsx` is shared between
the two pages, not two hand-maintained copies — fed by an admin-authorized query with no
visibility restriction (a `DRAFT` profile must be previewable before it's ever
publishable, which `getEmployerVisibleMaidProfile()` could never allow). Its Photo/View
Biodata PDF buttons hit admin-gated equivalents of the employer document routes
(`requireAdmin()` instead of `requireEmployer()`, same short-lived-signed-URL pattern,
no visibility check).

**Audit log.** A minimal `AuditLog` model (`actorId`, `action`, `maidId`, `createdAt`)
records `MAID_CREATED` / `MAID_UPDATED` / `PROFILE_STATUS_CHANGED` /
`AVAILABILITY_CHANGED` / `BIODATA_UPLOADED` / `PROFILE_PHOTO_UPLOADED` for every admin
write. No PDF/photo contents, no medical information, no passwords/tokens — just who did
what to which profile and when. Nothing in this phase reads it back through a UI; it
exists for a future admin activity view.

**Existing real pilot profiles** (DV155, DV154, SS122, SS123) are fully editable through
`/admin/maids/[id]/edit` like any other profile — editing one never re-imports or
duplicates it (`profileCode` uniqueness is enforced on every save).

## Employer My Account (Phase 7)

`/dashboard/account` lets a logged-in employer view their account, edit their own Full
Name/Mobile Number, and change their own password. No new `User` columns were needed —
`fullName`, `email`, `mobileNumber`, `passwordHash`, `status`, and `sessionVersion` all
already existed from Phase 2.

**Security boundary** — same defense-in-depth pattern as every other service in this
project: `app/dashboard/layout.tsx`'s `requireEmployer()` guards the route, and every
function in `lib/services/account.ts` calls `requireEmployer()` itself too, first. No
function there accepts a `userId` parameter at all — the employer identity used in every
read/write is always `employer.id` from that call, which is what makes it structurally
impossible for an employer to read or update another `User`'s row, regardless of what a
form submits. `updateEmployerProfile()` also never spreads its input into the Prisma
`data` object — it picks exactly `fullName`/`mobileNumber` — so even a payload
constructed to smuggle extra fields (`role`, `status`, `sessionVersion`, a different `id`)
can never reach the database write.

**Username and Email are both read-only here.** Since Phase 8, `username` is the login
identifier and is Admin-controlled only — a client can view it but never rename
themselves (see "Staff-created client access (Phase 8)" below). `email` is optional
contact information only, shown for reference; it is never used for employer login.

**Form UX.** Both forms (`components/dashboard/AccountDetailsForm.tsx`,
`ChangePasswordForm.tsx`) use `useActionState` rather than this project's other,
redirect-based Server Action convention (e.g. the admin Add/Edit Maid form) — a redirect
always drops whatever was typed, and a validation error here must leave the form exactly
as the employer left it. Full Name/Mobile Number are deliberately **controlled** inputs
backed by local `useState`, not `defaultValue`: an uncontrolled input was tried first and
found not to reliably survive a validation-error round trip, because the Server Action
also revalidates the parent Server Component, and that refresh can reset an uncontrolled
input back to its last-saved value — exactly the "form gets reset" bug this page must
avoid. Local state sidesteps that: nothing but the employer's own typing, or a
successful save, ever changes what's displayed.

**Change Password** verifies the current password with real bcrypt comparison before
touching anything, never reveals whether it was the current-password check or something
else that failed ("Current password is incorrect." either way), and — on success —
increments `sessionVersion` (the exact same revocation mechanism
`lib/auth/password-reset.ts`'s token-based reset flow already established) and then
calls the server-side `signOut()` immediately, since the session that just made the
request is now stale too. The employer lands back on `/login` with the same "Your
password has been reset. You can now sign in." banner the token-based flow already
shows, rather than a second, slightly different one.

**Account status** is shown as a friendly label ("Active", never the raw `ACTIVE` enum
value) and is read-only — role, status, and `sessionVersion` remain staff/system-
controlled and are never accepted as input anywhere in this flow. No account
deletion/deactivation exists yet — an intentional gap, pending an operational decision.

## Staff-created client access (Phase 8)

Revises how employers get portal access: SG Maid staff create it directly, rather than an
employer self-registering and setting their own password. This is a full replacement of
the employer login *identifier* (username instead of email), not just a new admin screen.

**Business flow:** Admin → `/admin/clients/new` → set a username + temporary password →
access starts immediately (`ACTIVE`, no `PENDING`/invite step) and expires automatically
72 hours later → staff hand the credentials to the client → the client logs in at
`/login` with **username + password** → `/dashboard` → Browse Helpers → Biodata →
Shortlist, exactly like before. After 72 hours, login and any already-open session are
both rejected until staff extend or reactivate access.

**Schema** (`prisma/schema.prisma`, migration `..._client_username_access_expiry`):
`User.username String? @unique`, `User.accessExpiresAt DateTime?`, `User.email` changed
from required to `String? @unique` (Postgres treats every `NULL` as distinct in a unique
index, so any number of employers can leave it blank). Four new `AuditAction` values
(`CLIENT_ACCESS_CREATED/EXTENDED`, `CLIENT_PASSWORD_RESET`, `CLIENT_STATUS_CHANGED`) and a
new `AuditLog.targetUserId` (same non-FK-on-purpose pattern as `maidId`).

**Username normalization** (`lib/auth/username.ts`) — trim + lowercase, charset
`[a-z0-9._-]`, 3–32 characters, stored already-normalized as the column value itself. A
case-insensitive lookup is then a plain unique-column equality match; no citext extension
needed. `"AhmadTan"` and `"ahmadtan"` are always the same account.

**One Credentials provider, two identifier shapes** (`lib/auth/credentials.ts`, `auth.ts`).
There is deliberately no separate admin login page. The single login field tries the
submitted value as a **username** first (an `@`-containing value can never normalize to a
valid username, so it never resolves this way); only if that finds nothing does it try the
value as an **email** — and even then, only an `ADMIN` row is ever accepted through that
path. An `EMPLOYER` row can never authenticate via its email, even if it has one on file
as optional contact info. ADMIN login is otherwise completely unchanged.

**Access expiry is enforced on every request, not just at login**
(`lib/auth/authorize.ts` `evaluateAccess()`): for role `EMPLOYER`, `accessExpiresAt` is
re-checked against the server clock alongside `status`/`sessionVersion` on every
`requireEmployer()` call — the same fresh-database-read model that already makes a status
change or password reset take effect immediately. An already-logged-in client whose 72
hours run out loses access on their very next request, automatically, across every
employer route and service (`/dashboard/*`, biodata/photo routes, shortlist) — because
every one of them already calls `requireEmployer()` itself as its own privacy boundary.
`ADMIN` accounts have no `accessExpiresAt` and are never subject to this.

**An expired client is never deleted** — the spec is explicit about this: shortlist
ownership and audit history must remain traceable, and staff must be able to reactivate.
`/admin/clients/[id]/edit` → **Extend Access by 3 Days** adds 72h to the *current* expiry
if it hasn't passed yet, or to *now* if it has (reactivation) — server time only, never a
client-submitted date.

**Password handling.** Staff type the password directly (it is never generated or
retrievable later); `lib/services/admin/clients.ts` hashes it with bcrypt immediately and
only ever holds the hash from that point on. The one place a plaintext password is shown
back to staff is the create-client success screen
(`components/admin/CreateClientForm.tsx`) — a `useActionState` Client Component, not this
project's usual redirect-based admin form convention, specifically so the password can be
displayed from the *same request's* in-memory state and never touch a URL, cookie, or
anything re-readable after the page is left. **Reset / Set New Password** on the edit page
immediately bumps `sessionVersion`, signing the client out everywhere.

**Audit trail** — `CLIENT_ACCESS_CREATED`, `CLIENT_ACCESS_EXTENDED`,
`CLIENT_PASSWORD_RESET`, `CLIENT_STATUS_CHANGED` rows store the acting admin, the target
client, the action, and a timestamp — never a password or its hash.

**Migration note.** The one pre-existing fictional demo employer account
(`demo.employer@sgmaid-demo.example`) was assigned an explicit test username
(`demoemployer`) and a fresh 72h window so it stays usable. `scripts/create-dev-employer-invite.ts`
(the old self-service invite flow) is kept for its still-useful token architecture but no
longer produces a working employer login on its own, since it never sets a `username`; use
`/admin/clients/new` for a real test employer.

## What's next (not yet built)

Per the agreed phased plan — none of the following exist yet:

- Consultation request submission, public enquiry submission
- `/api/enquiries` and `/api/consultations` — kept as two separate endpoints by design
  once built
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
