# T-007: Update SyncClientEngine

## Objective
Update SyncClientEngine to instantiate services with new context-based APIs.

## Requirements Addressed
- FR-008: SyncClientEngine Update

## Files to Create/Modify

### Modify
- `packages/drizzle-sync/src/client/sync-client-engine.ts` - Update instantiations

## Implementation Details

### Current Engine Code Pattern
```typescript
// Current (lines 82-143 in sync-client-engine.ts)
const { pg, db, businessId, ... } = this.config;

this.syncQueue = new PgSyncQueue(pg, businessId);

const adaptedHttpClient = { ... };

const syncServiceOptions = {
  queue: this.syncQueue,
  httpClient: adaptedHttpClient,
  mutex: this.mutex,
  logger: this.config.logger ?? syncLogger,
};
this.syncService = new SyncService(pg, businessId, syncServiceOptions);
```

### New Pattern Required
```typescript
// New pattern with context
const context: SyncClientEngineContext = {
  pg: this.config.pg,
  db: this.config.db,
  businessId: this.config.businessId,
  businessUserId: this.config.businessUserId,
  syncService: null as any, // Will be set after creation
};

// Create services with context
this.syncQueue = new PgSyncQueue(context, { logger: this.config.logger });

const pushOptions: PushServiceOptions = {
  httpClient: adaptedHttpClient,
  queue: this.syncQueue,
  mutex: this.mutex,
  logger: this.config.logger,
};
this.syncService = new PushSyncService(context, pushOptions);

// Update context with syncService reference
context.syncService = this.syncService;

const pullOptions: PullServiceOptions = {
  httpClient: { ... },
  cursorStorage: this.config.cursorStorage,
  mutex: this.mutex,
  logger: this.config.logger,
};
this.pullService = new PullSyncService(context, pullOptions);
```

### Changes Needed
1. Import new service classes:
   ```typescript
   import { PushSyncService } from "../pglite/domain/push";
   import { PullSyncService } from "../pglite/domain/pull";
   import { PgSyncQueue } from "../pglite/domain/queue";
   ```

2. Update `initialize()` method (lines 77-195):
   - Build context object first
   - Pass context to all service constructors
   - Set syncService reference in context after creation

3. Keep existing method signatures on Engine:
   - `initialize()`, `start()`, `stop()`
   - `triggerSync()`, `triggerPull()`
   - `getStatus()`, `getService()`

4. Internal references update:
   - `this.syncService` is now PushSyncService
   - `this.pullService` is now PullSyncService
   - But public API of Engine remains unchanged

## Verification Steps
```bash
# Type check
cd packages/drizzle-sync && bun run typecheck

# Build
cd packages/drizzle-sync && bun run build

# Test engine can be instantiated
# (No runtime test available yet - T-010 covers this)
```

## Dependencies
- **T-003**: ChangeApplier (indirect via PullService)
- **T-004**: Queue
- **T-005**: PushSyncService
- **T-006**: PullSyncService

## Deliverables
1. Updated `sync-client-engine.ts` with new imports
2. Context object construction
3. Updated service instantiations
4. Proper context.syncService reference setup

## Acceptance Criteria
- [ ] Engine imports new service classes
- [ ] Context object created with all properties
- [ ] PushSyncService instantiated with context
- [ ] PullSyncService instantiated with context
- [ ] syncService reference set in context
- [ ] All existing Engine public methods work
- [ ] No TypeScript errors
- [ ] Build succeeds
