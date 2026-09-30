# E2E tests (Playwright)

Covers the app end-to-end against the **real** Supabase project
(`kwazvxygrvrggsmovpkl`) — no mocks. Requires `backend/.env` and
`frontend/.env.local` to be filled in (see [`../../../CONTEXT.md`](../../../CONTEXT.md)).

## Run

```bash
cd frontend
npx playwright install chromium   # once
npm run test:e2e                  # headless
npm run test:e2e:ui               # interactive UI mode
npm run test:e2e:report           # open the last HTML report
```

Starts (or reuses) two servers: `next dev` on `:3000` and the backend API on `:3001`
(`npm run start:api` in `backend/`, sandbox disabled). The API is started with high
per-IP auth rate limits for the suite; the per-account brute-force limit stays default.
The API is where login/register/reset/profile live, so most auth specs exercise it.

## What it touches

- **Creates/deletes disposable accounts** under `@bashlab-e2e.test` (via
  `SUPABASE_SERVICE_ROLE_KEY`) — `tests/e2e/support/supabaseAdmin.js` and
  `global-teardown.js` only ever act on that domain, as a safety net against
  a typo touching a real account.
- **Never** touches the two real team accounts already in `profiles`
  (`xcao0356@gmail.com` admin, `xcao03567@gmail.com` learner) or real
  course/lesson content — tests that need admin content create their own
  disposable course/lesson and delete it in `afterAll`.
- Writes real rows to `admin_logs` and `practice_sessions` as a side effect
  of exercising the real RPCs — that's the point (see
  `permissions-rls.spec.js` and `admin-activity.spec.js`), and those rows
  are small/harmless to leave around, but sessions/log rows created *by the
  test itself* are cleaned up where practical.

## Structure

- `auth.setup.js` — Playwright "setup" project. Creates 4 fixture users
  (`learner`, `admin`, `target`, `locked`) once, logs `learner` and `admin`
  in through the real UI, and saves their browser storage state to
  `.auth/*.json` so spec files can start already authenticated instead of
  re-running the login flow every test. IDs/emails/passwords for all 4 are
  written to `.auth/users.json`.
- `global-teardown.js` — deletes all 4 fixture users after the run.
- `support/env.js` — reads Supabase URL/keys from `backend/.env` +
  `frontend/.env.local` (Playwright runs as plain Node, outside Next's env
  loading).
- `support/supabaseAdmin.js` — service-role client + `createTestUser`.
- `support/apiClient.js` — signs in as a given user and calls Supabase's
  REST/RPC endpoints directly with their access token, for tests that
  assert an RLS policy or an `admin_*` RPC boundary without going through
  the UI (`AdminGate` is UX-only by design — the RLS/RPC layer is the real
  boundary, see the comment in `components/admin/AdminGate.jsx`).
- `specs/api-auth.spec.js` — the `/api/auth/*` contract over HTTP (sessions, profile
  whitelist, lock, register/forgot neutrality, recovery-token rules, rate limits, CORS).
- `specs/auth-session-browser.spec.js` — browser behaviour: no direct Supabase Auth calls,
  reload/refresh/logout/lock, real emailed verify/recovery links (via `generateLink`).
- `specs/permissions-content.spec.js` — RLS for lessons/progress/practice sessions and the
  DB-enforced `lesson_content`/slug rules.
- `tools/measure-pages.js` (`npm run perf:pages`) — page-load timing against a production build.
- `specs/*.spec.js` — one file per area: auth, password recovery, course
  catalog/progress, permissions (the RLS/RPC boundary), admin content,
  admin users, admin activity, error pages. `workspace.spec.js` is a
  deliberate placeholder — the sandbox backend needs Linux/WSL.

## Why not just test through the UI for everything

`AdminGate` hiding a page is a UX nicety, not security — its own comment
says so. Testing permissions by only checking "does the 403 page render"
would pass even if every RLS policy in
`backend/db/migrations/006_rls_policies.sql` were accidentally dropped.
`permissions-rls.spec.js` calls the same REST/RPC endpoints the browser
calls, with a real learner/admin access token, so it fails if the database
boundary regresses — independent of anything the frontend does.
