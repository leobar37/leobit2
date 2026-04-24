# Database Adapter Abstraction — Context

## Objective

Introduce a `DatabaseAdapter` abstraction into `@avileo/drizzle-sync` so the sync engine can run on database backends other than PGlite (e.g. SQLite on React Native) without breaking existing browser consumers.

## Verified Context

### Current Architecture

The `@avileo/drizzle-sync` package is organized as:

```
src/
├── core/       # Runtime-agnostic: types, interfaces, backoff, coalesce, events
├── pglite/     # Frontend: PullService, ChangeApplier, schema mapper
├── client/     # Client engine: SyncClientEngine, database-init, types
├── react/      # React: SyncProvider, hooks
└── server/     # Backend: SyncEngine (batch processing), handlers
```

### Existing Abstraction

`SqlExecutor` (`src/pglite/sql-executor.ts`) already provides a loose abstraction:

```typescript
interface SqlExecutor {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(sql: string, params?: unknown[]): Promise<void>;
}
```

**Already using SqlExecutor (loosely coupled):**
- `queue-repository.ts` — queue SQL operations
- `change-applier.ts` — applies server changes
- `change-strategies.ts` — insert/update/delete strategies
- `queue-queue.ts` — PgSyncQueue

**Directly using PGlite (tightly coupled):**
- `SyncClientEngineContext.pg: PGlite` — hardcoded in `client/types.ts`
- `SyncClientEngineConfig.pg?: PGlite` — config field
- `SyncClientEngine` — stores `private pg: PGlite` + exposes `getPg()`
- `SyncEntityStatusUpdater` — constructor takes `PGlite`
- `SyncOperationLifecycleService` — constructor takes `PGlite`
- `PushSyncService` — passes `context.pg` to lifecycle services
- `database-init.ts` — PGlite-specific initialization (OK to keep as-is)

### PGlite Peer Dependency

`package.json` declares `@electric-sql/pglite` as an **optional** peer dependency, but `SyncClientEngineContext` hardcodes the `PGlite` type.

### Service Pattern in App

`packages/app/app/lib/services/base-service.ts` exposes:
- `this.pg` — raw PGlite instance
- `this.db` — Drizzle ORM instance

Both are sourced from the engine via `SyncClientEngineLike` interface.

## Inferred Context

- The library was designed with PGlite-first and Drizzle-second. The `SqlExecutor` interface was a good start but was never promoted to the primary abstraction.
- The path to SQLite/React Native requires: (a) abstracting the DB driver, (b) keeping Drizzle ORM (which supports multiple backends), (c) making `getPg()` optional/deprecated.
- Backward compatibility is critical — the browser app must work with zero changes.

## Unknown / Open Questions

- Whether `database-init.ts` should eventually be abstracted too, or if each platform provides its own init. **Decision**: keep `database-init.ts` PGlite-specific; React Native will provide its own init that creates a `SQLiteAdapter`.
- Whether Drizzle ORM supports SQLite well enough for our schema. **Decision**: assume yes for planning; verify during SQLiteAdapter implementation (future task).

## Scope

**In scope:**
- Create `DatabaseAdapter` interface and `PgLiteAdapter` implementation
- Update `SyncClientEngineContext` to accept `adapter?: DatabaseAdapter`
- Update `SyncClientEngineConfig` to accept `adapter?: DatabaseAdapter`
- Migrate all internal components that use `PGlite` directly to use `DatabaseAdapter`
- Auto-create `PgLiteAdapter` when only `pg`+`db` is provided (backward compat)
- Export new types from `src/index.ts`
- Validate zero breaking changes in browser

**Out of scope:**
- Creating `SQLiteAdapter` (future work when React Native integration starts)
- Changing `database-init.ts` (PGlite-specific is fine)
- Any changes to `packages/app` or `packages/backend`
- Any changes to the sync protocol or conflict resolution

## Key Files Involved

```
packages/drizzle-sync/src/
├── core/
│   └── (new) database-adapter.ts
├── pglite/
│   ├── (new) pglite-adapter.ts
│   ├── sql-executor.ts          (modify)
│   ├── entity-status-updater.ts (modify)
│   ├── operation-lifecycle.ts   (modify)
│   ├── push-service.ts          (modify)
│   ├── queue-queue.ts           (modify — use adapter)
│   ├── change-applier.ts        (modify — use adapter)
│   └── change-strategies.ts     (no change — already uses SqlExecutor)
├── client/
│   ├── types.ts                 (modify — add adapter fields)
│   └── sync-client-engine.ts    (modify — auto-create adapter)
├── index.ts                     (modify — export new types)
└── package.json                 (no change)
```
