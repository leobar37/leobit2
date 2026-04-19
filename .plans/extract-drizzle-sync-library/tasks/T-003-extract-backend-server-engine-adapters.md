# T-003: Extract Backend Server Engine Adapters

## Objective

Extract PostgreSQL backend sync components into the library's `server` entrypoint, preserving Drizzle-based patterns for type-safe queries. This enables backend sync processing as a reusable library module.

## Linked Requirements

- **FR-005:** Backend Sync Engine
- **FR-006:** Conflict Resolution
- **FR-007:** Base Sync Handler
- **FR-008:** Operation Repositories
- **NFR-003:** Runtime Compatibility (Bun/Node.js)
- **NFR-004:** Minimal Dependencies (Drizzle only)
- **NFR-005:** Performance (batch processing)

## Concrete Files and Directories

### New Files to Create

```
packages/drizzle-sync/src/
├── server/
│   ├── sync-engine.ts           # Batch processing with savepoints
│   ├── conflict-resolver.ts     # Version-based conflict detection
│   ├── base-handler.ts          # Abstract handler with template method
│   ├── handler-registry.ts      # Handler registration
│   ├── operation-sorter.ts      # Priority-based sorting
│   ├── entity-registry.ts       # Track created entities in batch
│   ├── operation-repository.ts  # Drizzle-based operation persistence
│   ├── conflict-repository.ts   # Conflict persistence
│   ├── dead-letter-repository.ts # DLQ persistence
│   ├── sync-logger.ts           # Pino-based structured logger
│   ├── types.ts                 # Server-specific types
│   └── index.ts                 # Entrypoint exports
```

### Source Files to Extract From

| Source File | Target File | Notes |
|-------------|-------------|-------|
| `packages/backend/src/services/sync/framework/SyncEngine.ts` | `server/sync-engine.ts` | Core batch engine |
| `packages/backend/src/services/sync/framework/ConflictResolver.ts` | `server/conflict-resolver.ts` | Version-based detection |
| `packages/backend/src/services/sync/handlers/BaseSyncHandler.ts` | `server/base-handler.ts` | Handler abstraction |
| `packages/backend/src/services/sync/framework/HandlerRegistry.ts` | `server/handler-registry.ts` | Handler registration |
| `packages/backend/src/services/sync/framework/OperationSorter.ts` | `server/operation-sorter.ts` | Priority sorting |
| `packages/backend/src/services/sync/framework/EntityRegistry.ts` | `server/entity-registry.ts` | Track created entities |
| `packages/backend/src/services/sync/framework/SyncOperationRepository.ts` | `server/operation-repository.ts` | Drizzle persistence |
| `packages/backend/src/services/sync/framework/SyncConflictRepository.ts` | `server/conflict-repository.ts` | Conflict persistence |
| `packages/backend/src/services/sync/framework/SyncDeadLetterRepository.ts` | `server/dead-letter-repository.ts` | DLQ persistence |
| `packages/backend/src/services/sync/sync-logger.ts` | `server/sync-logger.ts` | Structured logger |

## Implementation Outline

### Step 1: Create Server Entrypoint Structure

```bash
mkdir -p packages/drizzle-sync/src/server
touch packages/drizzle-sync/src/server/{sync-engine,conflict-resolver,base-handler,handler-registry,operation-sorter,entity-registry,operation-repository,conflict-repository,dead-letter-repository,sync-logger,types,index}.ts
```

### Step 2: Define Server Types (server/types.ts)

```typescript
import type { SyncOperation, SyncResult, SyncBatchResult } from '../core/types';

export interface SyncOperationInput extends SyncOperation {
  correlationId?: string;
  deviceId?: string;
}

export interface SyncHandlerResult {
  success: boolean;
  idempotencyKey: string;
  error?: string;
  conflict?: ConflictPayload;
  serverTimestamp: string;
}

export interface ISyncHandlerContext {
  businessId: string;
  userId: string;
  correlationId?: string;
}

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface SyncEngineDeps {
  // Repositories passed by application
  [key: string]: unknown;
}

export interface SyncEngineConfig {
  logger?: ISyncLogger;
  generateCorrelationId?: () => string;
}
```

### Step 3: Extract Sync Engine (server/sync-engine.ts)

