---
name: avileo-sync
description: |
  Analyze, debug, and extend Avileo's offline-first sync engine. Use when:
  - Finding bugs in push sync, pull sync, FK ordering, or conflict resolution
  - Adding new entities to the sync system (14 entities: customers, sales, sale_items, abonos,
    distribuciones, products, product_variants, tags, customer_tags, purchases, purchase_items,
    customer_groups, customer_group_members, visitas, suppliers)
  - Creating new sync handlers on backend
  - Debugging "sync pending", "sync failed", "conflict", or "stuck" issues
  - Understanding the 3-stage pull strategy (CRITICAL → RECENT_SALES → HISTORICAL)
  - Understanding version-based conflict detection and multi-device race conditions
  - Questions about sync status fields, cursor pagination, or dead letter queue
  - **MIGRATION**: Migrating from old syncGroupId pattern to FK-based ordering (v2)
  - Questions about @avileo/drizzle-sync library, codecs, or generated services
  - Identifying direct SQL in app code (anti-pattern)
  - Code review, audit, or architecture check

  Covers: push sync (SyncService), pull sync (PullService), SyncCoordinator, FK-based
  operation sorting, entity handlers, conflict resolution (version-based), staged pull,
  dead letter queue, exponential backoff, stale pull detection, queue fast-path,
  drizzle-sync library integration, and migration from v1 to v2. Sync hooks are disabled.
allowed-tools: Read, Grep, Glob, Bash
---

# Avileo Sync Engine Skill

This skill provides comprehensive knowledge about Avileo's offline-first synchronization system.

## DatabaseAdapter Abstraction

The sync engine uses a `DatabaseAdapter` interface to abstract the database backend. This enables the engine to run on PGlite (browser), SQLite (React Native), or PostgreSQL (Node.js) without code changes.

### Interface

```typescript
// packages/drizzle-sync/src/core/database-adapter.ts
export interface DatabaseAdapter {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(sql: string, params?: unknown[]): Promise<void>;
  getDb(): unknown;
}
```

### PGlite Implementation

```typescript
// packages/drizzle-sync/src/pglite/pglite-adapter.ts
export class PgLiteAdapter implements DatabaseAdapter {
  constructor(
    private readonly pg: PGlite,
    private readonly db: ReturnType<typeof drizzle>
  ) {}

  async query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> {
    return this.pg.query<T>(sql, params);
  }

  async exec(sql: string, params?: unknown[]): Promise<void> {
    if (params) {
      await this.pg.query(sql, params);
    } else {
      await this.pg.exec(sql);
    }
  }

  getDb(): ReturnType<typeof drizzle> {
    return this.db;
  }
}
```

### Engine Initialization Modes

The `SyncClientEngine` supports 3 initialization modes, all converging to a `DatabaseAdapter` in the context:

| Mode | Config | What Happens | `context.adapter` |
|------|--------|-------------|-------------------|
| **Adapter mode** | `config.adapter` | Consumer provides custom adapter | `config.adapter` |
| **Auto-init** | `config.databaseConfig` | Engine creates PGlite + wraps in `PgLiteAdapter` | `new PgLiteAdapter(pg, db)` |
| **Legacy** | `config.pg` + `config.db` | Engine wraps provided instances | `new PgLiteAdapter(pg, db)` |

### Engine Context (Only `adapter`, No `pg`/`db`)

```typescript
// packages/drizzle-sync/src/client/types.ts
export interface SyncClientEngineContext {
  adapter: DatabaseAdapter;  // ← only DB field, always present
  tenantId: string;
  tenantColumn: string;
  userId: string;
  syncService: SyncWritePort;
}
```

**All internal services consume `DatabaseAdapter` only:**
- `SyncEntityStatusUpdater` — `adapter.exec()`
- `SyncOperationLifecycleService` — `adapter.query()` / `adapter.exec()`
- `SyncBatchProcessor` — `adapter.query()`
- `PushSyncService` — passes `context.adapter` to batch processor

### Internal Services Using Adapter

All sync internals have been migrated from direct `PGlite` to `DatabaseAdapter`:

