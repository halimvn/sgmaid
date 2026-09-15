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
| `authorize.test.ts` | Phase 2 #11, 12, 13, 14 (session/role authorization) |
| `maid-filters.test.ts` | Phase 3 #11, 12 (filter validation — pure, no DB) + Phase 4.6.3 #1–4, 8, 9 (Maid Type/Expertise/Marital/Language multi-select shape validation) |
| `maids-service.test.ts` | Phase 3 #1, 2, 8, 9, 10, 13 (service boundary, mocked Prisma) + Phase 4.6.2 photoUrl resolution |
| `maids-integration.test.ts` | Phase 3 #3–7 + filter/pagination checks + Phase 4.6.3 #1, 3, 4, 5, 6, 7, 10, 11 (Maid Type/Expertise/Marital/Language filters, combinations, and hidden-maid-overrides-filter, against real seed data) — **real database** (see file header) |
| `shortlist-service.test.ts` | Phase 4 #1, 2, 3, 8, 9, 10, 13, 14, 15 (service boundary, visibility-on-add, DTO privacy — mocked Prisma) |
| `shortlist-integration.test.ts` | Phase 4 #5, 6, 7, 11, 12 + Step 19 two-employer scenario + Step 14 status-transition — **real database** |
| `maid-documents-service.test.ts` | Phase 4.6 biodata-PDF security matrix (auth boundary, visibility, signed-URL ordering/expiry) — mocked Prisma + mocked Supabase Storage, fictional fixtures only |

`maids-integration.test.ts` and `shortlist-integration.test.ts` are the files here that hit the actual `sgmaid-dev` database (via `tests/setup.ts` loading `.env`) instead of a mock — deliberately, per the Phase 3/4 spec's requirement to verify the real Prisma query/service layer, not just a mocked stand-in for it. Each creates its own throwaway test `User` row(s) (deleted in `afterAll`); `shortlist-integration.test.ts` additionally flips one seeded maid's `availabilityStatus` temporarily for the Step 14 test and restores it in the same test's `finally` block. Neither leaves any seeded `MaidProfile` row changed after the suite finishes.