```typescript
import { sql } from 'drizzle-orm';
import type { SyncOperationInput, SyncBatchResult, SyncResult, SyncHandlerResult } from './types';
import type { ISyncLogger } from '../core/interfaces';
import { OperationSorter } from './operation-sorter';
import { EntityRegistry } from './entity-registry';
import { HandlerRegistry } from './handler-registry';
import { defaultSyncLogger } from './sync-logger';

export interface SyncEngineConfig {
  db: any; // Drizzle database instance
  logger?: ISyncLogger;
  generateCorrelationId?: () => string;
}

export class SyncEngine {
  private db: any;
  private logger: ISyncLogger;
  private operationSorter: OperationSorter;
  private generateCorrelationId: () => string;

  constructor(config: SyncEngineConfig) {
    this.db = config.db;
    this.logger = config.logger ?? defaultSyncLogger;
    this.operationSorter = new OperationSorter();
    this.generateCorrelationId = config.generateCorrelationId ?? (() => 
      `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    );
  }

  async processBatch(
    ctx: { businessId: string; userId: string },
    operations: SyncOperationInput[]
  ): Promise<SyncBatchResult> {
    const batchCorrelationId = this.generateCorrelationId();
    const nowIso = new Date().toISOString();

    this.logger.info('[SyncEngine]', 'Sync batch received', {
      correlationId: batchCorrelationId,
      operations: operations.length,
      businessId: ctx.businessId,
    });

    const { operations: sortedOperations, groupCount } = this.operationSorter.sort(operations);

    this.logger.info('[SyncEngine]', 'Sync batch sorted', {
      correlationId: batchCorrelationId,
      totalOperations: sortedOperations.length,
      uniqueGroups: groupCount,
    });

    const results: SyncResult[] = [];
    const registry = new EntityRegistry();

    try {
      await this.db.transaction(async (tx: any) => {
        for (let i = 0; i < sortedOperations.length; i++) {
          const operation = sortedOperations[i];
          const correlationId = operation.correlationId || this.generateCorrelationId();
          const savepointName = `sp_op_${i}`;

          try {
            await tx.execute(sql.raw(`SAVEPOINT ${savepointName}`));
            const result = await this.processOperation(
              ctx,
              operation,
              correlationId,
              batchCorrelationId,
              tx,
              nowIso,
              registry
            );
            await tx.execute(sql.raw(`RELEASE SAVEPOINT ${savepointName}`));
            results.push(result);

            if (result.success) {
              registry.register(operation.operation, operation.entityId);
            }
          } catch (opError) {
            await this.rollbackSavepoint(tx, savepointName);

            const errorMessage = opError instanceof Error ? opError.message : String(opError);

            this.logger.error('[SyncEngine]', 'Operation failed in batch (rolled back via savepoint)', {
              correlationId,
              savepointName,
              operation: operation.operation,
              entityType: operation.entityType,
              entityId: operation.entityId,
              error: errorMessage,
            });

            results.push({
              idempotencyKey: operation.idempotencyKey,
              success: false,
              error: errorMessage,
              serverTimestamp: nowIso,
            });
          }
        }
      });
    } catch (txError) {
      this.logger.error('[SyncEngine]', 'Transaction failed entirely', {
        error: txError instanceof Error ? txError.message : String(txError),
      });

      const processedKeys = new Set(results.map((r) => r.idempotencyKey));
      for (const op of sortedOperations) {
        if (!processedKeys.has(op.idempotencyKey)) {
          results.push({
            idempotencyKey: op.idempotencyKey,
            success: false,
            error: txError instanceof Error ? txError.message : 'Transaction failed',
            serverTimestamp: nowIso,
          });
        }
      }
    }

    const succeeded = results.filter((item) => item.success && !item.conflict).length;
    const conflicts = results.filter((item) => item.conflict !== undefined).length;
    const failed = results.length - succeeded - conflicts;

    this.logger.info('[SyncEngine]', 'Sync batch completed', {
      summary: { total: results.length, succeeded, failed, conflicts },
    });

    return {
      results,
      summary: {
        total: results.length,
        succeeded,
        failed,
        conflicts,
      },
    };
  }

  private async processOperation(
    ctx: { businessId: string; userId: string },
    operation: SyncOperationInput,
    correlationId: string,
    batchCorrelationId: string,
    tx: any,
    nowIso: string,
    registry: EntityRegistry
  ): Promise<SyncResult> {
    const handler = HandlerRegistry.get(operation.entityType);
    if (!handler) {
      throw new Error(`No handler registered for entity type: ${operation.entityType}`);
    }

    handler.setRegistry(registry);
    const result = await handler.execute(ctx, operation, tx);

    return {
      idempotencyKey: operation.idempotencyKey,
      success: result.success,
      error: result.error,
      conflict: result.conflict,
      serverTimestamp: result.serverTimestamp,
    };
  }

  private async rollbackSavepoint(tx: any, savepointName: string): Promise<void> {
    try {
      await tx.execute(sql.raw(`ROLLBACK TO SAVEPOINT ${savepointName}`));
    } catch (rollbackError) {
      this.logger.error('[SyncEngine]', 'Failed to rollback savepoint', {
        savepointName,
        error: rollbackError,
      });
    }
  }
}
```

### Step 4: Extract Conflict Resolver (server/conflict-resolver.ts)

```typescript
import type { DbTransaction } from './types';
import type { ConflictPayload } from '../core/types';

