# Database Adapter Abstraction — Requirements

## Functional Requirements

### FR-001: DatabaseAdapter Interface
The library MUST expose a `DatabaseAdapter` interface that abstracts SQL execution and Drizzle ORM access:

```typescript
interface DatabaseAdapter {
  /** Execute a SELECT query and return rows */
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  /** Execute a non-SELECT statement (INSERT, UPDATE, DELETE, DDL) */
  exec(sql: string, params?: unknown[]): Promise<void>;
  /** Get the Drizzle ORM instance */
  getDb(): AnyDrizzleInstance; // or ReturnType<typeof drizzle>
}
```

### FR-002: PgLiteAdapter Implementation
The library MUST provide a `PgLiteAdapter` that implements `DatabaseAdapter` by wrapping a `PGlite` instance.

### FR-003: Engine Context Supports Adapter
`SyncClientEngineContext` MUST accept an optional `adapter?: DatabaseAdapter` field alongside existing `pg` and `db` fields.

### FR-004: Engine Config Supports Adapter
`SyncClientEngineConfig` MUST accept an optional `adapter?: DatabaseAdapter` field.

### FR-005: Auto-Creation on Legacy Config
When `adapter` is NOT provided but `pg` and `db` ARE provided, the engine MUST auto-create a `PgLiteAdapter` internally. This ensures zero breaking changes.

### FR-006: Backward Compatible getPg()
`SyncClientEngine.getPg()` MUST continue to return `PGlite` in legacy mode. If running with a non-PGlite adapter, it MAY throw a clear error.

### FR-007: Migrate EntityStatusUpdater
`SyncEntityStatusUpdater` MUST accept `DatabaseAdapter` instead of `PGlite`, with internal fallback logic.

### FR-008: Migrate OperationLifecycleService
`SyncOperationLifecycleService` MUST accept `DatabaseAdapter` instead of `PGlite`, with internal fallback logic.

### FR-009: Migrate PushSyncService
`PushSyncService` MUST use `context.adapter` (or auto-created adapter) instead of `context.pg` when creating lifecycle services.

### FR-010: SqlExecutor Uses Adapter
`createSqlExecutor()` MUST prefer `context.adapter` over `context.pg` when both are present, maintaining backward compatibility.

### FR-011: Export New Types
`src/index.ts` MUST export `DatabaseAdapter`, `PgLiteAdapter`, and related types.

## Non-Functional Requirements

### NFR-001: Zero Breaking Changes
No consumer code in `packages/app` or `packages/backend` may require modification after this change.

### NFR-002: Type Safety
All changes MUST maintain TypeScript strict mode compliance. No `any` casts or `@ts-ignore`.

### NFR-003: No New Runtime Dependencies
No new npm dependencies may be added to `package.json`. The abstraction must work with existing optional peer dependencies.

### NFR-004: Clear Deprecation Path
`SyncClientEngineContext.pg` and `getPg()` SHOULD be marked as `@deprecated` in JSDoc to guide future migration.

## Validation Requirements

### VR-001: Browser Path Unchanged
Running the app in the browser with existing `pg`+`db` config must produce identical behavior.

### VR-002: TypeScript Build Clean
`bun run build` in `packages/drizzle-sync` must succeed with zero errors.

### VR-003: App TypeScript Clean
`bun run build` or type-check in `packages/app` must succeed with zero new errors.