| Service | File | Uses |
|---------|------|------|
| `SyncEntityStatusUpdater` | `pglite/entity-status-updater.ts` | `adapter.exec()` |
| `SyncOperationLifecycleService` | `pglite/operation-lifecycle.ts` | `adapter.query()` + `adapter.exec()` |
| `SyncBatchProcessor` | `pglite/batch-processor.ts` | `adapter.query()` |
| `PushSyncService` | `pglite/push-service.ts` | passes `context.adapter` |
| `PgSyncQueue` | `pglite/queue-queue.ts` | via `createSqlExecutor(context)` |
| `ChangeApplier` | `pglite/change-applier.ts` | via `createSqlExecutor(context)` |

### Future: SQLite/React Native Adapter

```typescript
// Hypothetical SQLiteAdapter for React Native
class SQLiteAdapter implements DatabaseAdapter {
  constructor(private sqlite: SQLiteDatabase, private db: DrizzleSQLite) {}

  async query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> {
    const result = await this.sqlite.getAllAsync(sql, params);
    return { rows: result as T[] };
  }

  async exec(sql: string, params?: unknown[]): Promise<void> {
    await this.sqlite.runAsync(sql, params);
  }

  getDb() { return this.db; }
}
```

### Key Points

- **`SyncClientEngineContext` has no `pg` or `db` fields** — only `adapter: DatabaseAdapter`
- **Legacy `getPg()` still exists** on `SyncClientEngine` for external backward compat, but throws in adapter mode
- **`database-init.ts` stays PGlite-specific** — React Native would provide its own init + `SQLiteAdapter`
- **`PgLiteAdapter` exported** from both `@avileo/drizzle-sync` (main) and `@avileo/drizzle-sync/pglite`
- **`SqlExecutor` and `DatabaseAdapter` coexist** — `SqlExecutor` is a narrower interface (query+exec), `DatabaseAdapter` adds `getDb()`. Both are valid; new code should prefer `DatabaseAdapter`

## Quick Reference

### Sync Coordinator Lifecycle
**Location**: `packages/app/app/lib/sync/coordinator.ts`

The `SyncCoordinator` orchestrates push + pull together:
- `start()` — initializes SyncService + PullService, starts auto-sync
- `forceSync()` — forces immediate push + pull
- `forceResetSync()` — clears cursor and restarts when stuck
- Listens to `online`/`offline` events, resets backoffs on reconnect
- Emits `pull:stale` events when cursor gets stuck (≥3 pulls) or too many empty pulls (≥5)

### Entity Priority Map (2-Tier from sync-config.ts)
**Location**: `packages/shared/src/sync-config.ts:33-52`

```typescript
// Tier 1: Root/parent entities (processed first)
sales: 1, purchases: 1, products: 1, customers: 1, suppliers: 1,
customer_groups: 1, distribuciones: 1, tags: 1, visitas: 1, abonos: 1

// Tier 2: Child entities
sale_items: 2, purchase_items: 2, product_variants: 2,
customer_group_members: 2, customer_tags: 2
```

### Key Files

| Component | File | Notes |
|-----------|------|-------|
| SyncCoordinator | `packages/app/app/lib/sync/coordinator.ts` | Orchestrates push+pull, online/offline |
| SyncService (client) | `packages/app/app/lib/sync/sync-service.ts` | Local queue, push batching, DLQ, self-heal |
| PullService (client) | `packages/app/app/lib/sync/pull-service.ts` | Cursor-based pull, stale detection |
| ChangeApplier | `packages/app/app/lib/sync/change-applier.ts` | Applies server→client changes via raw SQL UPSERT |
| BaseSyncHandler | `packages/backend/src/services/sync/handlers/BaseSyncHandler.ts` | handleCreate/handleUpdate/handleDelete |
| SyncEngine (backend) | `packages/backend/src/services/sync/framework/SyncEngine.ts` | Batch with per-op savepoints |
| ConflictResolver | `packages/backend/src/services/sync/framework/ConflictResolver.ts` | Version-based per-entity detection |
| SyncService (backend) | `packages/backend/src/services/sync/sync.service.ts` | Registers 14 handlers |
| Sync API | `packages/backend/src/api/sync.ts` | 6 routes: batch, changes, health, conflicts |
| Entity Priority | `packages/shared/src/sync-config.ts` | SYNC_ENTITIES, ENTITY_PRIORITIES |
| Sync Stages | `packages/shared/src/sync-stages.ts` | 3-stage pull: CRITICAL, RECENT_SALES, HISTORICAL |

