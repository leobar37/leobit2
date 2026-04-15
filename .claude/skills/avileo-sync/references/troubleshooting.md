# Troubleshooting Guide

## Common Sync Issues

### 1. Operations Not Being Sent (Push)

**Symptoms**: Changes made offline don't appear on server after going online.

**Possible Causes & Solutions**:

#### Cause: Network not available
```typescript
navigator.onLine  // should be true
```

#### Cause: Sync not triggered
```typescript
// Manually trigger sync:
await syncService.processPending()

// Or check if auto-sync is running:
syncService.isRunning()  // returns boolean
```

#### Cause: Operations stuck in queue with wrong status
```typescript
// Check queue status:
await syncService.getStatus()
// Returns: { pending: 0, processing: 0, completed: 100, failed: 2, ... }
```

#### Cause: Enqueue is slow in hot paths
```typescript
// Check perf logs
// [Perf][SyncQueue] enqueue timing
// [Perf][SyncQueue] enqueue fastPath timing
```

**Fix**:
- Use `fastPath: true` for latency-critical local writes (sales create/edit hot path)
- Keep durable append mandatory
- Avoid moving correctness-critical checks out of sync pipeline

### 2. Operations Not Grouped

**Symptoms**: Sale items sync before sale parent, causing errors.

**Cause**: `syncGroupId` not passed to child operations.

**Debug**:
```typescript
const problemOps = await syncService.getProblemOperations();
console.log(problemOps.map(op => ({
  entityType: op.entity_type,
  entityId: op.entity_id,
  syncGroupId: op.sync_group_id,
})));
```

**Fix**: Ensure `queueSync()` is called with `syncGroupId` for parent and all children.

### 3. Pull Sync Stuck (Cursor Not Advancing)

**Symptoms**: Server has changes but they never arrive on device.

**Debug**:
```typescript
// Check if PullService is stuck
pullService.getIsStuck()  // returns true if stuck

// Get detailed pull status
pullService.getStatus()
// { isPulling, lastPullTime, lastError, consecutiveFailures,
//   cursor, isStuck, consecutiveStalePulls }
```

**Stale pull detection** (in `PullService`):
- `MAX_STALE_PULLS = 3`: If cursor doesn't advance ≥3 consecutive pulls → stuck
- `MAX_EMPTY_PULLS = 5`: If empty pull with `hasMore=true` ≥5 times → stuck

**Fix**:
```typescript
// Force reset when stuck
coordinator.forceResetSync()

// Or manually clear cursor and restart
pullService.forceReset()
```

### 4. Conflict Detection Issues

**Symptoms**: Conflicts not being detected, or false positives.

**Debug**:
```typescript
// Check ConflictResolver for your entity type
// Location: packages/backend/src/services/sync/framework/ConflictResolver.ts

// Ensure version field is incrementing on updates:
// The server checks: serverVersion > localVersion → conflict
```

**Common Issues**:
- Version field not incremented on update
- Version field not included in payload
- Using wrong version comparison (`>=` instead of `>`)

**Note**: `sale_items` conflict detection delegates to parent sale's version — a sale item update can be flagged as conflict if the parent sale was independently modified on another device.

### 5. Dead Letter Queue Building Up

**Symptoms**: Operations keep failing and moving to dead letter queue.

**Location**: `packages/app/app/lib/sync/sync-service.ts:1017-1075`

**Debug**:
```typescript
const dlqOps = await syncService.getDeadLetterOperations();
console.log(dlqOps.map(op => ({
  entityType: op.entity_type,
  error: op.error,
  syncAttempts: op.sync_attempts,
})));
```

**Retry DLQ operations**:
```typescript
// Retry one
await syncService.retryDeadLetterOperation(dlqId)

// Retry all
const retried = await syncService.retryAllDeadLetterOperations()

// Clear all
await syncService.clearDeadLetterOperations()
```

**Possible Causes**:
- Network issues
- Server errors (5xx)
- Validation errors (4xx)
- Handler not implemented for entity type

### 6. Pull Sync Not Updating Local Data

**Symptoms**: Server changes not appearing in app.

**Possible Causes**:

#### Cause: Cursor not advancing
```typescript
// Check cursor storage
localStorage.getItem('pglite_sync_cursor_<namespace>')

// Verify PullService status
pullService.getStatus().cursor  // should be non-null after first pull
```

#### Cause: Change applier errors
```typescript
// Check change-applier.ts for UPSERT logic
// Location: packages/app/app/lib/sync/change-applier.ts
// Applies server→client changes using raw SQL UPSERT
```

#### Cause: TanStack Query cache not invalidated
```typescript
// onChangesApplied callback should invalidate relevant queries
// Check if setOnChangesApplied was called on PullService
```

### 7. Backend Handler Not Found

**Symptoms**: `Handler not found for entity type` error.

**Cause**: Handler not registered.

