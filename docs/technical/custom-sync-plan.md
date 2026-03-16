# Custom Synchronization Architecture Plan

> Final decision: Local DB + Outbox Queue + REST Sync endpoints
> ElectricSQL deprecated for business-domain synchronization

**Version:** 1.0  
**Status:** Implementation-Ready  
**Last updated:** March 15, 2026

---

## Overview

This document defines the final synchronization architecture for Avileo's offline-first mobile vendor system. After evaluating ElectricSQL, TanStack DB, and custom implementations, we have decided to adopt a **single, unified synchronization technique** using:

1. **Local database** (IndexedDB via PGLite or native IndexedDB)
2. **Outbox queue pattern** for offline writes
3. **POST /sync/batch** for pushing local changes to server
4. **GET /sync/changes** for pulling server changes to client

This approach replaces ElectricSQL for all business-domain synchronization. ElectricSQL may remain for non-critical, read-only reference data if needed, but all sales, customers, payments, and inventory operations will use the custom sync system.

### Key Context

- **No customer production data exists yet** — migration and backfill complexity is minimal
- Vendors operate in zones with intermittent connectivity
- The system must support 100% offline operation for sales workflows
- Multi-tenancy is enforced at the backend level

---

## Decision

### Chosen Approach: Custom Sync with Outbox Queue

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Local Storage** | IndexedDB (native or via PGLite) | Persist all business data offline |
| **Outbox Queue** | IndexedDB table `sync_operations` | Queue writes when offline |
| **Push API** | `POST /sync/batch` | Send queued operations to server |
| **Pull API** | `GET /sync/changes?since={cursor}` | Fetch server changes since last sync |
| **Conflict Resolution** | Server-side version vector + last-write-wins | Deterministic conflict handling |

### Deprecated Mechanisms

| Mechanism | Status | Replacement |
|-----------|--------|-------------|
| ElectricSQL shapes for business tables | **DEPRECATED** | Custom pull via `/sync/changes` |
| ElectricSQL live queries for sales/customers | **DEPRECATED** | TanStack Query + polling or manual refresh |
| ElectricSQL proxy routes (`/electric/*`) | **DEPRECATED** | Remove or repurpose for non-business data only |
| `sync_status` field in business tables | **RETAINED** | Used by custom sync for tracking |

### Why This Decision

1. **Simplicity**: One sync mechanism reduces cognitive load and debugging complexity
2. **Control**: Full control over conflict resolution, batching, and retry logic
3. **Reliability**: No dependency on Electric Cloud availability or CORS quirks
4. **Cost**: No Electric Cloud subscription or proxy overhead
5. **Debuggability**: Plain HTTP requests are easier to trace than shape streams

---

## Goals

1. **Offline-first writes**: Vendors can create sales, customers, and payments without internet
2. **Automatic sync**: When connectivity returns, queued operations sync automatically
3. **Deterministic conflict resolution**: Same operation always produces same result
4. **Idempotent operations**: Retrying a batch is safe and produces no duplicates
5. **Observable sync state**: UI shows pending count, last sync time, and errors
6. **Multi-tenant isolation**: Sync never leaks data across businesses
7. **Minimal bundle size**: No heavy dependencies like RxDB premium plugins

---

## Non-Goals

1. **Real-time collaboration**: Multiple users editing the same entity simultaneously is not supported
2. **Bi-directional streaming**: No WebSocket or SSE for instant updates (polling is acceptable)
3. **Offline admin features**: Admin dashboard requires online access to see all businesses
4. **Cross-business sync**: Each business syncs independently; no shared data
5. **Historical operation audit**: Sync operations are processed and deleted, not archived forever

---

## Architecture

