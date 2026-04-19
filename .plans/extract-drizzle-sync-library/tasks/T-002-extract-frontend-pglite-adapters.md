# T-002: Extract Frontend PGlite Adapters

## Objective

Extract PGlite-specific sync components into the library's `pglite` entrypoint, preserving raw SQL patterns for change application. This enables frontend offline-first sync functionality as a reusable library module.

## Linked Requirements

- **FR-002:** Sync Queue Abstraction (implementation)
- **FR-003:** Change Applier for PGlite
- **FR-004:** Schema Mapper for Table/Column Validation
- **FR-011:** Pull Service for Cursor-Based Sync
- **NFR-003:** Runtime Compatibility (browser)
- **NFR-004:** Minimal Dependencies (PGlite only)
- **NFR-005:** Performance (fast-path enqueue)

## Concrete Files and Directories

### New Files to Create

```
packages/drizzle-sync/src/
├── pglite/
│   ├── change-applier.ts      # Raw SQL UPSERT for applying server changes
│   ├── schema-mapper.ts       # Table/column validation, snake_case mapping
│   ├── sync-queue.ts          # PgSyncQueue implementation
│   ├── pull-service.ts        # Cursor-based pull with stale detection
│   ├── sync-logger.ts         # RingBufferLogger implementation
│   ├── types.ts               # PGlite-specific types
│   └── index.ts               # Entrypoint exports
```

### Source Files to Extract From

| Source File | Target File | Notes |
|-------------|-------------|-------|
| `packages/app/app/lib/sync/change-applier.ts` | `pglite/change-applier.ts` | Raw SQL UPSERT pattern |
| `packages/app/app/lib/sync/schema-mapper.ts` | `pglite/schema-mapper.ts` | Table/column whitelists |
| `packages/app/app/lib/sync/queue/pg-sync-queue.ts` | `pglite/sync-queue.ts` | ISyncQueue implementation |
| `packages/app/app/lib/sync/pull-service.ts` | `pglite/pull-service.ts` | Cursor-based pull |
| `packages/app/app/lib/sync/sync-logger.ts` | `pglite/sync-logger.ts` | Ring-buffer logger |
| `packages/app/app/lib/sync/types/operations.types.ts` | `pglite/types.ts` | PGlite-specific types |

## Implementation Outline

### Step 1: Create PGlite Entrypoint Structure

```bash
mkdir -p packages/drizzle-sync/src/pglite
touch packages/drizzle-sync/src/pglite/{change-applier,schema-mapper,sync-queue,pull-service,sync-logger,types,index}.ts
```

### Step 2: Extract Change Applier (pglite/change-applier.ts)

**Key Pattern:** Uses raw SQL instead of Drizzle ORM due to camelCase/snake_case mismatch.

```typescript
// Core imports from library
import type { SyncOperation, SyncResult, ConflictPayload } from '../core/types';
import type { ISyncLogger } from '../core/interfaces';
import { withRetry } from '../core/backoff';

// PGlite import (peer dependency)
import type { PGlite } from '@electric-sql/pglite';

// Local imports
import { isValidTableName, toSnakeCase, filterValidColumns } from './schema-mapper';

export type ConflictStrategy = 'check-db' | 'pre-computed-set' | 'none';

export interface ApplyChangeOptions {
  maxRetries?: number;
  checkConflicts?: boolean;
  conflictStrategy?: ConflictStrategy;
  conflictedIds?: Set<string>;
  logger?: ISyncLogger;
}

export interface PullChange {
  entityType: string;
  entityId: string;
  operation: 'create' | 'insert' | 'update' | 'delete';
  data?: Record<string, unknown>;
  version?: number;
}

/**
 * Apply a single change to PGlite using raw SQL UPSERT.
 * Preserves the exact SQL patterns from original implementation.
 */
export async function applyChange(
  pg: PGlite,
  change: PullChange,
  businessId: string,
  options?: ApplyChangeOptions
): Promise<{ success: boolean; error?: string }> {
  const tableName = change.entityType;
  const logger = options?.logger;

  // Validate table name for SQL injection protection
  if (!isValidTableName(tableName)) {
    return { success: false, error: `Invalid table name: ${tableName}` };
  }

  try {
    return await withRetry(
      async () => {
        switch (change.operation) {
          case 'create':
          case 'insert':
            return await applyInsert(pg, tableName, change, businessId, logger);
          case 'update':
            return await applyUpdate(pg, tableName, change, businessId, logger);
          case 'delete':
            return await applyDelete(pg, tableName, change, businessId, logger);
          default:
            return { success: false, error: `Unknown operation: ${change.operation}` };
        }
      },
      { maxRetries: options?.maxRetries ?? 3, retryDelayMs: 100 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

// ... applyInsert, applyUpdate, applyDelete implementations
// (Copy from original change-applier.ts with minimal modifications)
```

