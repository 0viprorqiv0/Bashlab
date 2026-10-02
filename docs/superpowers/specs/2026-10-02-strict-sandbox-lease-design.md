# Strict Sandbox Lease Design

## Goal

Enforce the backend invariant: one authenticated learner has at most one lease, one logical sandbox instance, one physical workspace, and one running command.

## Source of truth

`sandbox_leases.user_id` is the primary key. PostgreSQL, not a process-local `Map` or the filesystem, owns lifecycle state. A lease row remains reserved in every nonterminal state, including allocation, reset, failure, and deletion.

## Data model

Each row contains a `lease_id`, immutable `workspace_id` for its current physical generation, bound `lesson_id`, state, operation token, timestamps, and command state. A removed workspace can receive a new generation only after deletion completed and the row records `REMOVED`; there is never more than one directory for the row at a time.

States are `ALLOCATING`, `ACTIVE`, `RESETTING`, `COMMAND_RUNNING`, `DELETING`, `FAILED`, and `REMOVED`.

## Lifecycle

`POST /api/sessions` remains the compatibility activation endpoint. The caller identity comes only from the validated JWT.

- Same active lesson returns the existing lease/session.
- A different lesson reserves `RESETTING`, resets that same workspace, and rebinds it on success.
- A new or removed lease reserves `ALLOCATING`, creates only its recorded workspace, then becomes `ACTIVE`.
- Any filesystem failure becomes `FAILED`; recovery or cleanup operates on the recorded workspace and never allocates another one.
- Reaping reserves `DELETING`, removes that directory, then marks `REMOVED`.

The database operation is short and does not hold a database transaction while filesystem work or a runner command is active. Its persisted state is the cross-process reservation.

## Runtime

`SessionManager` remains the local workspace and sandbox-execution manager, but must attach/create a session with a database-provided `lease_id`; it does not generate user ownership. A database lease is reattached after API restart using the same recorded workspace. A command transitions the lease to `COMMAND_RUNNING` before runner submission and back to `ACTIVE` after a confirmed result.

## Capacity and authorization

Activation validates lesson visibility before reserving disk. `SANDBOX_MAX_ACTIVE_LEASES` defaults to 100. Rows in `ALLOCATING`, `ACTIVE`, `RESETTING`, `COMMAND_RUNNING`, `DELETING`, and `FAILED` count as allocated resources; only `REMOVED` frees a slot. Existing owner/admin authorization rules remain intact.

## Compatibility and non-goals

Current `/api/sessions` routes and response shape remain available to the frontend. Progress and `practice_sessions` remain audit/progress data only, not lease authority. This change does not add Redis, a distributed command queue, persistent volume, per-user container, or a benchmark feature.

## Acceptance criteria

- Parallel activation and retry for one user returns one lease/session ID and leaves one workspace directory.
- Switching lessons preserves the lease/session ID and resets/rebinds its single workspace.
- A failed allocation does not permit a second workspace.
- Reaper/delete and activation cannot overlap into two workspaces.
- An authenticated user cannot run two commands on its lease concurrently.
- Restart recovery reuses the recorded lease/workspace and does not create another.
