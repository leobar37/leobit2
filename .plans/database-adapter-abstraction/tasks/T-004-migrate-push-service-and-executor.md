# T-004: Migrate Push Service and Executor to DatabaseAdapter

## Objective

Update `PushSyncService` to use `DatabaseAdapter` when creating lifecycle services, and update `createSqlExecutor()` to prefer `context.adapter`.

## Requirements

- FR-009: Migrate PushSyncService
- FR-010: SqlExecutor Uses Adapter
- NFR-001: Zero Breaking Changes

## Files to Modify

### 1. `packages/drizzle-sync/src/pglite/push-service.ts`

**Current constructor (line ~30):**

```typescript
constructor(
  private readonly context: SyncClientEngineContext,
  private readonly options: PushServiceOptions
) {
  this.queue = options.queue ?? new PgSyncQueue(context, { logger: options.logger });
  this.httpClient = options.httpClient;
  this.mutex = options.mutex ?? new SyncMutex();
  this.logger = options.logger ?? new NoOpLogger();
  this.autoRunner = options.autoRunner ?? new SyncAutoRunner();

  if (options.lifecycleService) {
    this.lifecycleService = options.lifecycleService;
  } else {
    const entityStatusUpdater = new SyncEntityStatusUpdater(context.pg, context.tenantId, {
      tenantColumn: context.tenantColumn,
    });
    this.lifecycleService = new SyncOperationLifecycleService(
      context.pg,
      context.tenantId,
      this.queue,
      entityStatusUpdater,
      { tenantColumn: context.tenantColumn }
    );
  }
}
```

**New constructor:**

```typescript
constructor(
  private readonly context: SyncClientEngineContext,
  private readonly options: PushServiceOptions
) {
  this.queue = options.queue ?? new PgSyncQueue(context, { logger: options.logger });
  this.httpClient = options.httpClient;
  this.mutex = options.mutex ?? new SyncMutex();
  this.logger = options.logger ?? new NoOpLogger();
  this.autoRunner = options.autoRunner ?? new SyncAutoRunner();

  if (options.lifecycleService) {
    this.lifecycleService = options.lifecycleService;
  } else {
    // NEW: use adapter if available, fallback to creating one from pg+db
    const adapter = context.adapter ?? new PgLiteAdapter(context.pg, context.db);

    const entityStatusUpdater = new SyncEntityStatusUpdater(adapter, context.tenantId, {
      tenantColumn: context.tenantColumn,
    });
    this.lifecycleService = new SyncOperationLifecycleService(
      adapter,
      context.tenantId,
      this.queue,
      entityStatusUpdater,
      { tenantColumn: context.tenantColumn }
    );
  }
}
```

### 2. `packages/drizzle-sync/src/pglite/sql-executor.ts`

**Update `createSqlExecutor()` (line ~48):**

```typescript
export function createSqlExecutor(context: SyncClientEngineContext): SqlExecutor {
  // NEW: prefer adapter if available
  if (context.adapter) {
    return {
      query: <T>(sql: string, params?: unknown[]) => context.adapter!.query<T>(sql, params),
      exec: (sql: string, params?: unknown[]) => context.adapter!.exec(sql, params),
    };
  }
  // Legacy fallback
  return new PgLiteSqlExecutor(context.pg);
}
```

**Note:** The inline adapter-to-SqlExecutor wrapper avoids needing `PgLiteAdapter` to implement `SqlExecutor` directly, keeping concerns separate.

### 3. `packages/drizzle-sync/src/pglite/queue-queue.ts`

**Update constructor (line ~21):**

```typescript
constructor(
  context: SyncClientEngineContext,
  options?: QueueOptions
) {
  const ctx = context;
  const opts = options;

  this.context = ctx;
  // NEW: prefer adapter's exec/query directly
  this.repository = new QueueRepository(
    createSqlExecutor(ctx),
    ctx.tenantId,
    ctx.tenantColumn
  );
  this.logger = opts?.logger;
}
```

No actual change needed here — `queue-queue.ts` already uses `createSqlExecutor(ctx)`. The change in `createSqlExecutor()` (above) handles it automatically.

### 4. `packages/drizzle-sync/src/pglite/change-applier.ts`

No change needed — already uses `createSqlExecutor(context)` which is updated in T-004.

## Acceptance Criteria

- [ ] `PushSyncService` creates `PgLiteAdapter` from `context.pg`+`context.db` when `context.adapter` is absent
- [ ] `PushSyncService` passes `DatabaseAdapter` to `SyncEntityStatusUpdater` and `SyncOperationLifecycleService`
- [ ] `createSqlExecutor()` prefers `context.adapter` over `context.pg`
- [ ] `queue-queue.ts`, `change-applier.ts`, `queue-repository.ts` work correctly through updated `createSqlExecutor()`
- [ ] TypeScript builds clean

## Validation

```bash
cd packages/drizzle-sync
bun run build
```

Verify no TypeScript errors.

## Notes

- The `PgLiteAdapter` import is needed in `push-service.ts`. Make sure it's available.
- `queue-queue.ts` and `change-applier.ts` require no direct changes — they benefit from the `createSqlExecutor()` update.