export interface ConflictResolverConfig {
  getEntityTable: (entityType: string) => any;
  getIdField: (entityType: string) => string;
  getBusinessIdField: (entityType: string) => string;
  getVersionField: (entityType: string) => string;
  getServerDataFields: (entityType: string, record: any) => Record<string, unknown>;
}

export class ConflictResolver {
  private config: ConflictResolverConfig;

  constructor(config: ConflictResolverConfig) {
    this.config = config;
  }

  async checkConflict(
    ctx: { businessId: string },
    entityType: string,
    entityId: string,
    clientVersion: number,
    tx?: DbTransaction
  ): Promise<ConflictPayload | null> {
    const table = this.config.getEntityTable(entityType);
    const idField = this.config.getIdField(entityType);
    const businessIdField = this.config.getBusinessIdField(entityType);
    const versionField = this.config.getVersionField(entityType);

    const query = tx
      ? tx.select().from(table)
      : this.db.select().from(table);

    // Build query with filters
    const result = await query.where(
      and(
        eq(table[idField], entityId),
        eq(table[businessIdField], ctx.businessId)
      )
    );

    if (result.length === 0) {
      return null; // Entity doesn't exist, no conflict
    }

    const serverRecord = result[0];
    const serverVersion = serverRecord[versionField];

    if (clientVersion < serverVersion) {
      return {
        entityType,
        entityId,
        clientVersion,
        serverVersion,
        serverData: this.config.getServerDataFields(entityType, serverRecord),
      };
    }

    return null;
  }
}

// Base class for entity-specific conflict resolvers
export abstract class BaseVersionConflictResolver {
  protected abstract getEntityName(): string;
  protected abstract getTable(): any;
  protected abstract getIdField(): string;
  protected abstract getBusinessIdField(): string;
  protected abstract getVersionField(): string;
  protected abstract getServerDataFields(record: any): Record<string, unknown>;

  async resolve(
    ctx: { businessId: string },
    entityId: string,
    clientVersion: number,
    tx?: DbTransaction
  ): Promise<ConflictPayload | null> {
    const table = this.getTable();
    const idField = this.getIdField();
    const businessIdField = this.getBusinessIdField();
    const versionField = this.getVersionField();

    // Query implementation similar to ConflictResolver.checkConflict
    // ...
  }
}
```

### Step 5: Extract Base Handler (server/base-handler.ts)

```typescript
import type { ISyncLogger } from '../core/interfaces';
import type { SyncOperationInput, SyncHandlerResult, ISyncHandlerContext, DbTransaction } from './types';
import type { EntityRegistry } from './entity-registry';
import { z } from 'zod';

export interface BaseHandlerConfig {
  entityType: string;
  logger?: ISyncLogger;
}

export abstract class BaseSyncHandler {
  abstract readonly entityType: string;
  protected registry?: EntityRegistry;
  protected logger?: ISyncLogger;

  setRegistry(registry: EntityRegistry): void {
    this.registry = registry;
  }

  setLogger(logger: ISyncLogger): void {
    this.logger = logger;
  }

  abstract validateBusinessRules(
    ctx: ISyncHandlerContext,
    payload: Record<string, unknown>,
    operation?: string,
    tx?: DbTransaction
  ): Promise<void>;