### System Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Vendor Device)                       │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  REACT APP                                                   │    │
│  │  ├─ UI Components                                            │    │
│  │  ├─ TanStack Query (cache + background refetch)             │    │
│  │  └─ Sync Hooks (useSyncStatus, usePendingCount)             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│  ┌───────────────────────────▼─────────────────────────────────┐    │
│  │  LOCAL DATABASE (IndexedDB)                                  │    │
│  │  ├─ customers         (synced from server)                   │    │
│  │  ├─ sales             (synced from server)                   │    │
│  │  ├─ sale_items        (synced from server)                   │    │
│  │  ├─ abonos            (synced from server)                   │    │
│  │  ├─ products          (synced from server)                   │    │
│  │  ├─ inventory         (synced from server)                   │    │
│  │  └─ sync_operations   (OUTBOX QUEUE - local writes)          │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│  ┌───────────────────────────▼─────────────────────────────────┐    │
│  │  SYNC ENGINE (Custom)                                        │    │
│  │  ├─ enqueueOperation() - Add to outbox                       │    │
│  │  ├─ processQueue() - Send batch to /sync/batch               │    │
│  │  ├─ pullChanges() - Fetch from /sync/changes                 │    │
│  │  ├─ Network listener (online/offline events)                 │    │
│  │  └─ Retry with exponential backoff                           │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                              HTTP/REST
                                    │
┌───────────────────────────────────▼─────────────────────────────────┐
│                            SERVER (Backend)                          │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  SYNC ENDPOINTS                                               │    │
│  │  ├─ POST /sync/batch   - Process queued operations           │    │
│  │  └─ GET /sync/changes  - Return changes since cursor         │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│  ┌───────────────────────────▼─────────────────────────────────┐    │
│  │  SYNC PROCESSOR                                               │    │
│  │  ├─ Validate operation (schema, business context)            │    │
│  │  ├─ Check version/conflict                                    │    │
│  │  ├─ Apply to database (transactional)                        │    │
│  │  ├─ Return result (success/conflict/error)                   │    │
│  │  └─ Update sync_operations table (server-side audit)         │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│  ┌───────────────────────────▼─────────────────────────────────┐    │
│  │  POSTGRESQL                                                   │    │
│  │  ├─ business tables (customers, sales, abonos, etc.)         │    │
│  │  ├─ sync_operations (server-side processing log)             │    │
│  │  └─ sync_cursors (track last pull per business/user)         │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### Sync Flow (Write Path)

```
1. User creates a sale (offline)
   └─ UI calls createSale(data)
   └─ Sync Engine checks: isOnline()?
      ├─ YES → POST /api/sales → Return result
      └─ NO  → enqueueOperation({ entity: 'sales', action: 'insert', data })
               └─ Write to sync_operations (IndexedDB)
               └─ Write to sales (IndexedDB) with sync_status='pending'
               └─ Return optimistic result to UI

2. Network returns (online event)
   └─ Sync Engine calls processQueue()
   └─ Read all sync_operations with status='pending'
   └─ Group into batches (max 50 operations)
   └─ POST /sync/batch with operations
   └─ Server processes each operation:
      ├─ Success → Mark as 'completed', update local DB
      ├─ Conflict → Mark as 'conflict', return server data
      └─ Error → Mark as 'failed', increment retry count
   └─ UI updates based on results
```

### Sync Flow (Read Path)

```
1. App initializes or network returns
   └─ Sync Engine calls pullChanges()
   └─ Read last cursor from localStorage: 'sync_cursor_{businessId}'
   └─ GET /sync/changes?since={cursor}&entities=sales,customers,abonos
   └─ Server returns:
      ├─ changes: Array of { entity, id, action, data, version }
      ├─ cursor: New cursor for next pull
      └─ hasMore: Boolean (paginate if needed)
   └─ Apply changes to IndexedDB:
      ├─ INSERT → Add new records
      ├─ UPDATE → Update existing records (if version > local)
      └─ DELETE → Remove records
   └─ Update sync_status to 'synced' for matched records
   └─ Save new cursor to localStorage
```

---

## Invariants

These rules MUST always hold true. Violations indicate bugs.

