# T-004: Unify Observability and Sync Lifecycle

## Objective

Establish unified logging interface and event emission patterns across library components. This task ensures consistent observability for both frontend (ring-buffer + console) and backend (pino) runtimes.

## Linked Requirements

- **FR-009:** Observability Interface
- **FR-011:** Pull Service for Cursor-Based Sync (stale detection events)
- **NFR-005:** Performance (logging overhead)

## Concrete Files and Directories

### Files to Modify

| File | Changes |
|------|---------|
| `packages/drizzle-sync/src/core/interfaces.ts` | Add `ISyncLogger` interface, `SyncLogEntry` type, event types |
| `packages/drizzle-sync/src/core/sync-events.ts` | New file: event types and emitter interface |
| `packages/drizzle-sync/src/pglite/sync-logger.ts` | Implement `ISyncLogger` with `RingBufferLogger` |
| `packages/drizzle-sync/src/pglite/pull-service.ts` | Add event emission for stale pull |
| `packages/drizzle-sync/src/pglite/sync-queue.ts` | Accept logger via constructor |
| `packages/drizzle-sync/src/server/sync-logger.ts` | Implement `ISyncLogger` with `PinoSyncLogger` |
| `packages/drizzle-sync/src/server/sync-engine.ts` | Accept logger via constructor, emit events |
| `packages/drizzle-sync/src/server/base-handler.ts` | Use injected logger |

## Implementation Outline

### Step 1: Define Core Event Types (core/sync-events.ts)

```typescript
export type SyncEventType =
  | 'pull:stale'
  | 'pull:complete'
  | 'pull:error'
  | 'push:complete'
  | 'push:error'
  | 'sync:complete'
  | 'sync:error'
  | 'conflict:detected'
  | 'dead-letter:added';

export interface SyncEvent {
  type: SyncEventType;
  timestamp: Date;
  data: Record<string, unknown>;
}

export interface PullStaleEvent extends SyncEvent {
  type: 'pull:stale';
  data: {
    reason: 'cursor-stuck' | 'empty-pulls';
    consecutiveStalePulls: number;
    cursor?: string;
  };
}

export interface PullCompleteEvent extends SyncEvent {
  type: 'pull:complete';
  data: {
    applied: number;
    failed: number;
    cursor?: string;
  };
}

export interface PushCompleteEvent extends SyncEvent {
  type: 'push:complete';
  data: {
    succeeded: number;
    failed: number;
    conflicts: number;
  };
}

export interface ConflictDetectedEvent extends SyncEvent {
  type: 'conflict:detected';
  data: {
    entityType: string;
    entityId: string;
    clientVersion: number;
    serverVersion: number;
  };
}

export interface ISyncEventEmitter {
  emit(event: SyncEvent): void;
  on(type: SyncEventType, handler: (event: SyncEvent) => void): () => void;
  off(type: SyncEventType, handler: (event: SyncEvent) => void): void;
}

export class SimpleEventEmitter implements ISyncEventEmitter {
  private handlers: Map<SyncEventType, Set<(event: SyncEvent) => void>> = new Map();

  emit(event: SyncEvent): void {
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in event handler for ${event.type}:`, error);
        }
      }
    }
  }

  on(type: SyncEventType, handler: (event: SyncEvent) => void): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => this.off(type, handler);
  }

  off(type: SyncEventType, handler: (event: SyncEvent) => void): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  }
}
```

### Step 2: Update Core Interfaces (core/interfaces.ts)

```typescript
// Add to existing interfaces

export interface ISyncLogger {
  info(prefix: string, message: string, data?: unknown): void;
  warn(prefix: string, message: string, data?: unknown): void;
  error(prefix: string, message: string, data?: unknown): void;
  getEntries?(): SyncLogEntry[];
}

export interface SyncLogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  prefix: string;
  message: string;
  data?: unknown;
}

export interface ObservabilityConfig {
  logger?: ISyncLogger;
  eventEmitter?: ISyncEventEmitter;
}
```

### Step 3: Update PGlite Logger (pglite/sync-logger.ts)

```typescript
import type { ISyncLogger, SyncLogEntry } from '../core/interfaces';

const MAX_ENTRIES = 50;

