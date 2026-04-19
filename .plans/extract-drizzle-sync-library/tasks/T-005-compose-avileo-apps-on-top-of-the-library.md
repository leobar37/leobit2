# T-005: Compose Avileo Apps on Top of the Library

## Objective

Migrate Avileo frontend and backend to import from the library, removing duplicate code. This task integrates the extracted library into Avileo's application layer.

## Linked Requirements

- **FR-010:** React Integration
- **NFR-006:** Backward Compatibility During Migration

## Concrete Files and Directories

### Files to Modify

| File | Changes |
|------|---------|
| `packages/app/app/lib/sync/change-applier.ts` | Re-export from library with deprecation |
| `packages/app/app/lib/sync/schema-mapper.ts` | Re-export from library with deprecation |
| `packages/app/app/lib/sync/queue/pg-sync-queue.ts` | Re-export from library with deprecation |
| `packages/app/app/lib/sync/pull-service.ts` | Re-export from library with deprecation |
| `packages/app/app/lib/sync/sync-logger.ts` | Re-export from library with deprecation |
| `packages/app/app/lib/sync/sync-service.ts` | Update imports to use library |
| `packages/app/app/lib/sync/coordinator.ts` | Update imports to use library |
| `packages/app/app/lib/sync/service-provider.tsx` | Update imports to use library |
| `packages/backend/src/services/sync/framework/SyncEngine.ts` | Re-export from library with deprecation |
| `packages/backend/src/services/sync/framework/ConflictResolver.ts` | Re-export from library with deprecation |
| `packages/backend/src/services/sync/handlers/BaseSyncHandler.ts` | Re-export from library with deprecation |
| `packages/backend/src/services/sync/sync-logger.ts` | Re-export from library with deprecation |
| `packages/backend/src/services/sync/sync.service.ts` | Update imports to use library |
| `packages/backend/src/services/sync/handlers/*.ts` | Update imports to use library |

## Implementation Outline

### Step 1: Add Deprecation Re-exports (Frontend)

```typescript
// packages/app/app/lib/sync/change-applier.ts
/**
 * @deprecated Import from '@avileo/drizzle-sync/pglite' instead.
 * This file will be removed in a future version.
 */
export {
  applyChange,
  type ApplyChangeOptions,
  type ApplyChangesBatchResult,
  type ConflictStrategy,
  type PullChange,
} from '@avileo/drizzle-sync/pglite';
```

```typescript
// packages/app/app/lib/sync/schema-mapper.ts
/**
 * @deprecated Import from '@avileo/drizzle-sync/pglite' instead.
 */
export {
  isValidTableName,
  toSnakeCase,
  filterValidColumns,
  isRelationField,
  VALID_TABLES,
  SchemaMapper,
  type SchemaMapperConfig,
} from '@avileo/drizzle-sync/pglite';
```

```typescript
// packages/app/app/lib/sync/queue/pg-sync-queue.ts
/**
 * @deprecated Import from '@avileo/drizzle-sync/pglite' instead.
 */
export {
  PgSyncQueue,
  type PgSyncQueueConfig,
} from '@avileo/drizzle-sync/pglite';
```

```typescript
// packages/app/app/lib/sync/sync-logger.ts
/**
 * @deprecated Import from '@avileo/drizzle-sync/pglite' instead.
 */
export {
  RingBufferLogger,
  syncLogger,
  type SyncLogEntry,
} from '@avileo/drizzle-sync/pglite';
```

### Step 2: Update Frontend Services

```typescript
// packages/app/app/lib/sync/sync-service.ts
import { PgSyncQueue, type RingBufferLogger, syncLogger } from '@avileo/drizzle-sync/pglite';
import type { PGlite } from '@electric-sql/pglite';
import type { ISyncHttpClient } from './http/sync-http-client';

export interface SyncServiceConfig {
  pg: PGlite;
  businessId: string;
  httpClient: ISyncHttpClient;
  logger?: RingBufferLogger;
}

export class SyncService {
  private queue: PgSyncQueue;
  private httpClient: ISyncHttpClient;
  private logger: RingBufferLogger;

  constructor(config: SyncServiceConfig) {
    this.queue = new PgSyncQueue({
      pg: config.pg,
      businessId: config.businessId,
      logger: config.logger ?? syncLogger,
    });
    this.httpClient = config.httpClient;
    this.logger = config.logger ?? syncLogger;
  }

  // ... existing methods using this.queue
}
```