## Performance Hardening (2026-04)

These are now part of the expected sync architecture for hot sales flows:

1. **Queue fast-path for critical writes**
   - `EnqueueParams` supports `fastPath?: boolean`
   - Fast-path performs durable append immediately and skips precheck/coalescing lookup work
   - Used for create/update/delete operations in sales hot paths where latency matters

2. **Deterministic idempotency keys when needed**
   - `queueSync()` now accepts optional `idempotencyKey`
   - For create draft sale, a deterministic key like `sale:create:<saleId>` is preferred

3. **Immediate push attempt on startup**
   - `SyncService.startAutoSync()` starts interval and triggers one immediate `processPending()`
   - Avoids waiting full interval after refresh/reopen

4. **PGlite worker is feature-flagged**
   - Controlled by `VITE_ENABLE_PGLITE_WORKER`
   - Safe fallback to direct PGlite instance remains default path
   - `relaxedDurability: true` is enabled for local performance

5. **Operational performance logs are expected**
   - `[Perf][SyncQueue] enqueue timing`
   - `[Perf][ServicesProvider] startup`
   - `[Perf][EngineProvider] initDatabase`
   - `[Perf][SaleService] ...` for hot sale operations

### Required Fields for Sync

#### Architecture Rules

**NO direct SQL in `packages/app`**
- All database access in the frontend app MUST go through services (abstractions)
- Never write raw SQL strings like `await this.pg.query(\`SELECT * FROM ...\`)` directly in components or services
- Use generated services from `@avileo/drizzle-sync` or existing service classes (e.g., `SaleService`, `CustomerService`)
- This ensures proper sync queue integration, conflict detection, and maintainability

**Why**: Direct SQL bypasses the sync queue, making operations invisible to the server and breaking offline-first functionality.

#### 1. All Sync-Capable Tables Need
| Field | Type | Purpose |
|-------|------|---------|
| `sync_status` | text | `pending`, `synced`, `error` |
| `sync_attempts` | integer | Number of sync attempts |

#### 2. Parent Tables Need (for grouping)
| Table | Column | Purpose |
|-------|--------|---------|
| `sales` | `sync_group_id` | Groups sale + items + payments |
| `purchases` | `sync_group_id` | Groups purchase + items |