export class RingBufferLogger implements ISyncLogger {
  private entries: SyncLogEntry[] = [];
  private consoleEnabled: boolean;

  constructor(options?: { consoleEnabled?: boolean }) {
    this.consoleEnabled = options?.consoleEnabled ?? true;
  }

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
    if (this.consoleEnabled) {
      if (data !== undefined) {
        console.info(`[${prefix}] ${message}`, data);
      } else {
        console.info(`[${prefix}] ${message}`);
      }
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
    if (this.consoleEnabled) {
      if (data !== undefined) {
        console.warn(`[${prefix}] ${message}`, data);
      } else {
        console.warn(`[${prefix}] ${message}`);
      }
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
    if (this.consoleEnabled) {
      if (data !== undefined) {
        console.error(`[${prefix}] ${message}`, data);
      } else {
        console.error(`[${prefix}] ${message}`);
      }
    }
  }

  getEntries(): SyncLogEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
  }
}

// Default instance for convenience
export const syncLogger = new RingBufferLogger();
```

### Step 4: Update Pull Service with Events (pglite/pull-service.ts)

```typescript
import type { PGlite } from '@electric-sql/pglite';
import type { ISyncLogger, ObservabilityConfig } from '../core/interfaces';
import type { ISyncEventEmitter, PullStaleEvent, PullCompleteEvent } from '../core/sync-events';
import { applyChange, type PullChange } from './change-applier';

export interface PullServiceConfig extends ObservabilityConfig {
  pg: PGlite;
  businessId: string;
  httpClient: ISyncHttpClient;
  cursorKey?: string;
  staleThreshold?: number;
}

export class PullService {
  private pg: PGlite;
  private businessId: string;
  private httpClient: ISyncHttpClient;
  private logger?: ISyncLogger;
  private eventEmitter?: ISyncEventEmitter;
  private cursor?: string;
  private isPulling: boolean = false;
  private consecutiveStalePulls: number = 0;
  private lastPullTime?: Date;
  private staleThreshold: number;

  constructor(config: PullServiceConfig) {
    this.pg = config.pg;
    this.businessId = config.businessId;
    this.httpClient = config.httpClient;
    this.logger = config.logger;
    this.eventEmitter = config.eventEmitter;
    this.staleThreshold = config.staleThreshold ?? 3;
    this.cursor = this.loadCursor(config.cursorKey ?? 'pglite_sync_cursor');
  }

  private loadCursor(key: string): string | undefined {
    try {
      return localStorage.getItem(key) ?? undefined;
    } catch {
      return undefined;
    }
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

      // Update cursor and detect stale
      if (nextCursor) {
        this.cursor = nextCursor;
        this.consecutiveStalePulls = 0;
      } else if (changes.length === 0) {
        this.consecutiveStalePulls++;
        this.checkStalePull();
      }

      this.lastPullTime = new Date();

      // Emit completion event
      this.eventEmitter?.emit({
        type: 'pull:complete',
        timestamp: new Date(),
        data: { applied, failed, cursor: this.cursor },
      } as PullCompleteEvent);

      return { applied, failed };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.eventEmitter?.emit({
        type: 'pull:error',
        timestamp: new Date(),
        data: { error: errorMessage },
      });
      throw error;
    } finally {
      this.isPulling = false;
    }
  }

  private checkStalePull(): void {
    if (this.consecutiveStalePulls >= this.staleThreshold) {
      const event: PullStaleEvent = {
        type: 'pull:stale',
        timestamp: new Date(),
        data: {
          reason: 'empty-pulls',
          consecutiveStalePulls: this.consecutiveStalePulls,
          cursor: this.cursor,
        },
      };
      this.eventEmitter?.emit(event);
      this.logger?.warn('[PullService]', 'Stale pull detected', event.data);
    }
  }

  getStatus(): PullStatus {
    return {
      isPulling: this.isPulling,
      lastPullTime: this.lastPullTime,
      cursor: this.cursor,
      isStuck: this.consecutiveStalePulls >= this.staleThreshold,
      consecutiveStalePulls: this.consecutiveStalePulls,
    };
  }

  resetCursor(): void {
    this.cursor = undefined;
    this.consecutiveStalePulls = 0;
  }
}
```

### Step 5: Update Sync Queue with Logger (pglite/sync-queue.ts)

```typescript
import type { PGlite } from '@electric-sql/pglite';
import type { ISyncQueue, EnqueueParams, SyncStatus, ISyncLogger } from '../core/interfaces';
import type { SyncOperation } from '../core/types';
import { OPERATION_STATUS } from '../shared/constants';
import { getCoalescePlan } from '../core/coalesce';

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

  // ... existing implementation, using this.logger instead of syncLogger
}
```

### Step 6: Update Server Logger (server/sync-logger.ts)

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

export const defaultSyncLogger = new ConsoleSyncLogger();
```

