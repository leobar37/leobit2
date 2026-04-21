# T-006: Refactor Pull Service

## Objective
Refactor pull-service.ts and staged-pull-coordinator.ts into domain/pull/ using context and ChangeApplier.

## Requirements Addressed
- FR-007: Pull Service Refactor
- Partial: FR-002, FR-003

## Files to Create/Modify

### Create
- `packages/drizzle-sync/src/pglite/domain/pull/types.ts` - Pull service types
- `packages/drizzle-sync/src/pglite/domain/pull/cursor-storage.ts` - Cursor storage interface + implementations
- `packages/drizzle-sync/src/pglite/domain/pull/service.ts` - PullService
- `packages/drizzle-sync/src/pglite/domain/pull/staged-coordinator.ts` - StagedPullCoordinator
- `packages/drizzle-sync/src/pglite/domain/pull/index.ts` - Barrel exports

### Delete (after T-009)
- `packages/drizzle-sync/src/pglite/pull-service.ts`
- `packages/drizzle-sync/src/pglite/staged-pull-coordinator.ts`

## Implementation Details

### types.ts
```typescript
export interface PullServiceOptions {
  httpClient: PullHttpClient;
  applier?: ChangeApplier;  // Optional, can create default
  cursorStorage?: CursorStorage;
  mutex?: ISyncMutex;
  logger?: ISyncLogger;
  isOnline?: () => boolean;
}

export interface PullHttpClient {
  getChanges(params: {
    businessId: string;
    since?: string;
    entityTypes?: string[];
    limit?: number;
  }): Promise<{
    changes: PullChange[];
    nextSince: string;
    hasMore: boolean;
  }>;
  abort(): void;
}

export interface PullResult {
  success: boolean;
  changesApplied: number;
  hasMore: boolean;
  error?: string;
}
```

### cursor-storage.ts
```typescript
export interface CursorStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export class LocalStorageCursorStorage implements CursorStorage { ... }
export class MemoryCursorStorage implements CursorStorage { ... }
```

### service.ts
```typescript
export class PullSyncService {
  constructor(
    private context: SyncClientEngineContext,
    private options: PullServiceOptions
  ) {
    this.applier = options.applier ?? new ChangeApplier(context, { logger: options.logger });
    this.cursorStorage = options.cursorStorage ?? new MemoryCursorStorage();
    this.logger = options.logger ?? new NoOpLogger();
  }

  async initialize(): Promise<void>;
  async pull(): Promise<PullResult>;
  async pullWithOptions(options: PullOptions): Promise<PullResult>;
  startAutoPull(): void;
  stopAutoPull(): void;
  forceReset(): void;
  getStatus(): PullStatus;
  getIsStuck(): boolean;
}
```

### staged-coordinator.ts
```typescript
export class StagedPullCoordinator<TStage extends string> {
  constructor(options: {
    pullService: PullSyncService;
    stages: StageConfig<TStage>[];
    getEntitiesForStage: (stage: TStage) => string[];
    isOnline?: () => boolean;
    logger?: ISyncLogger;
  }) {}

  async executeStagedLoad(): Promise<void>;
  abort(): void;
}
```

## Migration Notes
1. PullService uses ChangeApplier (from T-003) internally
2. HTTP client interface simplified (PullHttpClient)
3. CursorStorage interface extracted for testability
4. StagedPullCoordinator receives PullSyncService, not raw PGlite
5. All cursor management via CursorStorage abstraction

## Verification Steps
```bash
# Type check
cd packages/drizzle-sync && bun run typecheck

# Build
cd packages/drizzle-sync && bun run build
```

## Dependencies
- **T-001**: SqlExecutor
- **T-003**: ChangeApplier (must exist)

## Deliverables
1. All 5 files in domain/pull/
2. PullSyncService with context-based constructor
3. CursorStorage interface + implementations
4. StagedPullCoordinator updated
5. PullHttpClient interface

## Acceptance Criteria
- [ ] PullService uses SyncClientEngineContext
- [ ] ChangeApplier integration via context or injection
- [ ] CursorStorage abstraction implemented
- [ ] HTTP client interface defined
- [ ] Mutex integration maintained
- [ ] Logger injected
- [ ] Auto-pull functionality preserved
- [ ] Stuck detection preserved
- [ ] Staged pull coordinator works with new API