#### 3. Frontend sync_operations Table (PGlite)
```sql
CREATE TABLE sync_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  sync_group_id TEXT,
  operation TEXT NOT NULL,  -- 'create' | 'update' | 'delete'
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1,
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  last_attempt_at TIMESTAMP,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. Backend sync_operations (Drizzle)
| Column | Purpose |
|--------|---------|
| `id` | Primary key |
| `business_id` | Multi-tenancy |
| `operation_id` | Idempotency key |
| `entity` | Entity type |
| `action` | create/update/delete |
| `entity_id` | Entity ID |
| `payload` | JSONB |
| `status` | pending/processed/failed |
| `client_timestamp` | When client created it |
| `processed_at` | When server processed it |
| `sync_group_id` | Groups operations |
| `device_id` | Source device (new) |

## Schema Declaration Locations

| Schema Type | Location |
|-------------|----------|
| Shared (PGlite + PG) | `packages/shared/src/schema.ts` |
| Backend DB | `packages/backend/src/db/schema/*.ts` |
| Zod Validation | `packages/backend/src/services/sync/schemas/index.ts` |
| API Body | `packages/backend/src/api/sync.ts:176-198` |
| Sync Config | `packages/shared/src/sync-config.ts` |
| Sync Stages | `packages/shared/src/sync-stages.ts` |

## Adding New Entity to Sync

### Steps
1. **Backend Schema**: Add `version` column to table
2. **Shared Schema**: Add same fields to `packages/shared/src/schema.ts`
3. **Sync Config**: Add to `SYNC_ENTITIES` and `ENTITY_PRIORITIES` in `packages/shared/src/sync-config.ts`
4. **Create Handler**: `packages/backend/src/services/sync/handlers/[Entity]SyncHandler.ts`
5. **Register Handler**: Update `packages/backend/src/services/sync/sync.service.ts` constructor
6. **Conflict Resolver**: Add to `packages/backend/src/services/sync/framework/ConflictResolver.ts`
7. **Frontend Service**: Use `queueSync()` with `syncGroupId` for parent entities

### Handler Template (current pattern)
```typescript
// packages/backend/src/services/sync/handlers/NewEntitySyncHandler.ts
import { BaseSyncHandler } from "./BaseSyncHandler";
import type { SyncOperationInput } from "../types";
import type { SyncHandlerResult } from "../framework/types";

export class NewEntitySyncHandler extends BaseSyncHandler {
  readonly entityType = "new_entities";

  async execute(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<SyncHandlerResult> {
    try {
      if (operation.operation === "create") {
        await this.handleCreate(ctx, operation, tx);
      } else if (operation.operation === "update") {
        await this.handleUpdate(ctx, operation, tx);
      } else if (operation.operation === "delete") {
        await this.handleDelete(ctx, operation, tx);
      } else {
        throw new Error(`Unsupported action: ${operation.operation}`);
      }
      return this.createSuccessResult(operation);
    } catch (error) {
      return this.createErrorResult(operation, error instanceof Error ? error.message : String(error));
    }
  }

  private async handleCreate(ctx, operation, tx) { /* ... */ }
  private async handleUpdate(ctx, operation, tx) { /* ... */ }
  private async handleDelete(ctx, operation, tx) { /* ... */ }
}
```

### Register in SyncService (sync.service.ts:42-101)
```typescript
HandlerRegistry.register("new_entities", () => {
  return new NewEntitySyncHandler(deps.newEntityRepo);
});
```

### Add Conflict Resolver (ConflictResolver.ts)
```typescript
class NewEntityConflictResolver extends BaseVersionConflictResolver {
  protected getEntityName() { return "NewEntity"; }
  protected getTable() { return newEntities; }
  protected getIdField() { return "id"; }
  protected getBusinessIdField() { return "businessId"; }
  protected getVersionField() { return "version"; }
  protected getServerDataFields(record) {
    return { /* relevant fields + version */ };
  }
}
// Add to resolvers map:
new_entities: new NewEntityConflictResolver(),
```

## Common Issues

### 1. Operations not being grouped
- Check if `syncGroupId` is being passed to `queueSync()`
- Ensure parent entity is created before children

### 2. Pull sync stuck (cursor not advancing)
- Check `PullService.getIsStuck()` — returns true if ≥3 stale pulls or ≥5 empty pulls
- Call `coordinator.forceResetSync()` to clear cursor and restart
- Check `pull:stale` event for reason: `'cursor-stuck'` or `'empty-pulls'`

### 3. Sync hooks disabled
- **NOTE**: Sync hooks are disabled. `registry.ts` returns `allow: true` for all operations.

### 4. Conflict not resolving
- Check `packages/backend/src/services/sync/framework/ConflictResolver.ts`
- Ensure `version` column increments on every update
- sale_items conflict detection delegates to parent sale's version

### 5. Dead letter queue building up
- Check `syncService.getDeadLetterOperations()`
- After MAX_RETRIES (5), operations move to DLQ
- Use `retryAllDeadLetterOperations()` or `retryDeadLetterOperation(id)`

### 6. Changes not arriving from server (pull)
- Check cursor in localStorage: `localStorage.getItem('pglite_sync_cursor_<namespace>')`
- Verify `PullService.getStatus()` shows `isPulling: false` and `isStuck: false`
- Ensure `processPending` isn't blocking (check `isProcessing` flag)

## Debugging Commands

```bash
# Check combined push+pull status
await coordinator.getCombinedStatus()

# Check push queue
await syncService.getStatus()
await syncService.logDetailedStatus()

# Check pull status
pullService.getStatus()
# { isPulling, lastPullTime, lastError, consecutiveFailures, cursor, isStuck, consecutiveStalePulls }

# Check failed operations
await syncService.getFailedOperations()

# Retry a failed operation
await syncService.retryOperation(operationId)

# Retry all dead letter operations
await syncService.retryAllDeadLetterOperations()

# Force sync (push then pull)
await coordinator.forceSync()

# Force reset when stuck
await coordinator.forceResetSync()

# Check dead letter queue
await syncService.getDeadLetterOperations()

