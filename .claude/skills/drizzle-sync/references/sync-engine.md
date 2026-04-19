# Sync Engine (Server)

## Batch Processing Flow

`SyncEngine.processBatch()` at `sync-engine.ts:115`:

1. Sort operations via `OperationSorter` (syncGroupId → priority → timestamp)
2. Open DB transaction
3. For each operation:
   - Create savepoint `sp_op_{index}`
   - Call `processOperation()`
   - On success: release savepoint, register in `EntityRegistry`
   - On failure: rollback to savepoint (only that op fails)
4. On transaction error: all remaining ops marked failed
5. Emit `push:complete` event with summary

## processOperation Details

At `sync-engine.ts:266`:

1. **Idempotency check** — if `existingOp.status === "processed"`, return success immediately
2. **Conflict detection** — `ConflictResolverRegistry.getResolver(entityType).checkConflict()` — if `hasConflict: true`, persist to `syncConflictRepo` and return conflict result
3. **Insert/update operation** into `sync_operations` table
4. **Execute handler** — `HandlerRegistry.getHandler(entityType, deps).execute()`
5. **Update operation status** to `processed` or `failed`
6. **Inject syncStatus: 'synced'** into payload before saving

## Conflict Resolution

Two implementations:

- **`BaseVersionConflictResolver`** (`conflict-resolver.ts:17`) — abstract base; compares `serverVersion > localVersion`. Returns `{ hasConflict: true, serverVersion, serverData }`.
- **`NoOpConflictResolver`** (`conflict-resolver.ts:96`) — always returns `{ hasConflict: false }`.

Strategies: `last-write-wins`, `first-write-wins`, `version-based`, `merge`, `manual`.

Conflict result in response:
```typescript
{ idempotencyKey, success: false, conflict: { serverVersion, serverData }, serverTimestamp }
```

## Operation Coalescing

Located in `core/coalesce.ts`. Rules:

| Existing | Incoming | Result |
|----------|----------|--------|
| create | create/update | merge into create (deep merge payloads) |
| create | delete | cancel (never existed on server) |
| update | update | merge into update (deep merge payloads) |
| update | delete | replace with delete |
| delete | create | replace with update (recreate) |
| anything else | — | no coalescing |

Functions: `getCoalescePlan()`, `canCoalesce()`, `deepMerge()`, `mergeArrayById()`.

## Backoff

`core/backoff.ts`: Exponential backoff with jitter.

- Base: 1000ms, Max: 30000ms, Multiplier: 2
- Jitter: `delay * (0.5 + Math.random() * 0.5)` — non-deterministic
- Key functions: `calculateBackoffDelay()`, `withRetry()`, `isTransientError()`

Transient patterns: `database is locked`, `SQLITE_BUSY`, `connection`, `timeout`, `deadlock`, `network`, `fetch failed`, `abort`, `offline`.

## Events

`core/sync-events.ts`: `createSyncEventEmitter()` returns typed emitter.

Emitted events:
- `push:complete` — `{ operationsProcessed, succeeded, failed, conflicts, timestamp, batchCorrelationId }`
- `push:error` — `{ error, operationId, timestamp }`
- `conflict:detected` — `{ entityType, entityId, clientVersion, serverVersion, timestamp, correlationId }`
- `pull:complete` — `{ changesApplied, entityTypes, hasMore, timestamp }`
- `pull:stale` — `{ consecutiveStalePulls, reason, timestamp }`
- `pull:error` — `{ error, consecutiveFailures, timestamp }`

## BaseSyncHandler

Abstract class at `base-handler.ts:46`:

- `executeOperation()` — dispatches create/update/delete to handlers
- `extractPostgresError()` — walks `error.cause` chain for `.code`, `.detail`, `.routine`
- `classifyError()` — 6 categories: VALIDATION_ERROR, NOT_FOUND, CONFLICT, DATABASE_ERROR, NETWORK_ERROR, UNKNOWN_ERROR
- `ensureParentExists()` — checks `EntityRegistry.wasCreated()` first, then DB
- `validatePayload()` — Zod schema validation per operation type

**NOTE**: `classifyError` hardcodes Spanish strings (`"requiere"`, `"no encontrado"`, `"no existe"`) alongside English — inconsistency to be aware of.

## Savepoint SQL (Injected)

`SyncEngine` requires these 3 SQL generators injected via config:
- `savepointSql(name)` → e.g., `SAVEPOINT sp_op_0`
- `releaseSavepointSql(name)` → e.g., `RELEASE SAVEPOINT sp_op_0`
- `rollbackSavepointSql(name)` → e.g., `ROLLBACK TO SAVEPOINT sp_op_0`