  abstract execute(
    ctx: ISyncHandlerContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<SyncHandlerResult>;

  protected async executeOperation(
    ctx: ISyncHandlerContext,
    operation: SyncOperationInput,
    handlers: {
      create: () => Promise<void>;
      update: () => Promise<void>;
      delete: () => Promise<void>;
    },
    details?: Record<string, unknown>
  ): Promise<SyncHandlerResult> {
    this.logStart(ctx, operation, details);

    try {
      if (operation.operation === 'create') {
        await handlers.create();
      } else if (operation.operation === 'update') {
        await handlers.update();
      } else if (operation.operation === 'delete') {
        await handlers.delete();
      } else {
        throw new Error(`Unsupported action: ${operation.operation}`);
      }

      this.logSuccess(ctx, operation);
      return this.createSuccessResult(operation);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logError(ctx, operation, err);
      return this.createErrorResult(operation, err.message);
    }
  }

  protected logStart(
    ctx: ISyncHandlerContext,
    operation: SyncOperationInput,
    details?: Record<string, unknown>
  ): void {
    this.logger?.info(`[${this.entityType}]`, `Processing ${operation.operation}`, {
      entityId: operation.entityId,
      businessId: ctx.businessId,
      ...details,
    });
  }

  protected logSuccess(
    ctx: ISyncHandlerContext,
    operation: SyncOperationInput,
    details?: Record<string, unknown>
  ): void {
    this.logger?.info(`[${this.entityType}]`, `${operation.operation} completed`, {
      entityId: operation.entityId,
      ...details,
    });
  }

  protected logError(
    ctx: ISyncHandlerContext,
    operation: SyncOperationInput,
    error: Error,
    details?: Record<string, unknown>
  ): void {
    this.logger?.error(`[${this.entityType}]`, `${operation.operation} failed`, {
      entityId: operation.entityId,
      error: error.message,
      ...details,
    });
  }

  protected createSuccessResult(operation: SyncOperationInput): SyncHandlerResult {
    return {
      success: true,
      idempotencyKey: operation.idempotencyKey,
      serverTimestamp: new Date().toISOString(),
    };
  }

  protected createErrorResult(operation: SyncOperationInput, error: string): SyncHandlerResult {
    return {
      success: false,
      idempotencyKey: operation.idempotencyKey,
      error,
      serverTimestamp: new Date().toISOString(),
    };
  }

  protected validatePayload(
    payload: Record<string, unknown>,
    createSchema: z.ZodType<unknown>,
    updateSchema?: z.ZodType<unknown>,
    operation?: string
  ): void {
    if (operation === 'update' && updateSchema) {
      updateSchema.parse(payload);
    } else if (operation === 'delete') {
      return;
    } else {
      createSchema.parse(payload);
    }
  }

  protected async ensureParentExists(
    parentId: string,
    findInDb: () => Promise<unknown>,
    parentName: string
  ): Promise<void> {
    if (this.registry?.wasCreated(parentId)) {
      return;
    }

    const parent = await findInDb();
    if (!parent) {
      throw new Error(`${parentName} ${parentId} not found`);
    }
  }
}
```

### Step 6: Extract Handler Registry (server/handler-registry.ts)

```typescript
import type { BaseSyncHandler } from './base-handler';

class HandlerRegistryImpl {
  private handlers: Map<string, () => BaseSyncHandler> = new Map();

  register(entityType: string, factory: () => BaseSyncHandler): void {
    this.handlers.set(entityType, factory);
  }

  get(entityType: string): BaseSyncHandler | undefined {
    const factory = this.handlers.get(entityType);
    return factory ? factory() : undefined;
  }

  has(entityType: string): boolean {
    return this.handlers.has(entityType);
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}

export const HandlerRegistry = new HandlerRegistryImpl();
```

### Step 7: Extract Operation Sorter (server/operation-sorter.ts)

```typescript
import type { SyncOperationInput } from './types';
import { getEntityPriority, type EntityPriorityConfig } from '../core/priority';

export interface OperationSorterConfig {
  priorityConfig?: EntityPriorityConfig;
}

export class OperationSorter {
  private priorityConfig?: EntityPriorityConfig;

