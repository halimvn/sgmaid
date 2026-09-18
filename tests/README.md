# Automated tests

Run with `npm test` (or `npx vitest run`).

Scope: unit tests for the authentication/security **logic layer**
(`lib/auth/**`), against a mocked Prisma client — no real database, no
React rendering, no live Next.js server. This is deliberate:

- `lib/auth/credentials.ts`, `lib/auth/tokens.ts`, `lib/auth/account-setup.ts`,
  and `lib/auth/authorize.ts` are all written as plain, dependency-injectable
  functions specifically so they can be tested directly, independent of
  Auth.js/Next.js request machinery.
- The Next.js-specific wrapper behaviour (`app/dashboard/layout.tsx` calling
  `requireEmployer()`, the actual `redirect()` a real request would follow)
  is exercised via the manual end-to-end development test described in the
  Phase 2 completion report, using a running dev server — that's the right
  tool for verifying real HTTP redirects and cookies, not a unit test with
  mocked Next.js internals.

| File | Covers spec test # |
|---|---|
| `credentials.test.ts` | Phase 2 #1–6 (login decision logic), rate limiting |
| `tokens.test.ts` | Phase 2 #7, 8, 9, 10, 15 (token lifecycle, account setup, raw-token storage) |
| `authorize.test.ts` | Phase 2 #11, 12, 13, 14 (session/role authorization) + Phase 6 #1–5 (requireAdmin() boundary: logged-out, EMPLOYER, PENDING/SUSPENDED admin, ACTIVE admin) |
| `maid-filters.test.ts` | Phase 3 #11, 12 (filter validation — pure, no DB) + Phase 4.6.3 #1–4, 8, 9 (Maid Type/Expertise/Marital/Language multi-select shape validation) |
| `maids-service.test.ts` | Phase 3 #1, 2, 8, 9, 10, 13 (service boundary, mocked Prisma) + Phase 4.6.2 photoUrl resolution + Phase 4.6.5 Expertise summary (approved-category dedup, PET_CARE excluded) and short-profile DTO shape (no trainings/employmentHistory/raw skills) |
| `maids-integration.test.ts` | Phase 3 #3–7 + filter/pagination checks + Phase 4.6.3 #1, 3, 4, 5, 6, 7, 10, 11 (Maid Type/Expertise/Marital/Language filters, combinations, and hidden-maid-overrides-filter, against real seed data) + Phase 4.6.5 (short-profile DTO never exposes trainings/employmentHistory, while the underlying MaidTraining/EmploymentHistory/MaidSkill rows are confirmed still present in Postgres) — **real database** (see file header) |
| `admin-maids-service.test.ts` | Phase 6: admin service authorization boundary (every export rejects before touching Prisma/Storage — mocked), duplicate-profileCode handling, photo/PDF MIME+size validation (#16, 17), and the central language-normalization strategy — mocked Prisma + mocked Supabase Storage, fictional fixtures only |
| `admin-maids-integration.test.ts` | Phase 6 Step 26: the full admin lifecycle against real Postgres + real private Storage — create Draft (#6) → invisible to employer (#7, 18) → publish with Expertise/Marital/Language/a fictional biodata PDF (#9–14) → employer sees the short profile, biodata, and shortlist all work → omitting a requirement reverts a requested Active to Draft (#15) → re-saving never duplicates the row (#20) → Inactive makes it disappear again (#18, 19) → audit rows confirmed — **real database + real Storage**, fictional fixtures only, everything (User rows, MaidProfile, Storage object) deleted in `afterAll` |
| `shortlist-service.test.ts` | Phase 4 #1, 2, 3, 8, 9, 10, 13, 14, 15 (service boundary, visibility-on-add, DTO privacy — mocked Prisma) |
| `shortlist-integration.test.ts` | Phase 4 #5, 6, 7, 11, 12 + Step 19 two-employer scenario + Step 14 status-transition — **real database** |
| `maid-documents-service.test.ts` | Phase 4.6 biodata-PDF security matrix (auth boundary, visibility, signed-URL ordering/expiry) — mocked Prisma + mocked Supabase Storage, fictional fixtures only |
| `account-validation.test.ts` | Phase 7 #10, 14 (updateProfileSchema/changePasswordSchema shape validation — pure, no DB, no auth) |
| `account-service.test.ts` | Phase 7 #1–4, 6, 11–13, 15–18 (My Account service authorization boundary — logged-out/PENDING/SUSPENDED rejected; DTO never exposes passwordHash/sessionVersion; ownership — the Prisma `data`/`where` a malicious payload with extra role/status/id fields actually produces; wrong-current-password vs. correct-password bcrypt paths; sessionVersion increment) — mocked Prisma, real bcrypt hashing |
| `account-integration.test.ts` | Phase 7 #5–9, 12, 13, 15–18 against real Postgres: two fictional employers, Employer A's profile/password changes never touch Employer B's row, name/mobile update round-trips, email never changes, real bcrypt current-password verification, sessionVersion incremented and the old password stops verifying once changed — **real database** |

`maids-integration.test.ts`, `shortlist-integration.test.ts`, `admin-maids-integration.test.ts`, and `account-integration.test.ts` are the files here that hit the actual `sgmaid-dev` database (via `tests/setup.ts` loading `.env`) instead of a mock — deliberately, per the Phase 3/4/6/7 spec's requirement to verify the real Prisma query/service layer, not just a mocked stand-in for it. Each creates its own throwaway test `User` row(s) (deleted in `afterAll`); `shortlist-integration.test.ts` additionally creates its own throwaway `MaidProfile` fixtures (Phase 6.2) rather than depending on the live status of shared seed data; `admin-maids-integration.test.ts` additionally creates and deletes its own throwaway `MaidProfile` (and the one real Storage object it uploads). None leave any seeded `MaidProfile` row, or any of the real pilot profiles, changed after the suite finishes.

Server Actions (`app/dashboard/account/actions.ts`, and every other `actions.ts` in this project — `app/setup-password`, `app/reset-password`, `lib/actions/admin/maids.ts`) are deliberately **not** unit tested directly; they're thin orchestration over an already-tested service, and this project's established convention is to exercise that orchestration layer (real HTTP form submission, real redirects/cookies, real `useActionState` re-render behaviour) via manual/live browser testing instead of mocking Next.js/Auth.js internals just to satisfy a unit test.