### Step 7: Update Sync Engine with Events (server/sync-engine.ts)

```typescript
import { sql } from 'drizzle-orm';
import type { SyncOperationInput, SyncBatchResult, SyncResult } from './types';
import type { ISyncLogger, ISyncEventEmitter } from '../core/interfaces';
import type { PushCompleteEvent, ConflictDetectedEvent } from '../core/sync-events';
import { OperationSorter } from './operation-sorter';
import { EntityRegistry } from './entity-registry';
import { HandlerRegistry } from './handler-registry';
import { defaultSyncLogger } from './sync-logger';

export interface SyncEngineConfig {
  db: any;
  logger?: ISyncLogger;
  eventEmitter?: ISyncEventEmitter;
  generateCorrelationId?: () => string;
}

export class SyncEngine {
  private db: any;
  private logger: ISyncLogger;
  private eventEmitter?: ISyncEventEmitter;
  private operationSorter: OperationSorter;
  private generateCorrelationId: () => string;

  constructor(config: SyncEngineConfig) {
    this.db = config.db;
    this.logger = config.logger ?? defaultSyncLogger;
    this.eventEmitter = config.eventEmitter;
    this.operationSorter = new OperationSorter();
    this.generateCorrelationId = config.generateCorrelationId ?? (() =>
      `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    );
  }

  async processBatch(
    ctx: { businessId: string; userId: string },
    operations: SyncOperationInput[]
  ): Promise<SyncBatchResult> {
    // ... existing implementation

    // After batch completion, emit event
    const succeeded = results.filter((item) => item.success && !item.conflict).length;
    const conflicts = results.filter((item) => item.conflict !== undefined).length;
    const failed = results.length - succeeded - conflicts;

    this.eventEmitter?.emit({
      type: 'push:complete',
      timestamp: new Date(),
      data: { succeeded, failed, conflicts },
    } as PushCompleteEvent);

    // Emit conflict events
    for (const result of results) {
      if (result.conflict) {
        this.eventEmitter?.emit({
          type: 'conflict:detected',
          timestamp: new Date(),
          data: {
            entityType: result.conflict.entityType,
            entityId: result.conflict.entityId,
            clientVersion: result.conflict.clientVersion,
            serverVersion: result.conflict.serverVersion,
          },
        } as ConflictDetectedEvent);
      }
    }

    return { results, summary: { total: results.length, succeeded, failed, conflicts } };
  }
}
```

### Step 8: Update Core Entrypoint (core/index.ts)

```typescript
export * from './types';
export * from './interfaces';
export * from './priority';
export * from './coalesce';
export * from './backoff';
export * from './sync-events'; // Add events
```

## Migration Path for Avileo

1. **Update imports** in Avileo to use library loggers
2. **Wire event emitters** in SyncCoordinator
3. **Replace hardcoded syncLogger** with injected logger
4. **Test event emission** for stale pull and conflicts

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Performance overhead from events | Events are optional, only emit if emitter provided |
| Console spam in production | RingBufferLogger respects `consoleEnabled` option |
| Event timing inconsistency | Emit events after state changes, not before |

## Validation Criteria

- [ ] Logs flow through unified `ISyncLogger` interface
- [ ] Events emit on stale pull, push complete, conflict detected
- [ ] Frontend ring-buffer accessible via `logger.getEntries()`
- [ ] Backend logs structured with pino (if configured)
- [ ] No console spam in production (configurable)
- [ ] Event handlers receive correct data payloads
