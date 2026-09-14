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
| `credentials.test.ts` | 1–6 (login decision logic), rate limiting |
| `tokens.test.ts` | 7, 8, 9, 10, 15 (token lifecycle, account setup, raw-token storage) |
| `authorize.test.ts` | 11, 12, 13, 14 (session/role authorization) |