| ID | Invariant | Enforcement |
|----|-----------|-------------|
| I1 | Every write operation has exactly one `sync_operation` record | Transactional enqueue |
| I2 | `sync_status` is never 'synced' for records with pending operations | Status transition checks |
| I3 | Operations are processed in FIFO order within an entity | Queue ordering by `created_at` |
| I4 | Server rejects operations with stale version numbers | Version check in sync processor |
| I5 | `businessId` in operation matches authenticated user's business | Backend auth middleware |
| I6 | Cursor is monotonically increasing per business | Server generates cursor from WAL position |
| I7 | Idempotency key prevents duplicate processing | Unique constraint on `operation_id` |
| I8 | Failed operations retry up to MAX_RETRIES before dead-letter | Retry counter in queue processor |

---

## Data Model Requirements

### Client-Side (IndexedDB)

#### sync_operations (Outbox Queue)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Local primary key |
| `operation_id` | string | Idempotency key (unique per operation) |
| `entity` | string | Table name: 'sales', 'customers', 'abonos' |
| `action` | string | 'insert', 'update', 'delete' |
| `entity_id` | string | ID of the affected record |
| `payload` | object | The data to sync |
| `status` | string | 'pending', 'syncing', 'completed', 'failed', 'conflict' |
| `sync_attempts` | number | Count of sync attempts |
| `last_error` | string? | Error message if failed |
| `last_attempt_at` | Date? | Timestamp of last attempt |
| `created_at` | Date | When operation was created |
| `updated_at` | Date | When status last changed |

#### Business Tables (customers, sales, etc.)

All synced tables MUST include:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Primary key |
| `sync_status` | string | 'synced', 'pending', 'error' |
| `version` | number | Version number for conflict detection |
| `updated_at` | Date | Last modification time |

### Server-Side (PostgreSQL)

#### sync_operations (Processing Log)

Already exists in `packages/backend/src/db/schema/sync-operations.ts`:

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `business_id` | uuid | Business context |
| `operation_id` | varchar(128) | Idempotency key |
| `entity` | varchar(64) | Table name |
| `action` | varchar(32) | 'insert', 'update', 'delete' |
| `entity_id` | varchar(128) | Affected record ID |
| `payload` | jsonb | Operation data |
| `status` | varchar(32) | 'pending', 'processed', 'failed', 'conflict' |
| `error` | text? | Error message |
| `client_timestamp` | timestamp | When client created operation |
| `processed_at` | timestamp? | When server processed it |
| `created_at` | timestamp | Server receipt time |

#### sync_cursors (New Table)

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `business_id` | uuid | Business context |
| `user_id` | uuid? | Optional: per-user cursor |
| `entity` | varchar(64) | Entity name or 'all' |
| `cursor` | varchar(256) | Last sync position (WAL LSN or timestamp) |
| `updated_at` | timestamp | Last pull time |

---

## Backend Responsibilities

### 1. POST /sync/batch Endpoint

```typescript
// packages/backend/src/api/sync.ts

interface SyncBatchRequest {
  operations: Array<{
    operationId: string;      // Idempotency key
    entity: string;           // 'sales', 'customers', etc.
    action: 'insert' | 'update' | 'delete';
    entityId: string;
    payload: Record<string, unknown>;
    clientTimestamp: string;
    version?: number;         // For updates, client's current version
  }>;
}

interface SyncBatchResponse {
  results: Array<{
    operationId: string;
    success: boolean;
    error?: string;
    conflict?: {
      serverVersion: number;
      serverData: Record<string, unknown>;
    };
    entityId?: string;        // Server-assigned ID for inserts
  }>;
  serverVersion?: number;     // Latest version for cursor calculation
}
```

**Implementation:**

1. Validate JWT and extract `businessId`, `userId`
2. For each operation:
   - Check idempotency key (skip if already processed)
   - Validate payload against schema
   - Check version (for updates) against current record
   - Apply operation in transaction
   - Update `sync_operations` table
3. Return results array

### 2. GET /sync/changes Endpoint