```typescript
// packages/app/app/lib/sync/coordinator.ts
import { PullService, PgSyncQueue, syncLogger } from '@avileo/drizzle-sync/pglite';
import { SimpleEventEmitter, type ISyncEventEmitter } from '@avileo/drizzle-sync/core';
import type { SyncService } from './sync-service';

export interface SyncCoordinatorConfig {
  syncService: SyncService;
  pullService: PullService;
  eventEmitter?: ISyncEventEmitter;
}

export class SyncCoordinator {
  private syncService: SyncService;
  private pullService: PullService;
  private eventEmitter: ISyncEventEmitter;
  private autoSyncInterval?: ReturnType<typeof setInterval>;

  constructor(config: SyncCoordinatorConfig) {
    this.syncService = config.syncService;
    this.pullService = config.pullService;
    this.eventEmitter = config.eventEmitter ?? new SimpleEventEmitter();

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.eventEmitter.on('pull:stale', (event) => {
      syncLogger.warn('[Coordinator]', 'Pull is stale, consider reset', event.data);
    });
  }

  async start(): Promise<void> {
    await this.syncService.startAutoSync();
    await this.pullService.pull();
  }

  async forceSync(): Promise<void> {
    await this.syncService.processPending();
    await this.pullService.pull();
  }

  async forceResetSync(): Promise<void> {
    this.pullService.resetCursor();
    await this.forceSync();
  }

  getCombinedStatus(): Promise<{
    push: ReturnType<SyncService['getStatus']>;
    pull: ReturnType<PullService['getStatus']>;
  }> {
    return Promise.resolve({
      push: this.syncService.getStatus(),
      pull: this.pullService.getStatus(),
    });
  }
}
```

### Step 3: Update Frontend Service Provider

```typescript
// packages/app/app/lib/sync/service-provider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { PullService, PgSyncQueue, syncLogger } from '@avileo/drizzle-sync/pglite';
import { SimpleEventEmitter, type ISyncEventEmitter } from '@avileo/drizzle-sync/core';
import type { PGlite } from '@electric-sql/pglite';
import { SyncService } from './sync-service';
import { SyncCoordinator } from './coordinator';
import type { SyncHttpClient } from './http/sync-http-client';

interface SyncContextValue {
  coordinator: SyncCoordinator | null;
  isLoading: boolean;
  error: Error | null;
}

const SyncContext = createContext<SyncContextValue>({
  coordinator: null,
  isLoading: true,
  error: null,
});

interface SyncProviderProps {
  pg: PGlite;
  businessId: string;
  httpClient: SyncHttpClient;
  children: React.ReactNode;
}

export function SyncProvider({ pg, businessId, httpClient, children }: SyncProviderProps) {
  const [coordinator, setCoordinator] = useState<SyncCoordinator | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initSync() {
      try {
        const queue = new PgSyncQueue({
          pg,
          businessId,
          logger: syncLogger,
        });

        const pullService = new PullService({
          pg,
          businessId,
          httpClient,
          logger: syncLogger,
          eventEmitter: new SimpleEventEmitter(),
        });

        const syncService = new SyncService({
          pg,
          businessId,
          httpClient,
          logger: syncLogger,
        });

        const coord = new SyncCoordinator({
          syncService,
          pullService,
          eventEmitter: new SimpleEventEmitter(),
        });

        if (mounted) {
          setCoordinator(coord);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    }

    initSync();

    return () => {
      mounted = false;
    };
  }, [pg, businessId, httpClient]);

  return (
    <SyncContext.Provider value={{ coordinator, isLoading, error }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncContextValue {
  return useContext(SyncContext);
}
```

### Step 4: Add Deprecation Re-Exports (Backend)

```typescript
// packages/backend/src/services/sync/framework/SyncEngine.ts
/**
 * @deprecated Import from '@avileo/drizzle-sync/server' instead.
 */
export { SyncEngine, type SyncEngineConfig } from '@avileo/drizzle-sync/server';
```

```typescript
// packages/backend/src/services/sync/framework/ConflictResolver.ts
/**
 * @deprecated Import from '@avileo/drizzle-sync/server' instead.
 */
export {
  ConflictResolver,
  BaseVersionConflictResolver,
  type ConflictResolverConfig,
} from '@avileo/drizzle-sync/server';
```

```typescript
// packages/backend/src/services/sync/handlers/BaseSyncHandler.ts
/**
 * @deprecated Import from '@avileo/drizzle-sync/server' instead.
 */
export { BaseSyncHandler, type BaseHandlerConfig } from '@avileo/drizzle-sync/server';
```

### Step 5: Update Backend Handlers

