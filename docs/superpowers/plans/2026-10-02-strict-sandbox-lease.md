# Strict Sandbox Lease Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace process-local sandbox ownership with a durable, strict, one-user-one-workspace lease lifecycle.

**Architecture:** PostgreSQL records one lease row per user and reserves every lifecycle transition; the filesystem only realizes the workspace recorded by that row. The Express API retains existing session endpoints while a lease coordinator attaches the local `SessionManager` to the DB-provided ID and serializes one command at a time.

**Tech Stack:** Node.js 22, Express 5, Supabase/PostgreSQL migrations and RPC, Node test runner, existing Bubblewrap runner.

**Spec:** `docs/superpowers/specs/2026-10-02-strict-sandbox-lease-design.md`

## Global Constraints

- One `user_id` has exactly one durable lease row; only `REMOVED` frees capacity.
- No filesystem operation may create a path not recorded by the lease.
- Keep `/api/sessions` compatibility; authorization always derives from the JWT.
- `SANDBOX_MAX_ACTIVE_LEASES` defaults to `100` and includes nonterminal resource states.
- All production changes follow red-green-refactor; do not add Redis, a persistent volume, or per-user containers.

---

### Task 1: Durable lease schema and store

**Files:**
- Create: `backend/db/migrations/019_sandbox_leases.sql`
- Create: `backend/src/services/sandboxLeaseStore.js`
- Test: `backend/tests/sandboxLeaseStore.test.js`

**Interfaces:**
- Produces `createMemoryLeaseStore({ maxActiveLeases, now })` for unit tests.
- Produces `createSupabaseLeaseStore({ admin, maxActiveLeases, now })` for runtime.
- Both implement `claim`, `finishAllocation`, `fail`, `beginCommand`, `finishCommand`, `beginDeletion`, `finishDeletion`, `getForUser`, and `expired`.

- [ ] **Step 1: Write failing lease-store tests**

```js
test('parallel claims for one user return one allocating lease', async () => {
  const store = createMemoryLeaseStore({ maxActiveLeases: 100 });
  const leases = await Promise.all(Array.from({ length: 20 }, () => store.claim({ userId: 'alice', lessonId: LAB_A })));
  assert.equal(new Set(leases.map(({ lease }) => lease.leaseId)).size, 1);
  assert.equal((await store.all()).length, 1);
});

test('a failed lease keeps its workspace reservation', async () => {
  const store = createMemoryLeaseStore();
  const { lease } = await store.claim({ userId: 'alice', lessonId: LAB_A });
  await store.fail({ userId: 'alice', leaseId: lease.leaseId });
  const retry = await store.claim({ userId: 'alice', lessonId: LAB_A });
  assert.equal(retry.lease.workspaceId, lease.workspaceId);
});
```

- [ ] **Step 2: Run the lease-store tests and confirm they fail because the module is absent**

Run: `node --test tests/sandboxLeaseStore.test.js`

- [ ] **Step 3: Add migration and minimal stores**

The migration creates `sandbox_leases` with `user_id uuid primary key`, unique `lease_id` and `workspace_id`, state check, `lesson_id`, `operation_token`, command fields, timestamps, RLS denial for browser roles, and service-role-only RPCs. The store returns a stable `leaseId/workspaceId` for existing non-removed rows and atomically denies claim number 101.

- [ ] **Step 4: Run focused tests and commit**

Run: `node --test tests/sandboxLeaseStore.test.js`

Commit: `git add backend/db/migrations/019_sandbox_leases.sql backend/src/services/sandboxLeaseStore.js backend/tests/sandboxLeaseStore.test.js && git commit -m "feat(sandbox): add durable user lease store"`

### Task 2: Session manager binds DB lease IDs to one workspace

**Files:**
- Modify: `backend/src/services/sessionManager.js`
- Test: `backend/tests/services.test.js`

**Interfaces:**
- `SessionManager.create({ id, workspaceId } = {})` creates or attaches only the supplied lease-backed workspace.
- `SessionManager.attach({ id, workspaceId })` validates/reuses the known workspace without a new random ownership ID.

- [ ] **Step 1: Write failing session-manager tests**