**Migration Notes:**
- Keep raw SQL strings identical to original
- Replace `syncLogger` import with `ISyncLogger` parameter
- Use library's `withRetry` from `core/backoff`

### Step 3: Extract Schema Mapper (pglite/schema-mapper.ts)

```typescript
/**
 * Schema Mapper for PGlite
 * Validates entity types and maps between camelCase and snake_case.
 */

// Default whitelist - can be extended via configuration
const DEFAULT_VALID_TABLES = new Set([
  'customers', 'products', 'product_variants', 'sales', 'sale_items',
  'abonos', 'purchases', 'purchase_items', 'suppliers', 'variant_inventory',
  'distribuciones', 'distribucion_items', 'tags', 'customer_tags',
  'customer_groups', 'customer_group_members', 'visitas',
]);

// Column whitelists per table
const DEFAULT_TABLE_COLUMNS: Record<string, Set<string>> = {
  customers: new Set([
    'id', 'business_id', 'name', 'dni', 'phone', 'address', 'notes',
    'sync_status', 'sync_attempts', 'created_by', 'created_at', 'updated_at'
  ]),
  // ... (copy from original schema-mapper.ts)
};

export interface SchemaMapperConfig {
  validTables?: Set<string>;
  tableColumns?: Record<string, Set<string>>;
}

export class SchemaMapper {
  private validTables: Set<string>;
  private tableColumns: Record<string, Set<string>>;

  constructor(config?: SchemaMapperConfig) {
    this.validTables = config?.validTables ?? DEFAULT_VALID_TABLES;
    this.tableColumns = config?.tableColumns ?? DEFAULT_TABLE_COLUMNS;
  }

  isValidTableName(tableName: string): boolean {
    return this.validTables.has(tableName);
  }

  filterValidColumns(tableName: string, data: Record<string, unknown>): Record<string, unknown> {
    const allowedColumns = this.tableColumns[tableName];
    if (!allowedColumns) return data;

    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (allowedColumns.has(toSnakeCase(key))) {
        filtered[toSnakeCase(key)] = value;
      }
    }
    return filtered;
  }
}

// Convenience functions for default mapper
export function isValidTableName(tableName: string): boolean {
  return DEFAULT_VALID_TABLES.has(tableName);
}

export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

export function filterValidColumns(
  tableName: string,
  data: Record<string, unknown>
): Record<string, unknown> {
  return new SchemaMapper().filterValidColumns(tableName, data);
}

export function isRelationField(field: string): boolean {
  const RELATION_FIELDS = new Set([
    'items', 'customer', 'seller', 'business', 'distribucion', 'visita',
    'sale', 'product', 'variant', 'supplier', 'purchase', 'advanceProofImage',
    'cancelledBy', 'createdBy', 'updatedBy',
  ]);
  return RELATION_FIELDS.has(field);
}
```

### Step 4: Extract Sync Queue (pglite/sync-queue.ts)