```typescript
// packages/backend/src/api/sync.ts

interface SyncChangesRequest {
  since: string;              // Cursor from last pull
  entities?: string[];        // Optional: filter by entities
  limit?: number;             // Default: 100
}

interface SyncChangesResponse {
  changes: Array<{
    entity: string;
    id: string;
    action: 'insert' | 'update' | 'delete';
    data: Record<string, unknown>;
    version: number;
  }>;
  cursor: string;             // New cursor for next pull
  hasMore: boolean;
}
```

**Implementation:**

1. Validate JWT and extract `businessId`
2. Parse cursor (or use `sync_cursors` table)
3. Query each entity for changes since cursor:
   ```sql
   SELECT * FROM sales 
   WHERE business_id = $1 
     AND updated_at > $2 
   ORDER BY updated_at ASC
   LIMIT $3
   ```
4. Build changes array with action detection:
   - If `deleted_at` is set → 'delete'
   - Otherwise → 'insert' or 'update' based on version
5. Generate new cursor from latest `updated_at`
6. Return response

### 3. Conflict Detection

```typescript
// In sync processor

async function processUpdateOperation(op: SyncOperation, ctx: RequestContext) {
  const currentRecord = await db.select()
    .from(sales)
    .where(eq(sales.id, op.entityId))
    .first();

  // Version mismatch = conflict
  if (currentRecord && currentRecord.version !== op.version) {
    return {
      success: false,
      conflict: {
        serverVersion: currentRecord.version,
        serverData: currentRecord,
      },
    };
  }

  // Apply update with version increment
  await db.update(sales)
    .set({
      ...op.payload,
      version: sql`${sales.version} + 1`,
      updated_at: new Date(),
    })
    .where(eq(sales.id, op.entityId));

  return { success: true };
}
```

---

## Frontend Responsibilities

### 1. Sync Engine Service

```typescript
// packages/app/app/lib/sync/custom-sync-service.ts

export class CustomSyncService {
  private db: IDBDatabase;
  private isOnline: boolean;
  private syncInterval: number | null = null;

  async initialize(): Promise<void> {
    this.db = await openDatabase();
    this.isOnline = navigator.onLine;
    
    // Listen for network changes
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Start sync loop
    this.startSyncLoop();
  }

  async enqueueOperation(params: EnqueueParams): Promise<void> {
    const operation: SyncOperationRecord = {
      id: crypto.randomUUID(),
      operation_id: params.idempotencyKey || crypto.randomUUID(),
      entity: params.entity,
      action: params.operation,
      entity_id: params.entityId,
      payload: params.data,
      status: 'pending',
      sync_attempts: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await this.db.transaction('readwrite', ['sync_operations', params.entity], async (tx) => {
      // Add to outbox
      await tx.objectStore('sync_operations').add(operation);
      
      // Update entity with pending status
      const entityStore = tx.objectStore(params.entity);
      const existing = await entityStore.get(params.entityId);
      await entityStore.put({
        ...existing,
        ...params.data,
        id: params.entityId,
        sync_status: 'pending',
        updated_at: new Date(),
      });
    });
  }

  async processQueue(): Promise<void> {
    const pendingOps = await this.getPendingOperations();
    if (pendingOps.length === 0) return;

    // Mark as syncing
    await this.updateOperationsStatus(pendingOps.map(o => o.id), 'syncing');

    // Send batch
    const response = await fetch('/api/sync/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operations: pendingOps }),
    });

    const result = await response.json();
    await this.handleBatchResult(result);
  }

  async pullChanges(): Promise<void> {
    const cursor = localStorage.getItem(`sync_cursor_${this.businessId}`) || '0';
    
    const response = await fetch(
      `/api/sync/changes?since=${cursor}&limit=100`
    );
    
    const { changes, cursor: newCursor, hasMore } = await response.json();
    
    await this.applyChanges(changes);
    localStorage.setItem(`sync_cursor_${this.businessId}`, newCursor);
    
    if (hasMore) {
      await this.pullChanges(); // Recurse for pagination
    }
  }

  private startSyncLoop(): void {
    this.syncInterval = window.setInterval(() => {
      if (this.isOnline) {
        this.processQueue();
        this.pullChanges();
      }
    }, 30_000); // 30 seconds
  }
}
```