```js
test('attach reuses the lease workspace instead of allocating a second path', async () => {
  const manager = new SessionManager({ root });
  const first = await manager.create({ id: LEASE_ID, workspaceId: WORKSPACE_ID });
  const attached = await manager.attach({ id: LEASE_ID, workspaceId: WORKSPACE_ID });
  assert.equal(attached.workspacePath, first.workspacePath);
  assert.equal(manager.sessions.size, 1);
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `node --test tests/services.test.js --test-name-pattern="attach reuses"`

- [ ] **Step 3: Implement deterministic lease workspace attachment**

Derive workspace paths only from the validated lease `workspaceId`; reject a conflicting in-memory path. Keep existing quota, lock, reset, remove, and runner-facing fields.

- [ ] **Step 4: Run focused tests and commit**

Run: `node --test tests/services.test.js`

Commit: `git add backend/src/services/sessionManager.js backend/tests/services.test.js && git commit -m "feat(sandbox): bind sessions to lease workspaces"`

### Task 3: Lease-coordinated API lifecycle

**Files:**
- Modify: `backend/src/server.js`
- Modify: `backend/src/services/contentService.js`
- Modify: `backend/src/services/reaperService.js`
- Modify: `backend/src/services/metrics.js`
- Test: `backend/tests/api.auth.test.js`

**Interfaces:**
- `createApp` accepts injected `leaseStore`.
- Authenticated `POST /api/sessions` claims/reuses/resets the caller lease.
- Existing `/api/sessions/:id/*` routes resolve the caller lease before touching `SessionManager`.

- [ ] **Step 1: Write failing authenticated API tests**

```js
test('twenty simultaneous starts for one learner produce one session and workspace', async (t) => {
  const { call, manager } = await startApp(t, fakeAuth());
  const responses = await Promise.all(Array.from({ length: 20 }, () => call('alice', 'POST', '/api/sessions', { lessonId: LAB_A })));
  const bodies = await Promise.all(responses.map((response) => response.json()));
  assert.equal(new Set(bodies.map(({ sessionId }) => sessionId)).size, 1);
  assert.equal(manager.sessions.size, 1);
});

test('switching lesson resets and rebinds the existing lease session', async (t) => {
  const { call } = await startApp(t, fakeAuth());
  const first = await (await call('alice', 'POST', '/api/sessions', { lessonId: LAB_A })).json();
  const second = await (await call('alice', 'POST', '/api/sessions', { lessonId: LAB_B })).json();
  assert.equal(second.sessionId, first.sessionId);
  assert.equal(second.lessonId, LAB_B);
});
```

- [ ] **Step 2: Run focused API tests and confirm they fail**

Run: `node --test tests/api.auth.test.js --test-name-pattern="simultaneous starts|switching lesson resets"`

- [ ] **Step 3: Replace `owners`, `sessionLessons`, and `records` maps with lease coordination**

Validate lesson visibility before `leaseStore.claim`. On `allocate`, create the recorded workspace then call `finishAllocation`; on `reset`, lock/attach the recorded session, reset it, and finish the transition; on error call `fail` and preserve the row/path. Resolve ownership from `leaseStore`, not an ID map. `practice_sessions` remains an activity record and is opened/closed from the lease lifecycle. Add lease-state counters to `services/metrics.js`.

- [ ] **Step 4: Serialize execution and reaping through lease state**

Before `runner.run`, call `beginCommand`; reject a second command with `409 SESSION_BUSY`; in `finally`, call `finishCommand`. Reaper claims expired leases through `beginDeletion`, deletes only the recorded workspace, then calls `finishDeletion`.

- [ ] **Step 5: Run backend tests and commit**

Run: `npm test`

Commit: `git add backend/src/server.js backend/src/services/contentService.js backend/src/services/reaperService.js backend/src/services/metrics.js backend/tests/api.auth.test.js && git commit -m "feat(sandbox): coordinate sessions through durable leases"`

### Task 4: Runtime wiring, contract, and recovery tests

**Files:**
- Modify: `backend/.env.example`
- Modify: `backend/RUNNING.md`
- Modify: `backend/docs/API_CONTRACT.md`
- Modify: `backend/src/server.js`
- Test: `backend/tests/api.auth.test.js`
- Test: `backend/tests/services.test.js`

**Interfaces:**
- `SANDBOX_MAX_ACTIVE_LEASES` is parsed at startup with default `100`.
- Startup attaches active durable leases or marks interrupted command state as recoverable before new execution.

- [ ] **Step 1: Write failing recovery/capacity tests**

```js
test('the 101st distinct learner is rejected without a workspace', async (t) => {
  const { call, manager } = await startApp(t, fakeAuth(), { maxActiveLeases: 100 });
  for (let user = 0; user < 100; user++) assert.equal((await call(`u${user}`, 'POST', '/api/sessions', { lessonId: LAB_A })).status, 201);
  assert.equal((await call('u100', 'POST', '/api/sessions', { lessonId: LAB_A })).status, 503);
  assert.equal(manager.sessions.size, 100);
});
```

- [ ] **Step 2: Run focused tests and confirm they fail**

Run: `node --test tests/api.auth.test.js --test-name-pattern="101st distinct learner"`

- [ ] **Step 3: Wire production store and document contract**

Build the Supabase lease store in `servicesFromEnv`, inject it into `createApp`, document all state/error responses, and state that a restart reattaches the recorded workspace rather than allocating one. Remove stale documentation that calls the client lesson ID a verifier key or says sandbox endpoints are unauthenticated.

- [ ] **Step 4: Run full verification and commit**

Run: `npm test`

Commit: `git add backend/.env.example backend/RUNNING.md backend/docs/API_CONTRACT.md backend/src/server.js backend/tests/api.auth.test.js backend/tests/services.test.js && git commit -m "docs(sandbox): document strict lease lifecycle"`