```typescript
// packages/backend/src/services/sync/handlers/SaleSyncHandler.ts
import { BaseSyncHandler, type ISyncHandlerContext, type SyncHandlerResult } from '@avileo/drizzle-sync/server';
import type { SyncOperationInput } from '@avileo/drizzle-sync/server';
import type { RequestContext } from '../../../context/request-context';
import type { DbTransaction } from '../../../lib/txid';
import { SaleRepository } from '../../repository/sale.repository';
import { SaleItemRepository } from '../../repository/sale-item.repository';
import { z } from 'zod';

export class SaleSyncHandler extends BaseSyncHandler {
  readonly entityType = 'sales' as const;

  constructor(
    private saleRepo: SaleRepository,
    private saleItemRepo: SaleItemRepository
  ) {
    super();
  }

  async validateBusinessRules(
    ctx: ISyncHandlerContext,
    payload: Record<string, unknown>,
    operation?: string,
    tx?: DbTransaction
  ): Promise<void> {
    // Business validation logic
  }

  async execute(
    ctx: ISyncHandlerContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<SyncHandlerResult> {
    return this.executeOperation(
      ctx,
      operation,
      {
        create: () => this.handleCreate(ctx, operation, tx),
        update: () => this.handleUpdate(ctx, operation, tx),
        delete: () => this.handleDelete(ctx, operation, tx),
      }
    );
  }

  private async handleCreate(
    ctx: ISyncHandlerContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    // Implementation
  }

  private async handleUpdate(
    ctx: ISyncHandlerContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    // Implementation
  }

  private async handleDelete(
    ctx: ISyncHandlerContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    // Implementation
  }
}
```

### Step 6: Update Backend Sync Service Registration

```typescript
// packages/backend/src/services/sync/sync.service.ts
import { SyncEngine, HandlerRegistry, PinoSyncLogger } from '@avileo/drizzle-sync/server';
import { db } from '../../lib/db';
import { logger } from '../../lib/logger';
import { SaleSyncHandler } from './handlers/SaleSyncHandler';
import { CustomerSyncHandler } from './handlers/CustomerSyncHandler';
// ... other handlers

const syncLogger = new PinoSyncLogger({ pino: logger, prefix: '[SYNC]' });

export const syncEngine = new SyncEngine({
  db,
  logger: syncLogger,
});

// Register handlers
HandlerRegistry.register('sales', () => new SaleSyncHandler(/* deps */));
HandlerRegistry.register('customers', () => new CustomerSyncHandler(/* deps */));
// ... other handlers
```

### Step 7: Update Package Dependencies

```json
// packages/app/package.json
{
  "dependencies": {
    "@avileo/drizzle-sync": "workspace:*",
    "@avileo/shared": "workspace:*",
    "@electric-sql/pglite": "^0.2.0"
  }
}
```

```json
// packages/backend/package.json
{
  "dependencies": {
    "@avileo/drizzle-sync": "workspace:*",
    "@avileo/shared": "workspace:*",
    "drizzle-orm": "^0.45.0"
  }
}
```

### Step 8: Run Tests

```bash
# Frontend tests
cd packages/app && bun test

# Backend tests
cd packages/backend && bun test

# E2E tests
cd packages/app && bun run test:e2e
```

### Step 9: Remove Original Files (After Validation)

```bash
# After all tests pass, remove deprecated files
rm packages/app/app/lib/sync/change-applier.ts
rm packages/app/app/lib/sync/schema-mapper.ts
rm packages/app/app/lib/sync/queue/pg-sync-queue.ts
rm packages/app/app/lib/sync/sync-logger.ts

rm packages/backend/src/services/sync/framework/SyncEngine.ts
rm packages/backend/src/services/sync/framework/ConflictResolver.ts
rm packages/backend/src/services/sync/framework/HandlerRegistry.ts
rm packages/backend/src/services/sync/framework/OperationSorter.ts
rm packages/backend/src/services/sync/framework/EntityRegistry.ts
rm packages/backend/src/services/sync/handlers/BaseSyncHandler.ts
rm packages/backend/src/services/sync/sync-logger.ts
```

## Migration Path Summary

1. **Phase 1:** Add deprecation re-exports (non-breaking)
2. **Phase 2:** Update imports in application code
3. **Phase 3:** Run full test suite
4. **Phase 4:** Remove original files (breaking cleanup)

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Circular dependencies during migration | Use re-exports temporarily, remove after validation |
| Subtle behavior differences | Run full test suite after each change |
| Missing imports after removal | TypeScript compilation catches missing imports |
| E2E test failures | Run E2E tests before removing original files |

## Validation Criteria

- [ ] Avileo builds successfully with library imports
- [ ] All existing unit tests pass
- [ ] All existing E2E tests pass
- [ ] E2E sync flow works (offline → online)
- [ ] Performance metrics match baseline (within 5%)
- [ ] No deprecation warnings in production build (after cleanup)
