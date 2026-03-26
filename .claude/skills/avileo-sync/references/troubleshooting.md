# Troubleshooting Guide

## Common Sync Issues

### 1. Operations Not Being Sent

**Symptoms**: Changes made offline don't appear on server after going online.

**Possible Causes & Solutions**:

#### Cause: Network not available
```typescript
// Check in browser console:
navigator.onLine  // should be true
```

#### Cause: Sync not triggered
```typescript
// Manually trigger sync:
await syncService.processPending();

// Or check if auto-sync is running:
syncService.startAutoSync();
```

#### Cause: Operations stuck in queue with wrong status
```typescript
// Check queue status:
await syncService.getStatus();
// Returns: { pending: 0, processing: 0, failed: 5, ... }
```

#### Cause: Sync hooks disabled
**Note**: Sync hooks are disabled. All operations proceed directly to the queue. If operations aren't syncing, check other causes.

### 2. Operations Not Grouped

**Symptoms**: Sale items sync before sale parent, causing errors.

**Cause**: `syncGroupId` not passed to child operations.

**Debug**:
```typescript
// Check if operations have sync_group_id set:
const pendingOps = await syncService.getProblemOperations();
console.log(pendingOps.map(op => ({
  entityType: op.entity_type,
  entityId: op.entity_id,
  syncGroupId: op.sync_group_id,
})));
```

**Fix**: Ensure `queueSync()` is called with `syncGroupId` for parent and all children.

### 3. Conflict Detection Issues

**Symptoms**: Conflicts not being detected, or false positives.

**Debug**:
```typescript
// Check ConflictResolver for your entity type
// Location: packages/backend/src/services/sync/framework/ConflictResolver.ts

// Ensure version field is incrementing on updates:
const serverVersion = existing.version;
const clientVersion = operation.localVersion;

if (serverVersion > clientVersion) {
  // Conflict detected
}
```

**Common Issues**:
- Version field not incremented on update
- Version field not included in payload
- Using wrong version comparison (>= instead of >)

### 4. Dead Letter Queue Building Up

**Symptoms**: Operations keep failing and moving to dead letter queue.

**Location**: `packages/app/app/lib/sync/sync-service.ts:1265-1323`

**Debug**:
```typescript
// Get dead letter operations:
const dlqOps = await syncService.getDeadLetterOperations();
console.log(dlqOps.map(op => ({
  entityType: op.entity_type,
  error: op.error,
  syncAttempts: op.sync_attempts,
})));
```

**Possible Causes**:
- Network issues
- Server errors (5xx)
- Validation errors (4xx)
- Handler not implemented for entity type

### 5. Sync Hooks Are Disabled

**NOTE**: Sync hooks are disabled. All operations proceed directly to the queue without pre-sync validation. If you need to add validation before sync in the future, re-implement using the `createSyncHook()` pattern in `registry.ts`.

### 6. Pull Sync Not Updating Local Data

**Symptoms**: Server changes not appearing in app.

**Possible Causes**:

#### Cause: Cursor not advancing
```typescript
// Check PullService cursor handling
// Location: packages/app/app/lib/sync/pull-service.ts

// Ensure cursor is being stored and passed:
const cursor = localStorage.getItem('sync_cursor');
const response = await fetch(`/sync/changes?since=${cursor}`);
```

#### Cause: Change applier errors
```typescript
// Check change-applier.ts for UPSERT logic
// Location: packages/app/app/lib/sync/change-applier.ts

// Ensure entity type matches local schema:
const tableMap = {
  sales: 'sales',
  customers: 'customers',
  // ...
};
```

### 7. Backend Handler Not Found

**Symptoms**: `Handler not found for entity type` error.

**Cause**: Handler not registered.

**Fix**:
```typescript
// Location: packages/backend/src/services/sync/framework/HandlerRegistry.ts

export function getHandler(entityType: string, deps: SyncHandlerDeps): ISyncHandler {
  switch (entityType) {
    // ... existing cases ...
    case "new_entity":
      return new NewEntitySyncHandler(deps);
  }
  throw new Error(`Handler not found for entity type: ${entityType}`);
}
```

### 8. Schema Mismatch

**Symptoms**: `Column sync_status does not exist` or similar.

**Cause**: Schema not updated in one of:
- `packages/shared/src/schema.ts` (PGlite)
- `packages/backend/src/db/schema/*.ts` (PostgreSQL)
- Database migration not run

**Fix**:
```bash
# Run database push to update schema
cd packages/backend
bun run db:push

# Or generate and run migration
bun run db:generate
bun run db:migrate
```

### 9. Idempotency Key Conflicts

**Symptoms**: Operations being processed twice or rejected.

**Debug**:
```typescript
// Check idempotency key uniqueness
// Location: packages/app/app/lib/sync/sync-service.ts

// idempotency_key should be unique per business
const existing = await pg.query(
  `SELECT id FROM sync_operations WHERE idempotency_key = $1 AND business_id = $2`,
  [idempotencyKey, businessId]
);
```

### 10. Performance Issues

**Symptoms**: Sync is slow or blocking UI.

**Possible Solutions**:

1. **Reduce batch size**
   ```typescript
   // Location: packages/app/app/lib/sync/config.ts
   export const BATCH_SIZE = 50;  // reduce from 100
   ```

2. **Increase sync interval**
   ```typescript
   // Location: packages/app/app/lib/sync/config.ts
   export const SYNC_INTERVAL_MS = 60_000;  // increase from 30s
   ```

3. **Check for large payloads**
   ```typescript
   // Log payload sizes:
   console.log(`Payload size: ${JSON.stringify(payload).length} bytes`);
   ```

## Debugging Tools

### Frontend Console Commands

```typescript
// Get full sync status
await syncService.getStatus()

// Get detailed queue status
await syncService.logDetailedStatus()

// Get failed operations
await syncService.getFailedOperations()

// Get dead letter queue
await syncService.getDeadLetterOperations()

// Force retry all failed
const failed = await syncService.getFailedOperations();
for (const op of failed) {
  await syncService.retryOperation(op.id);
}
```

### Backend Logs

Check server logs for:
```
📥 Sync batch received
📋 Processing operation
⚠️ Conflict detected
✅ Sync batch completed
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
```
