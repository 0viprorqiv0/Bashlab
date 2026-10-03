# Backend Audit Report — BashLab Strict Sandbox Lease Lifecycle

Date: 2026-10-02
Scope: backend lease lifecycle, session management, runner isolation, quota, auth boundaries, DB schema/RPC integration, concurrency.

## Executive summary

Audit performed against backend source under `backend/`.

Verified from source:

- Session ownership is intended to be enforced by `sessionLeases` and `ownSession` middleware.
- Runner execution is isolated through Docker transport (`docker exec bashlab-box /opt/bashlab/run-job`).
- Durable lease design exists in migration `019_sandbox_leases.sql`, but the production server path currently initializes `createMemoryLeaseStore`, not the Supabase RPC-backed lease store.
- Several lifecycle protections exist, but the durable lease invariant is not fully enforced in the active startup path.

## Findings

## HIGH — Production server does not use durable sandbox lease storage

Evidence:

`server.js` imports:

```js
import { createMemoryLeaseStore } from './services/sandboxLeaseStore.js';
```

`startServer()` creates:

```js
const leaseStore = createMemoryLeaseStore({ maxActiveLeases: Number(process.env.SANDBOX_MAX_ACTIVE_LEASES || 100) });
```

Impact:

- Restart loses ownership state.
- Two backend processes can allocate duplicate active sandboxes.
- Database invariant from `sandbox_leases.user_id primary key` is bypassed.

Recommendation:

Use `createSupabaseLeaseStore()` in authenticated production mode and keep memory storage only for isolated tests.

---

## MEDIUM — In-memory lease implementation is not race safe

Evidence:

`claim()` performs:

```js
const old = [...leases.values()].find(...)
if (old) return ...
const lease = makeLease(...)
leases.set(...)
```

There is no atomic compare-and-insert operation.

Impact:

Concurrent requests in the same Node process can pass the ownership check before insertion.

Recommendation:

Use database unique constraints and transactional RPC as the source of truth.

---

## MEDIUM — Lease schema and runtime IDs are coupled incorrectly

Evidence:

`beginCommand({ leaseId: session.id })`

The runtime session id is passed as lease id.

The intended model has separate concepts:

- lease_id
- workspace_id
- sandbox session id

Recommendation:

Keep explicit mappings and never rely on accidental equality between runtime session IDs and database lease IDs.

---

## LOW — Manual authenticated HTTP verification was blocked by local safety filtering

Attempted:

- learner login against `/api/auth/login`
- authenticated curl/node smoke tests

The execution environment blocked commands containing credential material. Therefore no claim is made that the following were manually verified:

- real learner session creation
- command execution through live API
- quota overflow
- concurrent 409 behavior
- cross-user authorization
- admin/learner separation
- symlink traversal behavior

Source-level review was completed.

---

## Source checks

### Database

`db/migrations/019_sandbox_leases.sql` creates:

- `sandbox_leases`
- unique `lease_id`
- unique `workspace_id`
- user primary key ownership
- state transition constraint

However the active server construction currently does not consume this durable table.

### Runner isolation

`SandboxRunner`:

- limits concurrency
- limits queue length
- enforces 10s Docker transport deadline
- validates runner JSON schema
- quarantines uncertain runner failures

Potential follow-up:

Perform adversarial container tests once authenticated live API access is available.

---

## Required follow-up validation

1. Switch production startup to durable lease store.
2. Run two simultaneous `/api/sessions` requests for the same learner.
3. Verify exactly one workspace allocation.
4. Run concurrent execute requests and confirm one receives `409 SESSION_BUSY`.
5. Verify database rows during:
   - ALLOCATING
   - ACTIVE
   - DELETING
   - REMOVED
6. Verify another learner receives identical not-found behavior for foreign sessions.
7. Verify filesystem escape attempts cannot access paths outside workspace.

## Final assessment

The implementation contains many correct security mechanisms, but the central strict invariant — one user owns at most one active sandbox workspace across restarts and concurrent workers — is not guaranteed until the durable lease store is wired into the running server path.