  constructor(config?: OperationSorterConfig) {
    this.priorityConfig = config?.priorityConfig;
  }

  sort(operations: SyncOperationInput[]): {
    operations: SyncOperationInput[];
    groupCount: number;
  } {
    const groups = new Map<string, SyncOperationInput[]>();

    // Group by syncGroupId
    for (const op of operations) {
      const groupId = op.syncGroupId ?? op.idempotencyKey;
      if (!groups.has(groupId)) {
        groups.set(groupId, []);
      }
      groups.get(groupId)!.push(op);
    }

    // Sort within each group by priority
    for (const [groupId, groupOps] of groups) {
      groupOps.sort((a, b) => {
        const priorityA = getEntityPriority(a.entityType, this.priorityConfig);
        const priorityB = getEntityPriority(b.entityType, this.priorityConfig);
        return priorityA - priorityB;
      });
    }

    // Flatten back to array
    const sortedOperations: SyncOperationInput[] = [];
    for (const groupOps of groups.values()) {
      sortedOperations.push(...groupOps);
    }

    return {
      operations: sortedOperations,
      groupCount: groups.size,
    };
  }

  getPriorityMap(): Record<string, number> {
    return this.priorityConfig ?? {};
  }
}
```

### Step 8: Extract Entity Registry (server/entity-registry.ts)

```typescript
export class EntityRegistry {
  private createdEntities: Set<string> = new Set();
  private deletedEntities: Set<string> = new Set();

  register(operation: 'create' | 'update' | 'delete', entityId: string): void {
    if (operation === 'create') {
      this.createdEntities.add(entityId);
    } else if (operation === 'delete') {
      this.deletedEntities.add(entityId);
      this.createdEntities.delete(entityId);
    }
  }

  wasCreated(entityId: string): boolean {
    return this.createdEntities.has(entityId);
  }

  wasDeleted(entityId: string): boolean {
    return this.deletedEntities.has(entityId);
  }

  clear(): void {
    this.createdEntities.clear();
    this.deletedEntities.clear();
  }
}
```

### Step 9: Extract Operation Repository (server/operation-repository.ts)

```typescript
import { eq, and } from 'drizzle-orm';
import type { DbTransaction } from './types';

export interface OperationRepositoryConfig {
  db: any;
  table: any;
  logger?: ISyncLogger;
}

export class SyncOperationRepository {
  private db: any;
  private table: any;
  private logger?: ISyncLogger;

  constructor(config: OperationRepositoryConfig) {
    this.db = config.db;
    this.table = config.table;
    this.logger = config.logger;
  }

  async findById(id: string, tx?: DbTransaction): Promise<any | undefined> {
    const query = tx ? tx.select().from(this.table) : this.db.select().from(this.table);
    const result = await query.where(eq(this.table.id, id));
    return result[0];
  }

  async findByIdempotencyKey(idempotencyKey: string, tx?: DbTransaction): Promise<any | undefined> {
    const query = tx ? tx.select().from(this.table) : this.db.select().from(this.table);
    const result = await query.where(eq(this.table.operationId, idempotencyKey));
    return result[0];
  }

  async findByBusinessId(businessId: string, tx?: DbTransaction): Promise<any[]> {
    const query = tx ? tx.select().from(this.table) : this.db.select().from(this.table);
    return await query.where(eq(this.table.businessId, businessId));
  }

  async markProcessed(id: string, tx?: DbTransaction): Promise<void> {
    const query = tx ? tx.update(this.table) : this.db.update(this.table);
    await query
      .set({
        status: 'processed',
        processedAt: new Date(),
      })
      .where(eq(this.table.id, id));
  }

  async markFailed(id: string, error: string, tx?: DbTransaction): Promise<void> {
    const query = tx ? tx.update(this.table) : this.db.update(this.table);
    await query
      .set({
        status: 'failed',
        error,
      })
      .where(eq(this.table.id, id));
  }
}
```

### Step 10: Extract Sync Logger (server/sync-logger.ts)

```typescript
import type { ISyncLogger, SyncLogEntry } from '../core/interfaces';

export interface PinoSyncLoggerConfig {
  pino: any;
  prefix?: string;
}

export class PinoSyncLogger implements ISyncLogger {
  private pino: any;
  private prefix: string;