```typescript
import type { PGlite } from '@electric-sql/pglite';
import type { ISyncQueue, EnqueueParams, SyncStatus } from '../core/interfaces';
import type { SyncOperation } from '../core/types';
import { OPERATION_STATUS } from '../shared/constants';
import { getCoalescePlan } from '../core/coalesce';
import { getEntityPriority } from '../core/priority';
import type { ISyncLogger } from '../core/interfaces';

export interface PgSyncQueueConfig {
  pg: PGlite;
  businessId: string;
  logger?: ISyncLogger;
  fastPathDefault?: boolean;
}

export class PgSyncQueue implements ISyncQueue {
  private pg: PGlite;
  private businessId: string;
  private logger?: ISyncLogger;
  private fastPathDefault: boolean;

  constructor(config: PgSyncQueueConfig) {
    this.pg = config.pg;
    this.businessId = config.businessId;
    this.logger = config.logger;
    this.fastPathDefault = config.fastPathDefault ?? false;
  }

  async enqueue(params: EnqueueParams): Promise<string> {
    const enqueueStart = performance.now();
    const id = generateId();
    const idempotencyKey = params.idempotencyKey || generateId();

    this.logger?.info('[PgSyncQueue]', 'Enqueuing operation', {
      entityType: params.entity_type,
      operation: params.operation,
      entityId: params.entityId,
      idempotencyKey,
    });

    // Fast path: skip idempotency and coalescing checks
    if (params.fastPath ?? this.fastPathDefault) {
      await this.insertOperation({
        id,
        businessId: this.businessId,
        entityType: params.entity_type,
        operation: params.operation,
        entityId: params.entityId,
        payload: params.data,
        idempotencyKey,
        syncGroupId: params.syncGroupId,
        version: (params.data?._localVersion as number) ?? 1,
      });

      this.logger?.info('[PgSyncQueue]', `Enqueued operation (fastPath) ${params.operation} for ${params.entity_type}:${params.entityId}`);
      return id;
    }

    // Standard path: idempotency check + coalescing
    const existingByKey = await this.getByIdempotencyKey(idempotencyKey);
    if (existingByKey && existingByKey.status !== OPERATION_STATUS.COMPLETED) {
      this.logger?.info('[PgSyncQueue]', `Idempotency hit for ${params.entity_type}:${params.entityId}`);
      return existingByKey.id;
    }

    const existingOp = await this.getPendingForEntity(params.entity_type, params.entityId);
    if (existingOp) {
      const plan = getCoalescePlan(existingOp, params);
      
      if (plan.type === 'cancel') {
        await this.deleteOperation(existingOp.id);
        this.logger?.info('[PgSyncQueue]', `Coalesced (cancelled) operation for ${params.entity_type}:${params.entityId}`);
        return existingOp.id;
      }

      if (plan.type === 'merge' || plan.type === 'replace') {
        await this.updateOperationCoalesced(existingOp.id, {
          operation: plan.operation!,
          payload: plan.payload!,
          idempotencyKey,
        });
        this.logger?.info('[PgSyncQueue]', `Coalesced (${plan.type}) operation for ${params.entity_type}:${params.entityId}`);
        return existingOp.id;
      }
    }

    // Insert new operation
    await this.insertOperation({
      id,
      businessId: this.businessId,
      entityType: params.entity_type,
      operation: params.operation,
      entityId: params.entityId,
      payload: params.data,
      idempotencyKey,
      syncGroupId: params.syncGroupId,
      version: (params.data?._localVersion as number) ?? 1,
    });

    return id;
  }

  // ... dequeue, markProcessing, markCompleted, markFailed, getStatus implementations
  // (Copy from original pg-sync-queue.ts)
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
```

### Step 5: Extract Pull Service (pglite/pull-service.ts)

```typescript
import type { PGlite } from '@electric-sql/pglite';
import type { ISyncLogger } from '../core/interfaces';
import { applyChange, type PullChange } from './change-applier';

export interface PullServiceConfig {
  pg: PGlite;
  businessId: string;
  httpClient: ISyncHttpClient;
  logger?: ISyncLogger;
  cursorKey?: string;
}

export interface ISyncHttpClient {
  getChanges(cursor?: string, stage?: PullStage): Promise<{ changes: PullChange[]; nextCursor?: string }>;
}

export type PullStage = 'CRITICAL' | 'RECENT_SALES' | 'HISTORICAL';

export interface PullStatus {
  isPulling: boolean;
  lastPullTime?: Date;
  lastError?: string;
  cursor?: string;
  isStuck: boolean;
  consecutiveStalePulls: number;
}

export class PullService {
  private pg: PGlite;
  private businessId: string;
  private httpClient: ISyncHttpClient;
  private logger?: ISyncLogger;
  private cursor?: string;
  private isPulling: boolean = false;
  private consecutiveStalePulls: number = 0;
  private lastPullTime?: Date;

  constructor(config: PullServiceConfig) {
    this.pg = config.pg;
    this.businessId = config.businessId;
    this.httpClient = config.httpClient;
    this.logger = config.logger;
    this.cursor = localStorage.getItem(config.cursorKey ?? 'pglite_sync_cursor') ?? undefined;
  }

  async pull(): Promise<{ applied: number; failed: number }> {
    if (this.isPulling) {
      this.logger?.warn('[PullService]', 'Pull already in progress');
      return { applied: 0, failed: 0 };
    }

    this.isPulling = true;
    let applied = 0;
    let failed = 0;

    try {
      const { changes, nextCursor } = await this.httpClient.getChanges(this.cursor);

      for (const change of changes) {
        const result = await applyChange(this.pg, change, this.businessId, {
          logger: this.logger,
        });

        if (result.success) {
          applied++;
        } else {
          failed++;
          this.logger?.error('[PullService]', `Failed to apply change: ${result.error}`, change);
        }
      }

      if (nextCursor) {
        this.cursor = nextCursor;
        this.consecutiveStalePulls = 0;
      } else if (changes.length === 0) {
        this.consecutiveStalePulls++;
      }

      this.lastPullTime = new Date();
      return { applied, failed };
    } finally {
      this.isPulling = false;
    }
  }

  getStatus(): PullStatus {
    return {
      isPulling: this.isPulling,
      lastPullTime: this.lastPullTime,
      cursor: this.cursor,
      isStuck: this.consecutiveStalePulls >= 3,
      consecutiveStalePulls: this.consecutiveStalePulls,
    };
  }

  resetCursor(): void {
    this.cursor = undefined;
    this.consecutiveStalePulls = 0;
  }
}
```

