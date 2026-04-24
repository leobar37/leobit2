# T-003: Migrate Sync Internals to DatabaseAdapter

## Objective

Migrate `SyncEntityStatusUpdater` and `SyncOperationLifecycleService` to use `DatabaseAdapter` instead of `PGlite` directly.

## Requirements

- FR-007: Migrate EntityStatusUpdater
- FR-008: Migrate OperationLifecycleService
- NFR-001: Zero Breaking Changes

## Files to Modify

### 1. `packages/drizzle-sync/src/pglite/entity-status-updater.ts`

**Current signature (line ~19):**

```typescript
constructor(
  private pg: PGlite,
  private tenantId: string,
  options: EntityStatusUpdaterOptions = {}
)
```

**New signature:**

```typescript
import type { DatabaseAdapter } from "../core/database-adapter";

export interface EntityStatusUpdaterOptions {
  /** Column name for tenant filtering (default: "tenant_id") */
  tenantColumn?: string;
  /** Set of entity types whose tables track sync_status */
  trackedTables?: Set<string>;
}

export class SyncEntityStatusUpdater {
  private readonly tenantColumn: string;
  private readonly trackedTables: Set<string>;

  constructor(
    private adapter: DatabaseAdapter,
    private tenantId: string,
    options: EntityStatusUpdaterOptions = {}
  ) {
    this.tenantColumn = options.tenantColumn ?? "tenant_id";
    this.trackedTables = options.trackedTables ?? new Set();
  }

  async markSynced(operation: SyncOperationRecord): Promise<void> {
    const tableName = validateEntityTableName(operation.entity_type);
    if (!tableName) return;
    if (this.trackedTables.size > 0 && !this.trackedTables.has(tableName)) return;

    try {
      await this.adapter.exec(
        `UPDATE "${tableName}"
         SET sync_status = $1,
             sync_attempts = 0,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
           AND "${this.tenantColumn}" = $3`,
        ["synced", operation.entity_id, this.tenantId]
      );
    } catch (error) {
      console.warn(
        `Failed to update ${operation.entity_type} sync_status for ${operation.entity_id}:`
      );
    }
  }
}
```

### 2. `packages/drizzle-sync/src/pglite/operation-lifecycle.ts`

**Current signature (line ~26):**

```typescript
constructor(
  private pg: PGlite,
  private tenantId: string,
  private queue: ISyncQueue,
  private entityStatusUpdater: SyncEntityStatusUpdater,
  options: OperationLifecycleOptions = {}
)
```

**New signature:**

```typescript
import type { DatabaseAdapter } from "../core/database-adapter";

export class SyncOperationLifecycleService {
  private readonly tenantColumn: string;
  private readonly selfHealRules: Set<string>;
  private readonly errorClassifier: (error: string) => ClassifiedError;

  constructor(
    private adapter: DatabaseAdapter,
    private tenantId: string,
    private queue: ISyncQueue,
    private entityStatusUpdater: SyncEntityStatusUpdater,
    options: OperationLifecycleOptions = {}
  ) {
    this.tenantColumn = options.tenantColumn ?? "tenant_id";
    this.selfHealRules = options.selfHealRules ?? new Set();
    this.errorClassifier = options.errorClassifier ?? classifyError;
  }

  async getOperation(id: string): Promise<SyncOperationRecord | null> {
    const result = await this.adapter.query<SyncOperationRecord>(
      `SELECT *
       FROM sync_operations
       WHERE id = $1
         AND "${this.tenantColumn}" = $2`,
      [id, this.tenantId]
    );

    return result.rows[0] ?? null;
  }

  // ... rest of methods use this.adapter instead of this.pg
}
```

**Important:** Update ALL methods in `operation-lifecycle.ts` that use `this.pg` to use `this.adapter` instead. Methods to check:
- `getOperation()`
- `markCompleted()` (may call `this.entityStatusUpdater.markSynced()`)
- `markFailed()`
- `markConflict()`
- `selfHealOperation()`
- Any other method with `this.pg.query()` or `this.pg.exec()`

## Acceptance Criteria

- [ ] `SyncEntityStatusUpdater` constructor accepts `DatabaseAdapter`
- [ ] `SyncEntityStatusUpdater` uses `adapter.exec()` instead of `pg.query()`
- [ ] `SyncOperationLifecycleService` constructor accepts `DatabaseAdapter`
- [ ] `SyncOperationLifecycleService` uses `adapter.query()` and `adapter.exec()` throughout
- [ ] All existing method behaviors are preserved
- [ ] TypeScript builds clean

## Validation

```bash
cd packages/drizzle-sync
bun run build
```

Verify no TypeScript errors.

## Notes

- These are internal components. Their constructors are only called from `PushSyncService`. The consumer-facing API does not change.
- Pay special attention to `operation-lifecycle.ts` — it may have many `this.pg.query()` calls scattered across methods.