  constructor(config: PinoSyncLoggerConfig) {
    this.pino = config.pino;
    this.prefix = config.prefix ?? '[SYNC]';
  }

  info(prefix: string, message: string, data?: unknown): void {
    this.pino.info({ prefix, message, data }, `${prefix} ${message}`);
  }

  warn(prefix: string, message: string, data?: unknown): void {
    this.pino.warn({ prefix, message, data }, `${prefix} ${message}`);
  }

  error(prefix: string, message: string, data?: unknown): void {
    this.pino.error({ prefix, message, data }, `${prefix} ${message}`);
  }
}

// Console logger for testing
export class ConsoleSyncLogger implements ISyncLogger {
  info(prefix: string, message: string, data?: unknown): void {
    if (data !== undefined) {
      console.info(`[${prefix}] ${message}`, data);
    } else {
      console.info(`[${prefix}] ${message}`);
    }
  }

  warn(prefix: string, message: string, data?: unknown): void {
    if (data !== undefined) {
      console.warn(`[${prefix}] ${message}`, data);
    } else {
      console.warn(`[${prefix}] ${message}`);
    }
  }

  error(prefix: string, message: string, data?: unknown): void {
    if (data !== undefined) {
      console.error(`[${prefix}] ${message}`, data);
    } else {
      console.error(`[${prefix}] ${message}`);
    }
  }
}

// Default instance for convenience
export const defaultSyncLogger = new ConsoleSyncLogger();
```

### Step 11: Create Entrypoint (server/index.ts)

```typescript
// Core types and interfaces
export * from '../core/types';
export * from '../core/interfaces';
export * from '../core/priority';
export * from '../core/coalesce';
export * from '../core/backoff';

// Server-specific exports
export * from './types';
export * from './sync-engine';
export * from './conflict-resolver';
export * from './base-handler';
export * from './handler-registry';
export * from './operation-sorter';
export * from './entity-registry';
export * from './operation-repository';
export * from './conflict-repository';
export * from './dead-letter-repository';
export * from './sync-logger';

// Shared constants
export * from '../shared/constants';
```

### Step 12: Update Package Exports

```json
// packages/drizzle-sync/package.json
{
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" },
    "./core": { "import": "./dist/core/index.js", "types": "./dist/core/index.d.ts" },
    "./pglite": { "import": "./dist/pglite/index.js", "types": "./dist/pglite/index.d.ts" },
    "./server": { "import": "./dist/server/index.js", "types": "./dist/server/index.d.ts" },
    "./shared": { "import": "./dist/shared/index.js", "types": "./dist/shared/index.d.ts" }
  },
  "peerDependencies": {
    "@electric-sql/pglite": "^0.2.0",
    "drizzle-orm": "^0.45.0",
    "typescript": "^5.0.0"
  }
}
```

### Step 13: Update Build Configuration

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'core/index': 'src/core/index.ts',
    'pglite/index': 'src/pglite/index.ts',
    'server/index': 'src/server/index.ts',
    'shared/index': 'src/shared/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  external: ['@electric-sql/pglite', 'drizzle-orm', 'postgres'],
});
```

## Migration Path for Avileo

1. **Update imports** in Avileo backend handlers:
   ```typescript
   // packages/backend/src/services/sync/handlers/SaleSyncHandler.ts
   import { BaseSyncHandler } from '@avileo/drizzle-sync/server';
   ```

2. **Add deprecation re-exports** in original locations.

3. **Run backend tests** to validate behavior matches original.

4. **Remove original files** after validation.

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Drizzle transaction type incompatibility | Use `DbTransaction` type from existing code |
| RequestContext coupling | Define minimal `ISyncHandlerContext` interface in library |
| Missing repository methods | Copy repository implementations exactly, then generalize |
| Pino version incompatibility | Accept logger interface, don't depend on pino directly |

## Validation Criteria

- [ ] Backend builds with library imports: `import { SyncEngine } from '@avileo/drizzle-sync/server'`
- [ ] `SyncEngine` tests pass (copy from `framework/__tests__/`)
- [ ] `ConflictResolver` tests pass
- [ ] `BaseSyncHandler` pattern works for concrete handlers (SaleSyncHandler, CustomerSyncHandler)
- [ ] Batch processing handles 100+ operations per transaction
- [ ] No Node.js-specific APIs in library (check for `fs`, `path`, etc.)
