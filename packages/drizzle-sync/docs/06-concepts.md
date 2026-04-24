# Key Concepts

Deep dive into `@avileo/drizzle-sync` concepts.

## Sync Operations

Operations are the atomic units of sync. Each operation represents a change to one entity:

```typescript
interface SyncOperation {
  id: string;                    // Unique operation ID
  entity_type: string;           // e.g., "customers", "sales"
  entity_id: string;             // ID of the affected entity
  operation: "create" | "update" | "delete";
  data: Record<string, unknown>; // Changed fields
  status: SyncStatus;
  sync_status: SyncStatusType;
  idempotency_key: string;       // Prevents duplicate processing
  created_at: string;
  updated_at: string;
  sync_attempts: number;
  sync_error?: string;
}
```

### Operation Lifecycle

```
pending → processing → syncing → completed
                   ↘         ↗
                     failed
                   ↘         ↗
                   conflict → resolved
                   ↘
                dead_letter
```

## Push Sync (Client → Server)

Push sync sends local changes to the server.

### Flow

1. **Enqueue**: App writes to PGlite, operation added to queue with `pending` status
2. **Process**: `PushSyncService.processPending()` picks up pending operations
3. **Batch**: Operations grouped into batches (default: 50)
4. **Send**: Batch POST to `/sync/batch`
5. **Process**: Server `SyncEngine.processBatch()` handles each operation
6. **Result**: Response indicates success/failure/conflict per operation
7. **Update**: Local status updated accordingly

### Idempotency

Each operation has an `idempotency_key`:
- Format: `{entity_type}:{operation}:{entity_id}:{timestamp}`
- Server uses this to prevent duplicate processing
- Safe to retry operations

## Pull Sync (Server → Client)

Pull sync fetches server changes and applies them locally.

### Flow

1. **Request**: `PullSyncService.pull()` calls `/sync/changes?cursor={cursor}`
2. **Response**: Server returns changes since cursor
3. **Apply**: `ChangeApplier.applyBatch()` applies changes to PGlite
4. **Cursor**: New cursor stored for next request
5. **Invalidate**: TanStack Query cache invalidated for affected entities

### Cursor Pagination

The server tracks a cursor per client:
- Initial: No cursor, fetches everything
- Subsequent: Use last cursor, fetches only changes
- Cursor is encrypted/encoded, not user-visible

## Staged Initial Sync

For first-time sync, data loads in 3 prioritized stages:

### Stages

| Stage | Entities | Description |
|-------|----------|-------------|
| `CRITICAL` | customers, products | Immediate data needed |
| `RECENT_SALES` | sales (7 days) | Recent operational data |
| `HISTORICAL` | everything else | Full data load |

### Why Staged?

Mobile apps need data fast. Loading 100k+ records takes time.

1. User opens app → Show CRITICAL data immediately (customers, products)
2. App usable → Continue loading RECENT_SALES in background
3. Full sync → Finish with HISTORICAL

### Configuration

```typescript
const stagedConfig = {
  stages: {
    CRITICAL: {
      entities: ["customers", "products", "suppliers"],
      timeout: 30000,
    },
    RECENT_SALES: {
      daysBack: 7,
      entities: ["sales", "sale_items"],
      timeout: 60000,
    },
    HISTORICAL: {
      batchSize: 1000,
      timeout: 300000,
    },
  },
};
```

## Conflict Resolution

When the same entity is modified on multiple devices, conflicts occur.

### Detection

Conflicts detected via version numbers:

```typescript
// Server record
{ id: "123", version: 5, data: {...} }

// Client operation
{ entity_id: "123", operation: "update", data: {...}, expected_version: 3 }
```

If `expected_version < server_version`, conflict detected.

### Strategies

```typescript
// In entity config
sales: {
  conflictResolver: "version-based",
  // Options:
  // - "version-based"  : Server wins if server version > local
  // - "last-write-wins": Uses timestamps
  // - "merge"          : Field-level merging
}
```

### Handling Conflicts

1. **Auto-resolve**: Using configured strategy
2. **Pending**: Mark as conflict, don't apply
3. **UI notification**: Show user conflict exists
4. **Manual resolution**: User picks winner

```typescript
// In React
const { conflicts } = useSyncConflicts();

conflicts.map(conflict => (
  <ConflictCard
    key={conflict.id}
    localVersion={conflict.localData}
    serverVersion={conflict.serverData}
    onResolve={(resolution) => resolveConflict(conflict.id, resolution)}
  />
));
```

## Dead Letter Queue (DLQ)

Operations that fail permanently go to DLQ.

### When DLQ?

- Exceeded `maxRetries` (default: 5)
- Non-retryable error (e.g., validation failure)
- Conflict remains unresolved

### Handling DLQ

```typescript
// View DLQ operations
const { deadLetterOperations } = useSyncOperations({ status: "dead_letter" });

// Retry manually
await retryOperation(operationId);

// Or discard
await discardOperation(operationId);
```

## Operation Coalescing

When multiple operations on the same entity reach the queue, they're merged.

### Example

Without coalescing:
1. Client updates field A → pending
2. Client updates field B → pending
3. Sync: Two operations, later one wins

With coalescing:
1. Client updates field A → pending
2. Client updates field B → pending → merged with #1
3. Sync: One operation with both A and B

### Rules

- Same `entity_type` + `entity_id` + `operation` coalesce
- `create` operations merge all fields
- `update` operations deep merge
- `delete` always wins (can't merge deletes)

## Self-Healing

Some errors can be automatically corrected.

### Example: RECORD_NOT_FOUND on Update

```
Client: Update record "123" (exists locally)
Server: Record "123" not found (deleted elsewhere)
↓
Auto-heal: Change update → create
↓
Result: Record recreated on server
```

### Classification

```typescript
const { code, isRetryable, isSelfHealable } = classifyError(error);

// Codes:
// - RECORD_NOT_FOUND    - Self-healable (update → create)
// - VALIDATION_ERROR    - Not retryable
// - NETWORK_ERROR       - Retryable
// - CONFLICT            - Requires manual resolution
```

## Multi-Tenancy

All operations are scoped to a tenant (business).

### How It Works

```typescript
// Config
tenancy: {
  tenantColumn: "business_id",  // DB column
  tenantField: "businessId",    // Operation field
}

// All queries include:
// WHERE business_id = 'biz-123'
```

### User Context

```typescript
// Engine initialization
createSyncClientEngine({
  tenantId: "biz-123",    // Business ID
  userId: "user-456",     // User ID (optional)
});
```

## Error Handling

```typescript
try {
  await syncService.processPending();
} catch (error) {
  const { code, isRetryable, isSelfHealable } = classifyError(error);

  if (!isRetryable) {
    // Move to DLQ
    await moveToDeadLetter(operationId);
  }
}
```

## Next Steps

- [Architecture](./02-architecture.md) - System overview
- [Frontend React](./05-frontend-react.md) - React integration
- [Configuration](./09-configuration.md) - Full config reference