### 2. React Hooks

```typescript
// packages/app/app/lib/sync/hooks/use-sync-status.ts

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>({
    pending: 0,
    syncing: 0,
    completed: 0,
    failed: 0,
  });

  useEffect(() => {
    const unsubscribe = syncService.subscribe(setStatus);
    return unsubscribe;
  }, []);

  return status;
}

// packages/app/app/lib/sync/hooks/use-offline-mutation.ts

export function useOfflineMutation<T>(options: {
  entity: string;
  mutationFn: (data: T) => Promise<void>;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: T) => {
      if (navigator.onLine) {
        await options.mutationFn(data);
      } else {
        await syncService.enqueueOperation({
          entity: options.entity,
          action: 'insert',
          entityId: crypto.randomUUID(),
          data,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [options.entity] });
    },
  });
}
```

---

## Queue Design

### Outbox Pattern

All write operations follow this sequence:

```
1. UI calls createSale(data)
2. Sync Engine:
   a. Generate UUID for sale
   b. Generate idempotency key
   c. Begin IndexedDB transaction:
      - Insert into sync_operations (status='pending')
      - Insert into sales (sync_status='pending')
   d. Commit transaction
3. Return optimistic result to UI
4. Background sync loop sends to server
5. On success:
   - Update sync_operations.status = 'completed'
   - Update sales.sync_status = 'synced'
   - Update sales.version = serverVersion
```

### Queue Ordering

Operations are processed in FIFO order by `created_at` timestamp. This ensures:
- Sales are created before their items
- Customers exist before sales reference them
- Payments are applied after sales

### Batch Size

- Maximum 50 operations per batch
- Batch timeout: 5 seconds (or send immediately if queue is small)
- Operations for the same entity are grouped together

---

## Pull Cursor Design

### Cursor Format

Use PostgreSQL WAL LSN (Log Sequence Number) or timestamp-based cursor:

```typescript
// Option 1: Timestamp-based (simpler)
type Cursor = string; // ISO timestamp: "2026-03-15T10:30:00.000Z"

// Option 2: LSN-based (more precise)
type Cursor = string; // Base64 encoded LSN: "AAAAAA=="
```

### Cursor Storage

```typescript
// Client-side (localStorage)
const CURSOR_KEY = (businessId: string) => `sync_cursor_${businessId}`;

function saveCursor(businessId: string, cursor: string): void {
  localStorage.setItem(CURSOR_KEY(businessId), cursor);
}

function loadCursor(businessId: string): string | null {
  return localStorage.getItem(CURSOR_KEY(businessId));
}
```

### Initial Pull

On first sync (no cursor), pull last 7 days of data:

```typescript
const initialCursor = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
await pullChanges(initialCursor);
```

---

## Conflict Resolution

### Strategy: Last-Write-Wins with Version Check

1. **Insert operations**: No conflict possible (server assigns ID if needed)
2. **Update operations**: Compare version numbers
   - If client version < server version → CONFLICT
   - If client version === server version → Apply update
3. **Delete operations**: Check if record still exists
   - If deleted already → Success (idempotent)
   - If modified since → CONFLICT

### Conflict Response

```typescript
interface ConflictResponse {
  operationId: string;
  conflict: {
    serverVersion: number;
    serverData: Record<string, unknown>;
    clientVersion: number;
    clientData: Record<string, unknown>;
  };
}
```

### Client-Side Conflict Handling

