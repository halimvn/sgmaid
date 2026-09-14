# Phase 2 authentication/security tests

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
| `maid-filters.test.ts` | Phase 3 #11, 12 (filter validation — pure, no DB) |
| `maids-service.test.ts` | Phase 3 #1, 2, 8, 9, 10, 13 (service boundary, mocked Prisma) |
| `maids-integration.test.ts` | Phase 3 #3–7 + filter/pagination checks — **real database** (see file header) |

`maids-integration.test.ts` is the one file here that hits the actual `sgmaid-dev` database (via `tests/setup.ts` loading `.env`) instead of a mock — deliberately, per the Phase 3 spec's requirement to verify the real Prisma query/service layer, not just a mocked stand-in for it. It creates one throwaway test `User` row (deleted in `afterAll`) and reads the existing fictional `MaidProfile` seed data; it does not modify any seeded maid rows.