# Clear dead letter queue
await syncService.clearDeadLetterOperations()
```

## Architecture Patterns (Learned from Refactors)

### 1. Sync Library is Separated (@avileo/drizzle-sync)

The sync engine lives in its own workspace package (`packages/drizzle-sync/`), NOT in `@avileo/shared`.

**Rule**: Never modify `@avileo/shared` for sync logic changes. The sync library is the source of truth for:
- `SyncClientEngine` and its lifecycle
- `DatabaseAdapter` abstraction
- Push/pull sync services
- Code generation for frontend services

### 2. Code Generator Produces Frontend Artifacts

**Location**: `packages/drizzle-sync/src/config/generator.ts`

The generator produces files in `packages/app/app/lib/sync/generated/`:
- `services.ts` — BaseService subclasses for each entity
- `engine.ts` — Factory function `createAvileoSyncEngine()`
- `hooks.ts` — TanStack Query hooks
- `drizzle-schema.ts` — Centralized Drizzle table exports **(NEW)**
- `sync-tables.ts` — Table registry for pending data export/import
- `applier.ts` — Change applier config
- `schema-sql.ts` — PGlite DDL as TypeScript string

**Rule**: These files are AUTO-GENERATED. Never edit them manually. Regenerate via the code generator when schema changes.

### 3. Engine Exposes Tables via `engine.tables`

**Pattern introduced**: `SyncClientEngine` now exposes all Drizzle tables through a `tables` property:

```typescript
// In SyncClientEngine
readonly tables: Record<string, unknown>;

// Initialized from config
tables = config.tables ?? {};

// In engine factory (engine.ts)
import * as schemaTables from "./drizzle-schema";
// ...
tables: schemaTables,
```

**Usage in services**:
```typescript
// OLD (tight coupling to @avileo/shared)
import { customers, sales } from "@avileo/shared";
await this.db.select().from(customers).where(eq(customers.id, id));

// NEW (via engine, decoupled)
await this.db.select().from(this.tables.customers).where(eq(this.tables.customers.id, id));
```

**Benefits**:
- Services are decoupled from `@avileo/shared` schema imports
- Single source of truth for schema access
- Easier to mock tables for testing

### 4. Custom Service Pattern

All frontend services follow one of these patterns:

**Pattern A: Extend generated service**
```typescript
import { AbonosService } from "~/lib/sync/generated/services";

export class PaymentService extends AbonosService {
  constructor(engine: SyncClientEngineLike) {
    super(engine);
  }
  // Add business logic methods
}
```

**Pattern B: Extend BaseService directly (for multi-entity atomic operations)**
```typescript
import { BaseService } from "~/lib/services/base-service";

export class SaleService extends BaseService {
  constructor(engine: SyncClientEngineLike) {
    super(engine);
  }
  // Manage sales + sale_items atomically
}
```

**Pattern C: Compose generated services**
```typescript
export class SaleService extends BaseService {
  private generatedSalesService: GeneratedSalesService;
  private generatedItemsService: GeneratedItemsService;
  
  constructor(engine: SyncClientEngineLike) {
    super(engine);
    this.generatedSalesService = new GeneratedSalesService(engine);
    this.generatedItemsService = new GeneratedItemsService(engine);
  }
}
```

**Key rules**:
- All services receive `engine: SyncClientEngineLike` in constructor
- Access DB via `this.db` (Drizzle instance from engine)
- Access tables via `this.tables` (schema from engine)
- Never import table objects directly from `@avileo/shared`

## For Detailed Information

- [Code Review Checklist](references/code-review-checklist.md) — **NEW**: Audit rules, grep patterns, known violations
- [Architecture Overview](references/overview.md)
- [Drizzle-Sync Library](references/drizzle-sync-lib.md) — **NEW**: @avileo/drizzle-sync library guide
- [Migration v2](references/migration-v2.md) — **NEW**: syncGroupId removal migration guide
- [Sync Group ID Deep Dive](references/sync-group-id.md) — Old pattern (pending migration)
- [Adding New Entity to Sync](references/adding-entity.md)
- [Troubleshooting Guide](references/troubleshooting.md)
- [Operational Checklist](references/runbook-sync-performance.md)
- [Pull Sync Mechanics](references/pull-sync.md)
- [Conflict Resolution](references/conflict-resolution.md)
- [3-Stage Pull Strategy](references/staged-pull.md)
- [Code Examples](examples/sync-flow-examples.md)