```typescript
async function handleConflict(conflict: ConflictResponse): Promise<void> {
  // Option 1: Auto-resolve (server wins)
  await applyServerData(conflict.conflict.serverData);
  
  // Option 2: Prompt user
  const resolution = await showConflictDialog(conflict);
  if (resolution === 'keep-mine') {
    await requeueWithNewVersion(conflict);
  } else {
    await applyServerData(conflict.conflict.serverData);
  }
}
```

---

## Idempotency

### Idempotency Key Generation

```typescript
function generateIdempotencyKey(
  entity: string,
  action: string,
  entityId: string,
  timestamp: number
): string {
  return `${entity}:${action}:${entityId}:${timestamp}`;
}
```

### Server-Side Deduplication

```sql
-- Unique constraint ensures one operation per idempotency key
CREATE UNIQUE INDEX uq_sync_operations_business_operation 
ON sync_operations (business_id, operation_id);
```

### Processing Logic

```typescript
async function processOperation(op: SyncOperation): Promise<Result> {
  // Check if already processed
  const existing = await db.select()
    .from(syncOperations)
    .where(and(
      eq(syncOperations.businessId, ctx.businessId),
      eq(syncOperations.operationId, op.operationId)
    ))
    .first();

  if (existing && existing.status === 'processed') {
    // Return cached result (idempotent)
    return { success: true, cached: true };
  }

  // Process operation...
}
```

---

## Retry/Backoff Policy

### Client-Side Retry

```typescript
const RETRY_CONFIG = {
  maxRetries: 5,
  initialDelay: 1000,   // 1 second
  maxDelay: 30000,      // 30 seconds
  backoffMultiplier: 2,
};

function calculateDelay(attempt: number): number {
  const delay = RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
  return Math.min(delay, RETRY_CONFIG.maxDelay);
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  attempt: number = 0
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (attempt >= RETRY_CONFIG.maxRetries) {
      throw error;
    }
    
    const delay = calculateDelay(attempt);
    await sleep(delay);
    
    return retryWithBackoff(fn, attempt + 1);
  }
}
```

### Dead Letter Queue

After `maxRetries` attempts, operations move to `status='dead_letter'`:

```typescript
async function markAsDeadLetter(operationId: string, error: string): Promise<void> {
  await db.update(syncOperations)
    .set({
      status: 'dead_letter',
      last_error: error,
      updated_at: new Date(),
    })
    .where(eq(syncOperations.id, operationId));
}
```

---

## Observability

### Client-Side Metrics

```typescript
interface SyncMetrics {
  pendingCount: number;
  failedCount: number;
  lastSyncAt: Date | null;
  lastSyncDuration: number | null;
  averageLatency: number | null;
  errorRate: number; // 0-1
}

// Exposed via React hook
const metrics = useSyncMetrics();
```

### Server-Side Metrics

```typescript
// Track in sync_operations table
SELECT 
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_latency_seconds
FROM sync_operations
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY status;
```

### Logging

```typescript
// Client-side
syncLogger.info('Operation enqueued', { entity, operationId });
syncLogger.error('Batch failed', { error, operationIds });

// Server-side
logger.info('Sync batch received', { businessId, operationCount });
logger.warn('Conflict detected', { operationId, entity, entityId });
```

---

## Rollout Phases

### Phase 1: Foundation (Week 1-2)

- [ ] Create `sync_cursors` table in PostgreSQL
- [ ] Implement `POST /sync/batch` endpoint
- [ ] Implement `GET /sync/changes` endpoint
- [ ] Create `CustomSyncService` class in frontend
- [ ] Add IndexedDB schema for `sync_operations`

### Phase 2: Core Entities (Week 3-4)

- [ ] Migrate `customers` to custom sync
- [ ] Migrate `sales` and `sale_items` to custom sync
- [ ] Migrate `abonos` to custom sync
- [ ] Remove Electric shapes for these entities

### Phase 3: Supporting Entities (Week 5-6)

- [ ] Migrate `products` to custom sync
- [ ] Migrate `inventory` to custom sync
- [ ] Migrate `distribuciones` to custom sync
- [ ] Remove all Electric dependencies (or keep for non-business data)

