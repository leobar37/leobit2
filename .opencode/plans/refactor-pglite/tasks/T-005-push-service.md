# T-005: Refactor Push Service

## Objective
Refactor sync-service.ts and related files (batch-processor, lifecycle, status-updater) into domain/push/.

## Requirements Addressed
- FR-006: Push Service Refactor
- Partial: FR-002, FR-003

## Files to Create/Modify

### Create
- `packages/drizzle-sync/src/pglite/domain/push/types.ts` - Push service types
- `packages/drizzle-sync/src/pglite/domain/push/batch-processor.ts` - SyncBatchProcessor
- `packages/drizzle-sync/src/pglite/domain/push/lifecycle.ts` - Operation lifecycle
- `packages/drizzle-sync/src/pglite/domain/push/service.ts` - SyncService (main)
- `packages/drizzle-sync/src/pglite/domain/push/index.ts` - Barrel exports

### Delete (after T-009)
- `packages/drizzle-sync/src/pglite/sync-service.ts`
- `packages/drizzle-sync/src/pglite/sync-batch-processor.ts`
- `packages/drizzle-sync/src/pglite/sync-operation-lifecycle-service.ts`
- `packages/drizzle-sync/src/pglite/sync-entity-status-updater.ts`

## Implementation Details

### types.ts
```typescript
export interface PushServiceOptions {
  httpClient: ISyncHttpClient;
  queue?: ISyncQueue;  // Optional, can create default
  mutex?: ISyncMutex;
  logger?: ISyncLogger;
  enableAutoSync?: boolean;
}

export interface PushResult {
  processed: number;
  failed: number;
  conflicts: number;
}
```

### lifecycle.ts
Merge from sync-operation-lifecycle-service.ts and sync-entity-status-updater.ts:
```typescript
export class OperationLifecycle {
  constructor(
    private context: SyncClientEngineContext,
    private queue: ISyncQueue,
    private logger?: ISyncLogger
  ) {}

  async markProcessing(id: string): Promise<void>;
  async markCompleted(id: string): Promise<void>;
  async markFailed(id: string, error: string): Promise<void>;
  async updateEntityStatus(entityType: string, entityId: string, status: SyncStatus): Promise<void>;
  // ... all lifecycle methods
}
```

### batch-processor.ts
```typescript
export class BatchProcessor {
  constructor(
    private context: SyncClientEngineContext,
    private httpClient: ISyncHttpClient,
    private lifecycle: OperationLifecycle,
    private logger?: ISyncLogger
  ) {}

  async processPending(ignoreOnlineCheck?: boolean): Promise<PushResult>;
  async processGroup(groupId: string): Promise<{ success: boolean; errors: string[] }>;
  async syncOperation(operation: SyncOperationRecord): Promise<SyncOperationResult>;
}
```

### service.ts
```typescript
export class PushSyncService {
  private readonly queue: ISyncQueue;
  private readonly lifecycle: OperationLifecycle;
  private readonly batchProcessor: BatchProcessor;
  private readonly autoRunner: AutoRunner;

  constructor(
    private context: SyncClientEngineContext,
    private options: PushServiceOptions
  ) {
    this.queue = options.queue ?? new PgSyncQueue(context, { logger: options.logger });
    this.lifecycle = new OperationLifecycle(context, this.queue, options.logger);
    this.batchProcessor = new BatchProcessor(context, options.httpClient, this.lifecycle, options.logger);
    this.autoRunner = new AutoRunner();
  }

  async initialize(): Promise<void>;
  async enqueue(params: EnqueueParams): Promise<string>;
  async processPending(ignoreOnlineCheck?: boolean): Promise<PushResult>;
  async resolveConflict(operationId: string, resolution: ConflictStrategy): Promise<boolean>;
  startAutoSync(): void;
  stopAutoSync(): void;
  // ... all public methods from original SyncService
}
```

## Migration Notes
1. SyncService becomes PushSyncService (clearer name)
2. Lifecycle + StatusUpdater merged into single OperationLifecycle
3. BatchProcessor receives dependencies via constructor, not direct PGlite
4. AutoRunner kept separate but instantiated internally
5. All console.log replaced with injected logger

## Verification Steps
```bash
# Type check
cd packages/drizzle-sync && bun run typecheck

# Build
cd packages/drizzle-sync && bun run build
```

## Dependencies
- **T-001**: SqlExecutor
- **T-004**: Queue (PgSyncQueue must exist)

## Deliverables
1. All 5 files in domain/push/
2. PushSyncService with context-based constructor
3. BatchProcessor with injected dependencies
4. OperationLifecycle merged module
5. Proper type exports

## Acceptance Criteria
- [ ] All original SyncService methods preserved
- [ ] Uses SyncClientEngineContext
- [ ] ISyncHttpClient properly used
- [ ] Queue can be injected or defaulted
- [ ] Logger injected throughout
- [ ] Mutex integration maintained
- [ ] Conflict resolution preserved
- [ ] Auto-sync functionality preserved