**Fix**:
```typescript
// Location: packages/backend/src/services/sync/sync.service.ts:42-101

HandlerRegistry.register("new_entity", () => {
  return new NewEntitySyncHandler(deps.newEntityRepo);
});
```

### 8. Schema Mismatch

**Symptoms**: `Column sync_status does not exist` or similar.

**Cause**: Schema not updated in one of:
- `packages/shared/src/schema.ts` (PGlite)
- `packages/backend/src/db/schema/*.ts` (PostgreSQL)
- Database migration not run

**Fix**:
```bash
cd packages/backend
bun run db:push
```

### 9. Idempotency Key Conflicts

**Symptoms**: Operations being processed twice or rejected.

**Debug**:
```typescript
// idempotency_key should be unique per business
// Location: packages/app/app/lib/sync/sync-service.ts
```

**Note**: The server uses `sync_operations.operationId` as idempotency key. If the same operation is sent twice, the server returns the cached result (success or failure).

### 10. Sync Hooks Are Disabled

**NOTE**: Sync hooks are disabled. All operations proceed directly to the queue without pre-sync validation.

### 11. Sync Getting Stuck After Offline/Online

**Symptoms**: After going offline then online, sync doesn't resume.

**Cause**: Backoff timer may be at max, blocking retries.

**Fix**:
```typescript
// Reset backoff manually
syncService.resetBackoff()

// Or use force reset
coordinator.forceResetSync()
```

### 12. Device Tracking Not Working

**Symptoms**: `deviceId` field not being captured in sync operations.

**Note**: `sync_device_tracking` table exists (migration 0052) but is not yet wired into the sync flow. The `deviceId` field is captured in `SyncOperationInput` but not currently persisted to `sync_device_tracking`. This is known partial infrastructure.

### 13. Sync resume feels slow after refresh/reopen

**Symptoms**: After page refresh, pending operations stay visible for several seconds before push starts.

**Expected Behavior**:
- `startAutoSync()` should trigger one immediate `processPending()` plus interval scheduling.

**Debug**:
```typescript
// Confirm startup logs
// [Perf][ServicesProvider] startup
// [Perf][EngineProvider] initDatabase
```

**Fix**:
- Ensure `SyncService.startAutoSync()` includes immediate `processPending()` call
- Verify provider startup sequence does not skip sync initialization

### 14. Worker mode broke sync/database startup

**Symptoms**: Sync/database init fails only when worker mode is enabled.

**Expected Architecture**:
- Worker mode is feature-flagged by `VITE_ENABLE_PGLITE_WORKER`
- Safe fallback to direct PGlite instance must remain available

**Fix**:
- Disable worker flag to confirm fallback path
- Verify worker entrypoint and bundling (`pglite.worker.ts`)
- Do not force worker mode in production without staged validation

## Debugging Tools

### Frontend Console Commands

```typescript
// Get combined push+pull status (via coordinator)
await coordinator.getCombinedStatus()
// { push: { pending, processing, ... }, pull: { isPulling, lastPullTime, ... }, isRunning: true }

// Get push queue status
await syncService.getStatus()

// Get detailed queue status
await syncService.logDetailedStatus()

// Get failed operations
await syncService.getFailedOperations()

// Get problem operations (pending + failed)
await syncService.getProblemOperations()

// Get dead letter queue
await syncService.getDeadLetterOperations()

// Retry a failed operation
await syncService.retryOperation(operationId)

// Retry all dead letter operations
await syncService.retryAllDeadLetterOperations()

// Force push sync
await syncService.processPending(true)  // true = ignoreOnlineCheck

// Force full sync (push + pull)
await coordinator.forceSync()

// Force reset when stuck
await coordinator.forceResetSync()

// Check pull status
pullService.getStatus()
// { isPulling, lastPullTime, lastError, consecutiveFailures, cursor, isStuck, consecutiveStalePulls }
```

### Backend Logs

Check server logs for:
```
📥 SYNC BATCH REQUEST
📋 Processing operation
⚠️ Conflict detected
✅ Sync batch completed
📥 Received changes  (pull)
✅ Applied all N changes  (pull)
⚠️ Pull sync is stuck  (stale detection)
```

### Database Queries

```sql
-- Check pending operations by entity
SELECT entity_type, status, COUNT(*)
FROM sync_operations
WHERE business_id = 'uuid'
GROUP BY entity_type, status;

-- Check dead letter operations
SELECT *
FROM sync_operations
WHERE status = 'dead_letter'
ORDER BY updated_at DESC;

-- Check conflicts
SELECT *
FROM sync_conflicts
WHERE business_id = 'uuid'
  AND status = 'pending';

-- Check sync_operations with device tracking
SELECT operation_id, entity, action, device_id
FROM sync_operations
WHERE business_id = 'uuid'
  AND device_id IS NOT NULL;
```