### Step 6: Extract Sync Logger (pglite/sync-logger.ts)

```typescript
import type { ISyncLogger, SyncLogEntry } from '../core/interfaces';

const MAX_ENTRIES = 50;

export class RingBufferLogger implements ISyncLogger {
  private entries: SyncLogEntry[] = [];

  private makeId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private push(entry: SyncLogEntry): void {
    this.entries.push(entry);
    if (this.entries.length > MAX_ENTRIES) {
      this.entries.shift();
    }
  }

  info(prefix: string, message: string, data?: unknown): void {
    const entry: SyncLogEntry = {
      id: this.makeId(),
      timestamp: new Date(),
      level: 'info',
      prefix,
      message,
      data,
    };
    this.push(entry);
    if (data !== undefined) {
      console.info(`[${prefix}] ${message}`, data);
    } else {
      console.info(`[${prefix}] ${message}`);
    }
  }

  warn(prefix: string, message: string, data?: unknown): void {
    const entry: SyncLogEntry = {
      id: this.makeId(),
      timestamp: new Date(),
      level: 'warn',
      prefix,
      message,
      data,
    };
    this.push(entry);
    if (data !== undefined) {
      console.warn(`[${prefix}] ${message}`, data);
    } else {
      console.warn(`[${prefix}] ${message}`);
    }
  }

  error(prefix: string, message: string, data?: unknown): void {
    const entry: SyncLogEntry = {
      id: this.makeId(),
      timestamp: new Date(),
      level: 'error',
      prefix,
      message,
      data,
    };
    this.push(entry);
    if (data !== undefined) {
      console.error(`[${prefix}] ${message}`, data);
    } else {
      console.error(`[${prefix}] ${message}`);
    }
  }

  getEntries(): SyncLogEntry[] {
    return this.entries;
  }

  clear(): void {
    this.entries = [];
  }
}

// Default instance for convenience
export const syncLogger = new RingBufferLogger();
```

### Step 7: Create Entrypoint (pglite/index.ts)

```typescript
// Core types and interfaces
export * from '../core/types';
export * from '../core/interfaces';
export * from '../core/priority';
export * from '../core/coalesce';
export * from '../core/backoff';

// PGlite-specific exports
export * from './change-applier';
export * from './schema-mapper';
export * from './sync-queue';
export * from './pull-service';
export * from './sync-logger';
export * from './types';

// Shared constants
export * from '../shared/constants';
```

### Step 8: Update Package Exports

```json
// packages/drizzle-sync/package.json
{
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" },
    "./core": { "import": "./dist/core/index.js", "types": "./dist/core/index.d.ts" },
    "./pglite": { "import": "./dist/pglite/index.js", "types": "./dist/pglite/index.d.ts" },
    "./shared": { "import": "./dist/shared/index.js", "types": "./dist/shared/index.d.ts" }
  },
  "peerDependencies": {
    "@electric-sql/pglite": "^0.2.0",
    "typescript": "^5.0.0"
  }
}
```

### Step 9: Update Build Configuration

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'core/index': 'src/core/index.ts',
    'pglite/index': 'src/pglite/index.ts',
    'shared/index': 'src/shared/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  external: ['@electric-sql/pglite'], // Peer dependency
});
```

## Migration Path for Avileo

1. **Add deprecation re-exports** in original locations:
   ```typescript
   // packages/app/app/lib/sync/change-applier.ts
   /** @deprecated Import from '@avileo/drizzle-sync/pglite' instead */
   export * from '@avileo/drizzle-sync/pglite';
   ```

2. **Update imports** in Avileo application code to use library imports.

3. **Run tests** to validate behavior matches original.

4. **Remove original files** after validation.

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Raw SQL patterns break in library context | Keep SQL strings identical initially, test against PGlite |
| PGlite version incompatibility | Pin `@electric-sql/pglite` version in peerDependencies |
| Performance regression in enqueue | Benchmark fast-path before/after extraction |
| Browser bundle size increase | Ensure tree-shaking works, check bundle size |

## Validation Criteria

- [ ] Frontend builds with library imports: `import { PgSyncQueue } from '@avileo/drizzle-sync/pglite'`
- [ ] `PgSyncQueue` tests pass (copy from `__tests__/sync-service.test.ts`)
- [ ] `change-applier` tests pass (copy from `__tests__/change-applier.test.ts`)
- [ ] `pull-service` tests pass (copy from `__tests__/pull-service.test.ts`)
- [ ] Browser bundle size within 10% of baseline
- [ ] Fast-path enqueue latency < 5ms (benchmark)