### Phase 4: Polish & Monitoring (Week 7-8)

- [ ] Add sync status UI indicators
- [ ] Implement conflict resolution UI
- [ ] Add observability dashboards
- [ ] Load testing with 1000+ operations
- [ ] Documentation and training

---

## Affected Areas

### Backend Files

| File | Change |
|------|--------|
| `packages/backend/src/api/sync.ts` | Rewrite for batch/changes endpoints |
| `packages/backend/src/api/electric.ts` | **DEPRECATE** or repurpose |
| `packages/backend/src/db/schema/sync-operations.ts` | Add indexes, update fields |
| `packages/backend/src/db/schema/sync-cursors.ts` | **NEW** - Cursor tracking |
| `packages/backend/src/services/sync.processor.ts` | **NEW** - Operation processing |

### Frontend Files

| File | Change |
|------|--------|
| `packages/app/app/lib/sync/sync-service.ts` | **REPLACE** with CustomSyncService |
| `packages/app/app/lib/sync/custom-sync-service.ts` | **NEW** - Main sync engine |
| `packages/app/app/lib/sync/pull-service.ts` | **REWRITE** for /sync/changes |
| `packages/app/app/lib/sync/shape-config.ts` | **REMOVE** or repurpose |
| `packages/app/app/lib/sync/sync-shapes.ts` | **REMOVE** |
| `packages/app/app/lib/db/schema.ts` | Add version fields to all entities |

### Deprecated Files (Remove After Phase 3)

| File | Reason |
|------|--------|
| `packages/app/app/lib/sync/sync-shapes.ts` | Electric shapes no longer used |
| `packages/app/app/lib/db/electric-sync-events.ts` | Electric events replaced |
| `packages/backend/src/api/electric.ts` | Proxy no longer needed |

---

## Acceptance Criteria

### Functional Requirements

- [ ] Vendors can create sales offline and sync when online
- [ ] Vendors can create customers offline and sync when online
- [ ] Vendors can record payments offline and sync when online
- [ ] Sync status is visible in UI (pending count, last sync time)
- [ ] Conflicts are detected and reported to user
- [ ] Retry logic handles transient failures automatically
- [ ] Dead-letter operations are logged and visible to admin

### Non-Functional Requirements

- [ ] Sync latency < 5 seconds for 95% of operations
- [ ] Offline writes complete in < 100ms (IndexedDB)
- [ ] Batch processing handles 100 operations in < 10 seconds
- [ ] No data loss on network failure during sync
- [ ] Bundle size increase < 50KB (no heavy dependencies)

### Quality Requirements

- [ ] Unit tests for CustomSyncService (80%+ coverage)
- [ ] Integration tests for /sync/batch endpoint
- [ ] E2E test for offline-to-online sync flow
- [ ] Documentation for conflict resolution process

---

## Immediate Next Steps

1. **Create sync_cursors table**
   - Add migration: `packages/backend/src/db/migrations/`
   - Add schema: `packages/backend/src/db/schema/sync-cursors.ts`

2. **Implement POST /sync/batch**
   - Create processor service
   - Add idempotency check
   - Add version conflict detection

3. **Implement GET /sync/changes**
   - Design cursor format (timestamp or LSN)
   - Implement change detection query
   - Add pagination support

4. **Create CustomSyncService**
   - Implement enqueueOperation()
   - Implement processQueue()
   - Implement pullChanges()
   - Add network listener

5. **Update sync_operations schema**
   - Add `version` field for updates
   - Add `idempotency_key` field
   - Add proper indexes

---

## References

- [Offline Analysis](./offline-analysis.md) - Detailed offline requirements
- [Electric Considerations](./electric-sales-sync-considerations.md) - Lessons learned
- [TanStack DB Implementation](./tanstack-db.md) - Previous approach
- [Database Schema](./database.md) - Entity definitions

---

*This document represents the final architectural decision for Avileo's synchronization system. All future sync-related work should reference this plan.*
