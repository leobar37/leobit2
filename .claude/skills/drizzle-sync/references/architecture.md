# Architecture Overview

## 8 Subpath Exports

| Subpath | Purpose | Key Classes/Modules |
|---------|---------|---------------------|
| `@avileo/drizzle-sync` | Main entry | `createSyncEngine`, `SyncEngineInstance` |
| `@avileo/drizzle-sync/core` | Runtime-agnostic | `ISyncQueue`, `ISyncHandler`, `ISyncLogger`, backoff, coalesce, events |
| `@avileo/drizzle-sync/shared` | Shared constants | `SYNC_STATUS_TRACKED`, `SELF_HEAL_INSERTABLE` |
| `@avileo/drizzle-sync/server` | Backend | `SyncEngine`, `BaseSyncHandler`, `HandlerRegistry`, conflict resolvers |
| `@avileo/drizzle-sync/pglite` | Frontend | `PullService`, `applyChange`, `applyChangesBatch`, schema mapper |
| `@avileo/drizzle-sync/react` | React | `SyncProvider`, hooks, `SyncReactRuntime` |
| `@avileo/drizzle-sync/config` | Config + codegen | `defineSyncConfig`, validators, generators |
| `@avileo/drizzle-sync/client` | Frontend client | `createSyncClient`, `PendingData`, `SyncClientEngine` |

## Dual API Pattern (Legacy → Generic Migration)

Two parallel APIs coexist:

**Legacy (static):**
```typescript
HandlerRegistry.register("sales", factory);
const handler = HandlerRegistry.getHandler("sales", deps);
```

**Generic (instance-based) — preferred:**
```typescript
const registry = new GenericHandlerRegistry<TEntity>(deps);
registry.register("sales", factory);
const handler = registry.getHandler("sales");
```

**Same dual pattern applies to:** `ConflictResolverRegistry` / `GenericConflictResolverRegistry`.

`SyncEngine` still uses the static registry internally (`src/server/sync-engine.ts:374`).

## Key Classes

### Server-Side

- **`SyncEngine`** (`sync-engine.ts:88`) — Orchestrates batch processing. Uses per-operation savepoints for partial rollback. Emits `push:complete` and `conflict:detected` events.
- **`BaseSyncHandler`** (`base-handler.ts:46`) — Abstract base for entity handlers. Extracts PostgreSQL errors via `error.cause` chain traversal. Classifies errors into 6 categories. Has `ensureParentExists` with registry optimization.
- **`EntityRegistry`** (`entity-registry.ts`) — Tracks which entities were created/modified/deleted within the current batch. Used by `ensureParentExists` to skip DB lookups when parent was created in same batch.
- **`OperationSorter`** (`operation-sorter.ts:23`) — Sorts by syncGroupId first, then entity priority, then timestamp.

### Client-Side (PGlite)

- **`PullService`** (`pull-service.ts:141`) — Cursor-based pagination, stale detection (MAX_STALE_PULLS=5, MAX_EMPTY_PULLS=3), exponential backoff, stage cursors for multi-stage loading.
- **`applyChange`** (`change-applier.ts:70`) — Raw SQL change application with retry. Supports deprecated `_db` overload signature.
- **`SchemaMapper`** (`schema-mapper.ts`) — `VALID_TABLES` (17 tables), `TABLE_COLUMNS` per table, `toSnakeCase` conversion, relation field detection.

### React Integration

- **`SyncProvider`** (`provider.tsx:55`) — Accepts sync or async factory. Dual context: `SyncRuntimeContext` + `SyncStateContext`. Throws to error boundary if init fails.
- **8 Hooks** (`hooks.ts`): `useSyncState`, `useSyncStatus`, `useSyncLifecycle`, `useSyncEvent`, `useSyncLogs`, `useSyncConflicts`, `useHasPendingSync`, `useHasFailedSync`, `useIsSyncStuck`

## Avileo Entities (Source of Truth)

The authoritative entity configuration is in `packages/backend/src/sync.config.ts`.

Entity relations are passed to `SyncEngine` via `entityRelations` config, which `OperationSorter` uses for FK-based topological sorting.

## Known Migration Gaps

- `src/server/sync-engine.ts:374` — still uses static `HandlerRegistry.getHandler`
- Generators in `src/config/generators/` — `applier-generator`, `zod-generator`, `hooks-generator`, `ddl-generator` — **not integrated; unused outside their own module**
- `toSnakeCase` (`schema-mapper.ts:203`) — **known bug**: consecutive uppercase acronyms are mis-converted (`customerID` → `customer_i_d`)
- Error messages in `classifyError` (`base-handler.ts:174`) — mixed Spanish/English strings
