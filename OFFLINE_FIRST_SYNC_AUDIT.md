# Avileo Offline-First & Sync Architecture - Complete Audit

**Date**: February 22, 2026  
**Purpose**: Comprehensive mapping of all offline-first and sync functionality patterns in the Avileo codebase  
**Scope**: Backend schema, sync engine, frontend data layer, TanStack Query hooks, IndexedDB persistence

---

## Executive Summary

Avileo implements a complete **offline-first architecture** with the following components:

| Component | Technology | Files | Purpose |
|-----------|-----------|-------|---------|
| **DB Schema** | PostgreSQL + Drizzle ORM | `packages/backend/src/db/schema/` | Define tables with `sync_status` & `sync_attempts` |
| **Sync Engine** | Custom TypeScript (30s interval) | `packages/app/app/lib/sync/client.ts` | Orchestrates push/pull sync cycles |
| **Operation Queue** | Native IndexedDB | `packages/app/app/lib/sync/queue.ts` | Persists pending operations offline |
| **Sync Cursor** | localStorage | `packages/app/app/lib/sync/storage.ts` | Tracks sync position for change feed |
| **Offline Mutations** | IsOnline check + enqueue | `packages/app/app/lib/db/collections.ts` | Queues writes when offline |
| **React Hooks** | TanStack Query v5 | `packages/app/app/hooks/use-*.ts` | Exposes mutations/queries with cache invalidation |
| **API Endpoints** | ElysiaJS | `packages/backend/src/api/sync.ts` | `/sync/batch` (push) & `/sync/changes` (pull) |
| **Server Processor** | Drizzle transactions | `packages/backend/src/services/sync/sync.service.ts` | Applies batch operations & records changes |

---

## 1. Database Schema: Sync-Enabled Tables

### 1.1 Tables with `sync_status` and `sync_attempts`

All syncable tables include two fields for offline-first tracking:

```typescript
syncStatus: syncStatusEnum("sync_status").notNull().default("pending")  // 'pending' | 'synced' | 'error'
syncAttempts: integer("sync_attempts").notNull().default(0)             // Retry counter
```

| Table | File Path | Lines | Notes |
|-------|-----------|-------|-------|
| **customers** | `packages/backend/src/db/schema/customers.ts` | 31-33, 49 (index) | Core customer with offline support |
| **sales** | `packages/backend/src/db/schema/sales.ts` | 49-51, 63 (index) | Sales with sync status + denormalized items for offline |
| **sale_items** | `packages/backend/src/db/schema/sales.ts` | 68-97 | Nested items in sales (cascade delete) |
| **abonos** (payments) | `packages/backend/src/db/schema/payments.ts` | 50-52, 66 (index) | Payment records with sync tracking |
| **distribuciones** | `packages/backend/src/db/schema/inventory.ts` | ~110-112, 145-146 | Distribution/assignment with sync |
| **product_variants** | `packages/backend/src/db/schema/inventory.ts` | ~110-112 | Product variants with sync fields |

### 1.2 Sync Enum Definition

**File**: `packages/backend/src/db/schema/enums.ts` (lines 16-21)

```typescript
export const syncStatusEnum = pgEnum("sync_status", [
  "pending",   // Created/updated offline, waiting to sync
  "synced",    // Successfully synced with backend
  "error",     // Sync failed after retries
]);
```

### 1.3 Database Indexes for Sync Queries

All tables include index on `sync_status` for efficient sync queue filtering:

```sql
CREATE INDEX "idx_customers_sync_status" ON "customers" USING btree ("sync_status");
CREATE INDEX "idx_sales_sync_status" ON "sales" USING btree ("sync_status");
-- ... etc for all syncable tables
```

---

## 2. Frontend: Offline-First Data Layer

### 2.1 Sync Status Schema (Zod)

**File**: `packages/app/app/lib/db/schema.ts`

All syncable entities in the frontend include:

```typescript
syncStatus: z.enum(["pending", "synced", "error"]).default("pending"),
createdAt: z.coerce.date(),
updatedAt: z.coerce.date(),
```

This mirrors backend schema structure and enables runtime validation.

### 2.2 Collection Functions: Offline-First CRUD

**File**: `packages/app/app/lib/db/collections.ts`

#### Pattern: Check Online → Enqueue or API Call

Every write operation (create/update/delete) follows this pattern:

```typescript
export async function createCustomer(data: { name: string; ... }): Promise<Customer> {
  // 1. Check if online
  if (!isOnline()) {
    // 2. Generate temp ID for optimistic UI
    const tempId = createSyncId();
    
    // 3. Queue operation for later sync
    await syncClient.enqueueOperation({
      entity: "customers",        // Entity type
      operation: "insert",        // Action (insert|update|delete)
      entityId: tempId,           // ID (can be temp)
      data,                       // Payload
      lastError: undefined,       // Error tracking
    });
    
    // 4. Return optimistic entity (UI updates immediately)
    return {
      id: tempId,
      name: data.name,
      syncStatus: "pending",      // Mark as pending sync
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  
  // 5. Online: direct API call
  const response = await api.customers.post(data);
  if (response.error) throw new Error(String(response.error.value));
  return response.data as unknown as Customer;
}
```

#### Synced Entities and Their Lines

| Entity | Function | File | Lines | Notes |
|--------|----------|------|-------|-------|
| **customers** | createCustomer | collections.ts | 24-53 | Check isOnline(), enqueue or post |
| | updateCustomer | collections.ts | 55-88 | Filter undefined fields before API |
| | deleteCustomer | collections.ts | 90-105 | Enqueue delete or direct delete |
| **sales** | createSale | collections.ts | 107-170 | Full sale with items, handles offline |
| **payments** | createPayment | collections.ts | 172-201 | Payment creation offline |
| | deletePayment | collections.ts | 203-220 | Payment deletion offline |

---

## 3. Sync Engine: Client-Side Orchestration

### 3.1 SyncClient Class

**File**: `packages/app/app/lib/sync/client.ts` (253 lines)

The `SyncClient` singleton manages all sync operations:

#### Key Methods

| Method | Lines | Purpose |
|--------|-------|---------|
| `start()` | 75-93 | Register online/offline listeners; start 30s interval sync |
| `stop()` | 95-111 | Cleanup listeners and timers |
| `enqueueOperation()` | 60-73 | Add operation to IndexedDB queue |
| `forceSync()` | 113-115 | Trigger sync immediately |
| `getState()` | 56-58 | Get current sync engine state |
| `subscribe()` | 48-54 | Listen to state changes (for React hooks) |
| `runSyncCycle()` | 129-171 | Main sync loop (push then pull) |
| `pushBatch()` | 173-210 | POST pending operations to `/sync/batch` |
| `pullChanges()` | 212-240 | GET processed changes from `/sync/changes` |

#### Sync State Machine

```
idle → (setInterval 30s OR online event) → syncing
                                              ↓
                            pushBatch() + pullChanges()
                                              ↓
                            success → idle (if pending > 0: idle else idle)
                                   ↓
                              error → error state
```

#### Core Sync Cycle (lines 129-171)

```typescript
private async runSyncCycle() {
  if (!isOnline()) {
    await this.refreshPendingCount();
    this.setState({ isConnected: false, status: "offline" });
    return;
  }
  
  if (this.syncLock) return;  // Prevent concurrent syncs
  
  this.syncLock = true;
  this.setState({ status: "syncing", isSyncing: true });
  
  try {
    await this.pushBatch();    // POST operations
    await this.pullChanges();  // GET changes
    await this.refreshPendingCount();
    this.setState({ status: "idle", isSyncing: false });
  } catch (error) {
    this.setState({ status: "error", isSyncing: false, lastError: message });
  } finally {
    this.syncLock = false;
  }
}
```

#### Push Batch (lines 173-210)

Collects up to 50 pending operations and POSTs them:

```typescript
private async pushBatch() {
  const operations = await listPending(50);
  if (operations.length === 0) return;
  
  const payload = operations.map((operation) => ({
    operationId: operation.id,
    entity: operation.entity,
    action: operation.operation,
    entityId: operation.entityId,
    payload: operation.data,
    clientTimestamp: new Date(operation.timestamp).toISOString(),
  }));
  
  const response = await api.sync.batch.post({ operations: payload });
  // Process results: mark processed or failed
}
```

#### Pull Changes (lines 212-240)

Fetches changes processed by the server:

```typescript
private async pullChanges() {
  const since = SyncStorage.getCursor();
  const response = await api.sync.changes.get({
    query: { since: since || undefined, limit: "100" }
  });
  
  const nextSince = body?.data?.nextSince;
  if (nextSince) {
    SyncStorage.setCursor(nextSince);  // Update cursor
  }
  
  SyncStorage.setLastSyncAt(new Date());
}
```

---

## 4. IndexedDB Queue: Offline Operation Storage

### 4.1 Queue Implementation

**File**: `packages/app/app/lib/sync/queue.ts` (160 lines)

Uses **native IndexedDB** (not idb-keyval) to persist operations locally.

#### Database Schema

| Property | Type | Index | Purpose |
|----------|------|-------|---------|
| `DB_NAME` | "avileo-sync" | - | Database name |
| `DB_VERSION` | 1 | - | Schema version |
| `STORE_NAME` | "operations" | keyPath: "id" | Object store |
| - | - | "status" | Query by pending/processed/failed |
| - | - | "createdAt" | Sort by creation time |

#### QueueOperation Type (lines 9-14)

```typescript
export interface QueueOperation extends SyncOperation {
  status: "pending" | "processed" | "failed";  // Processing state
  retryCount: number;                          // Number of retry attempts
  createdAt: number;                           // Timestamp (ms)
  updatedAt: number;                           // Last update timestamp
}
```

#### Queue Functions

| Function | Lines | Purpose |
|----------|-------|---------|
| `openDb()` | 27-45 | Open/create IndexedDB database |
| `withStore()` | 47-68 | Transaction wrapper (auto-commit/rollback) |
| `enqueue()` | 70-91 | Add SyncOperation to queue (status: pending) |
| `listPending()` | 93-106 | Get up to N pending operations, sorted by creation |
| `getPendingCount()` | 108-118 | Count of pending operations |
| `markProcessed()` | 120-136 | Mark operation as processed + clear error |
| `markFailed()` | 138-159 | Mark as failed (or pending if retryable) + increment retry |

#### Error Handling in Queue

When sync fails:

```typescript
export async function markFailed(
  operationId: string,
  error: string,
  retryable = true
): Promise<void> {
  // If retryable: status stays "pending" (will retry in next cycle)
  // If not retryable: status = "failed" (won't retry)
  existing.status = retryable ? "pending" : "failed";
  existing.retryCount += 1;
  existing.lastError = error;  // Capture error message
}
```

---

## 5. Sync Storage: Cursor & Metadata

### 5.1 SyncStorage (localStorage)

**File**: `packages/app/app/lib/sync/storage.ts` (43 lines)

Persists sync metadata in browser localStorage:

| Key | Purpose | Type |
|-----|---------|------|
| `"avileo-sync-last-since"` | Sync cursor (from server) | string \| null |
| `"avileo-sync-last-at"` | Last successful sync timestamp | ISO string \| null |

Used by:
- `pullChanges()` to fetch only new changes (`since={cursor}`)
- React components to show "Last synced at: 2:30 PM"

---

## 6. Sync Utilities

### 6.1 Helper Functions

**File**: `packages/app/app/lib/sync/utils.ts` (16 lines)

#### createSyncId()

```typescript
export function createSyncId(): string {
  // Uses Web Crypto for UUIDs (if available)
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback: timestamp + random (for older browsers)
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
```

**Used for**: Generating temporary IDs for offline-created entities. When synced, server returns real IDs.

#### isOnline()

```typescript
export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;  // SSR fallback
  return navigator.onLine;
}
```

**Used for**: Every write operation to decide: enqueue or API call.

---

## 7. TanStack Query Integration

### 7.1 React Hooks Using TanStack Query

**File Locations**: `packages/app/app/hooks/use-*.ts`

All data fetching uses **TanStack Query v5** with `useQuery` (reads) and `useMutation` (writes).

#### useCustomers Hook

**File**: `packages/app/app/hooks/use-customers.ts` (191 lines)

```typescript
// Query hooks (reads)
export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ["customers", id],
    queryFn: () => getCustomer(id),
    enabled: !!id,
  });
}

// Mutation hooks (writes - with offline support)
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createCustomer,  // Checks isOnline() internally
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateCustomer,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers", variables.id] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}
```

#### Mutation Functions (lines 53-141)

```typescript
// CREATE
async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  if (!isOnline()) {
    const tempId = createSyncId();
    await syncClient.enqueueOperation({
      entity: "customers",
      operation: "insert",
      entityId: tempId,
      data: { ...input },
      lastError: undefined,
    });
    
    return {
      id: tempId,
      name: input.name,
      syncStatus: "pending",
      createdAt: new Date(),
    };
  }
  
  const { data, error } = await api.customers.post(input);
  if (error) throw new Error(String(error.value));
  return data as unknown as Customer;
}

// UPDATE
async function updateCustomer({
  id,
  ...input
}: UpdateCustomerInput & { id: string }): Promise<Customer> {
  if (!isOnline()) {
    await syncClient.enqueueOperation({
      entity: "customers",
      operation: "update",
      entityId: id,
      data: { ...input },
      lastError: undefined,
    });
    
    return {
      id,
      name: input.name ?? "",
      syncStatus: "pending",
      createdAt: new Date(),
    };
  }
  
  const { data, error } = await api.customers({ id }).put(input);
  if (error) throw new Error(String(error.value));
  return data as unknown as Customer;
}

// DELETE
async function deleteCustomer(id: string): Promise<void> {
  if (!isOnline()) {
    await syncClient.enqueueOperation({
      entity: "customers",
      operation: "delete",
      entityId: id,
      data: {},
      lastError: undefined,
    });
    return;
  }
  
  const { error } = await api.customers({ id }).delete();
  if (error) throw new Error(String(error.value));
}
```

#### Other Hooks Using TanStack Query

| Hook | File | Entity | Pattern |
|------|------|--------|---------|
| `useCustomers`, `useCustomer`, `useCreateCustomer`, etc. | `use-customers.ts` | customers | Full CRUD with offline |
| `useSales` hooks | `use-sales.ts` | sales | Full CRUD with offline items |
| `usePayments` hooks | `use-payments.ts` | abonos | Create/delete with offline |
| `useDistribuciones` hooks | `use-distribuciones.ts` | distribuciones | Full CRUD with offline |
| `useProducts` hooks | `use-products-live.ts` | products | Read-only (no offline mutations) |
| `useClosings` hooks | `use-closings.ts` | closings | Read-only operations |

---

## 8. All enqueueOperation() Call Sites

Locations where operations are queued when offline:

| File | Lines | Entity | Operations |
|------|-------|--------|------------|
| **collections.ts** | 27-32 | customers | insert |
| | 57-62 | customers | update |
| | 92-98 | customers | delete |
| | 110-116 | payments | insert |
| | 138-144 | payments | delete |
| **use-customers.ts** | 57-65 | customers | insert |
| | 93-101 | customers | update |
| | 126-133 | customers | delete |
| **use-sales.ts** | 41-60 | sales | insert (with items) |
| **use-payments.ts** | 45-54 | abonos | insert |
| | 80-88 | abonos | delete |
| **use-distribuciones.ts** | 131-139 | distribuciones | insert |
| | 176-186 | distribuciones | update |
| | 217-225 | distribuciones | update (close) |
| | 258-266 | distribuciones | delete |
| **use-sync-engine.ts** | 38 | (pass-through) | enqueue wrapper |

**Total**: 18 enqueueOperation() calls across 6 files

---

## 9. Backend: Sync API & Processing

### 9.1 Sync API Endpoints

**File**: `packages/backend/src/api/sync.ts`

#### POST /sync/batch (lines 6-17)

Receives batched operations from client:

```typescript
app.post("/sync/batch", async ({ body, ctx }) => {
  const { operations } = body;  // Array of operations
  
  const results = await syncService.processBatch(ctx, operations);
  
  return {
    success: true,
    data: { results }  // Per-operation success/error
  };
});
```

#### GET /sync/changes (lines 43-56)

Returns processed changes for client to pull:

```typescript
app.get("/sync/changes", async ({ query, ctx }) => {
  const { since, limit } = query;
  
  const data = await syncService.getChanges(ctx, since, limit);
  
  return {
    success: true,
    data
  };
});
```

### 9.2 Server-Side Sync Processor

**File**: `packages/backend/src/services/sync/sync.service.ts`

#### processBatch() Method

Applies operations to the server database:

```typescript
async processBatch(
  ctx: RequestContext,
  operations: BatchOperation[]
): Promise<BatchResultItem[]> {
  const results: BatchResultItem[] = [];
  
  for (const operation of operations) {
    try {
      // Route to entity-specific handler
      const result = await this.applyOperation(ctx, operation);
      
      // Record in syncOperations table
      await db.insert(syncOperations).values({
        operationId: operation.operationId,
        entity: operation.entity,
        action: operation.action,
        entityId: operation.entityId,
        payload: operation.payload,
        status: "processed",
        processedAt: new Date(),
      });
      
      results.push({ operationId: operation.operationId, success: true });
    } catch (error) {
      results.push({
        operationId: operation.operationId,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}
```

#### applyOperation() Routing

Routes incoming operations to handlers by entity:

```typescript
private async applyOperation(
  ctx: RequestContext,
  operation: BatchOperation
): Promise<void> {
  switch (operation.entity) {
    case "customers":
      return this.applyCustomerOperation(ctx, operation);
    case "sales":
      return this.applySaleOperation(ctx, operation);
    case "abonos":
      return this.applyPaymentOperation(ctx, operation);
    case "distribuciones":
      return this.applyDistribucionOperation(ctx, operation);
    default:
      throw new Error(`Unknown entity: ${operation.entity}`);
  }
}
```

#### getChanges() Method

Returns processed operations as a change feed:

```typescript
async getChanges(
  ctx: RequestContext,
  since: string | undefined,
  limit: number
): Promise<{ nextSince?: string }> {
  const processedOps = await db
    .select()
    .from(syncOperations)
    .where(
      and(
        eq(syncOperations.businessId, ctx.businessId),
        since ? gt(syncOperations.processedAt, new Date(since)) : undefined,
        eq(syncOperations.status, "processed")
      )
    )
    .orderBy(asc(syncOperations.processedAt))
    .limit(limit);
  
  const lastProcessedAt = processedOps[processedOps.length - 1]?.processedAt;
  
  return {
    nextSince: lastProcessedAt?.toISOString(),
  };
}
```

#### Entity-Specific Handlers

**Example: applyCustomerOperation()**

```typescript
private async applyCustomerOperation(
  ctx: RequestContext,
  operation: BatchOperation
): Promise<void> {
  const { action, entityId, payload } = operation;
  
  switch (action) {
    case "insert": {
      await db.insert(customers).values({
        id: entityId,  // Use client-generated ID
        ...payload,
        businessId: ctx.businessId,
        syncStatus: "synced",  // Mark as synced on server
      });
      break;
    }
    case "update": {
      await db
        .update(customers)
        .set({ ...payload, syncStatus: "synced", updatedAt: new Date() })
        .where(
          and(
            eq(customers.id, entityId),
            eq(customers.businessId, ctx.businessId)
          )
        );
      break;
    }
    case "delete": {
      await db
        .delete(customers)
        .where(
          and(
            eq(customers.id, entityId),
            eq(customers.businessId, ctx.businessId)
          )
        );
      break;
    }
  }
}
```

---

## 10. Sync Status Display Component

### 10.1 SyncStatus Component

**File**: `packages/app/app/components/sync/sync-status.tsx` (89 lines)

Displays current sync state in UI:

```typescript
export function SyncStatus() {
  const { status, pendingCount } = useSyncStatus();
  
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium",
      status === "synced" && "bg-green-100 text-green-700",
      status === "pending" && "bg-yellow-100 text-yellow-700",
      status === "offline" && "bg-red-100 text-red-700",
      status === "error" && "bg-red-100 text-red-700"
    )}>
      {status === "synced" && <CheckCircle className="w-3 h-3" />}
      {status === "pending" && <Clock className="w-3 h-3" />}
      {status === "offline" && <WifiOff className="w-3 h-3" />}
      
      {status === "synced" && "Sincronizado"}
      {status === "pending" && `${pendingCount} pendientes`}
      {status === "offline" && "Sin conexión"}
      {status === "error" && "Error de sincronización"}
    </div>
  );
}
```

**Status States**:
- 🟢 **synced**: All operations synced, online
- 🟡 **pending**: Operations waiting to sync
- 🔴 **offline**: No internet connection
- 🔴 **error**: Sync failed

---

## 11. Sync Hook: useSyncEngine

**File**: `packages/app/app/hooks/use-sync-engine.ts` (42 lines)

React hook that exposes sync engine state:

```typescript
export function useSyncEngine(options?: { autoStart?: boolean }) {
  const autoStart = options?.autoStart ?? true;
  const [state, setState] = useState<SyncEngineState>(
    syncClient.getState() ?? initialState
  );
  
  useEffect(() => {
    const unsubscribe = syncClient.subscribe(setState);
    
    if (autoStart) {
      syncClient.start();  // Start 30s interval sync
    }
    
    return () => {
      unsubscribe();
      if (autoStart) {
        syncClient.stop();
      }
    };
  }, [autoStart]);
  
  return {
    ...state,
    enqueue: (operation) => syncClient.enqueueOperation(operation),
    forceSync: () => syncClient.forceSync(),
  };
}
```

**Exported State**:
- `status`: 'idle' | 'syncing' | 'offline' | 'error'
- `pendingCount`: Number of operations in queue
- `lastSyncAt`: Date of last successful sync
- `isSyncing`: Boolean (true during sync cycle)
- `isConnected`: Boolean (online/offline)
- `lastError`: Error message if status is 'error'

---

## 12. Flow Diagrams

### 12.1 Create Customer Offline Flow

```
User creates customer offline
           ↓
useCreateCustomer().mutateAsync(data)
           ↓
createCustomer(data)
           ↓
isOnline() → false
           ↓
createSyncId() → "uuid-XXXX"
           ↓
syncClient.enqueueOperation({
  entity: "customers",
  operation: "insert",
  entityId: "uuid-XXXX",
  data: { name, dni, ... },
})
           ↓
enqueue() → IndexedDB store ("operations")
           ↓
Return optimistic Customer {
  id: "uuid-XXXX",
  syncStatus: "pending",
  name, dni, ...
}
           ↓
UI updates immediately (optimistic)
           ↓
Query cache invalidated → refetch (still shows pending)
           ↓
[When online...]
syncClient.runSyncCycle() (30s interval or manual)
           ↓
pushBatch() → POST /sync/batch
           ↓
Server processes batch → insert customer with real ID
           ↓
markProcessed("uuid-XXXX") → IndexedDB status = "processed"
           ↓
pullChanges() → GET /sync/changes
           ↓
Update cursor & lastSyncAt
           ↓
Cache invalidated → refetch customers
           ↓
Customer now shows syncStatus: "synced" with real ID
```

### 12.2 Server Sync Cycle

```
Frontend: syncClient.pushBatch()
           ↓
POST /sync/batch with operations array
           ↓
Backend: sync.service.processBatch()
           ↓
For each operation:
  - applyOperation() by entity type
  - Insert/update/delete in customers/sales/etc
  - Record in syncOperations table
  - Return success/error per operation
           ↓
Return { results: [ { operationId, success, error? } ] }
           ↓
Frontend: markProcessed() or markFailed()
           ↓
IndexedDB queue updated
```

---

## 13. Complete Entity Sync Support Matrix

| Entity | Offline Mutations | TanStack Query Hooks | Sync Enqueue | Server Handler | Notes |
|--------|-------------------|----------------------|--------------|----------------|-------|
| **customers** | ✅ Yes | ✅ Yes (use-customers.ts) | ✅ Yes (lines 57, 93, 126) | ✅ Yes | Fully synced |
| **sales** | ✅ Yes | ✅ Yes (use-sales.ts) | ✅ Yes (line 41) | ✅ Yes | With nested items |
| **sale_items** | ✅ Yes (via sale) | ✅ Via sales hook | ✅ Via sales op | ✅ Yes | Cascade delete |
| **abonos** (payments) | ✅ Yes | ✅ Yes (use-payments.ts) | ✅ Yes (45, 80) | ✅ Yes | Full CRUD |
| **distribuciones** | ✅ Yes | ✅ Yes (use-distribuciones.ts) | ✅ Yes (131, 176, 217, 258) | ✅ Yes | Full CRUD |
| **product_variants** | ⚠️ Partial | ✅ Yes | ⚠️ Enqueue exists | ✅ Yes | Mostly read-only |
| **products** | ❌ No | ✅ Yes (read-only) | ❌ No | ❌ No | Read-only cache |
| **closings** | ❌ No | ✅ Yes (read-only) | ❌ No | ❌ No | Read-only |

---

## 14. Constraints & Conventions

### 14.1 Explicit Constraints (from AGENTS.md)

```
CONSTRAINT 1: "Always Check Online Status for Writes"
- Every mutation must call isOnline() before deciding
- If offline: enqueue + return optimistic
- If online: direct API call

CONSTRAINT 2: "When enqueuing operations, use these exact entity strings"
entity: "customers"      // For Customer operations
entity: "sales"          // For Sale operations
entity: "sale_items"     // For SaleItem operations
entity: "abonos"         // For Payment operations (Spanish in backend)
entity: "distribuciones" // For Distribution operations

CONSTRAINT 3: "Use createSyncId() for temporary IDs when offline"
- Do not use hardcoded IDs
- Do not use existing customer IDs as temp IDs
- Always call createSyncId() for offline entities

CONSTRAINT 4: "Include syncStatus field in syncable entities"
- Default to "pending" when created offline
- Update to "synced" when backend confirms
- Update to "error" on repeated failures
```

### 14.2 Code Patterns

| Pattern | Example | File |
|---------|---------|------|
| Offline check | `if (!isOnline()) { ... enqueue ... } else { ... api ... }` | collections.ts, all hooks |
| Enqueue | `await syncClient.enqueueOperation({ entity, operation, entityId, data, lastError })` | 18 locations |
| Temp ID | `const tempId = createSyncId()` | collections.ts, hooks |
| Optimistic return | `return { id: tempId, syncStatus: "pending", ...data }` | All collection funcs |
| Hook invalidation | `queryClient.invalidateQueries({ queryKey: ["customers"] })` | All TanStack hooks |
| Entity string | `entity: "customers"` | Always match backend |

---

## 15. Testing Considerations

### 15.1 Manual Test Checklist

**Offline Customer Creation**:
1. [ ] Open app → Customer page
2. [ ] Go offline (DevTools → Network: Offline)
3. [ ] Create customer → Shows "pending" badge
4. [ ] Check IndexedDB: open DevTools → Application → IndexedDB → avileo-sync → operations
5. [ ] Verify operation queued with status: "pending"
6. [ ] Go online
7. [ ] Sync should trigger within 30s (or force via UI button)
8. [ ] Check server: customer should exist with real ID
9. [ ] Check IndexedDB: operation marked "processed"
10. [ ] UI should update → customer shows "synced"

**Offline Sale Creation**:
1. [ ] Create sale offline (with multiple items)
2. [ ] Verify temp IDs in queue
3. [ ] Go online
4. [ ] Verify sale + items inserted on server
5. [ ] Check relationships maintained

**Sync Error Handling**:
1. [ ] Force sync error (mock API failure)
2. [ ] Verify operation marked "failed" (or "pending" if retryable)
3. [ ] Verify UI shows error badge
4. [ ] Verify retry on next sync cycle

### 15.2 Unit Test Ideas

| Test | File | Purpose |
|------|------|---------|
| `createSyncId()` produces unique IDs | utils.test.ts | Temp ID generation |
| `isOnline()` returns correct state | utils.test.ts | Network detection |
| Offline mutation returns optimistic entity | collections.test.ts | Optimistic UI |
| Online mutation calls API | collections.test.ts | Direct API |
| `enqueue()` stores in IndexedDB | queue.test.ts | Queue persistence |
| `listPending()` retrieves pending ops | queue.test.ts | Queue query |
| `markProcessed()` updates status | queue.test.ts | Queue state |
| `runSyncCycle()` calls pushBatch + pullChanges | client.test.ts | Sync orchestration |
| Sync interval fires every 30s | client.test.ts | Background timing |
| TanStack Query invalidates on mutation | hooks.test.ts | Cache invalidation |

---

## 16. Quick Reference: Key Files & Line Numbers

### Backend
```
packages/backend/src/db/schema/
├── customers.ts          → lines 31-33 (sync fields)
├── sales.ts              → lines 49-51 (sync fields)
├── payments.ts           → lines 50-52 (sync fields)
├── inventory.ts          → lines ~110-112 (sync fields)
└── enums.ts              → lines 16-21 (syncStatusEnum)

packages/backend/src/
├── api/sync.ts           → lines 6-17 (POST /sync/batch), 43-56 (GET /sync/changes)
└── services/sync/sync.service.ts → processBatch, applyOperation, getChanges
```

### Frontend
```
packages/app/app/lib/
├── db/
│   ├── schema.ts         → Zod schemas with syncStatus
│   ├── collections.ts    → lines 24-220 (CRUD + offline enqueue)
│   └── electric-client.tsx → Sync context provider
│
├── sync/
│   ├── client.ts         → lines 13-253 (SyncClient class + 30s interval)
│   ├── queue.ts          → lines 1-160 (IndexedDB queue)
│   ├── storage.ts        → lines 1-43 (localStorage cursor)
│   └── utils.ts          → lines 1-16 (createSyncId, isOnline)

packages/app/app/hooks/
├── use-customers.ts      → lines 53-141 (offline mutations)
├── use-sales.ts          → lines ~33-90 (sale creation offline)
├── use-payments.ts       → lines ~45-88 (payment creation offline)
└── use-distribuciones.ts → lines ~131-266 (distribucion CRUD offline)

packages/app/app/components/
└── sync/sync-status.tsx  → lines 64-88 (status display)
```

---

## 17. Summary: End-to-End Offline-First Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Avileo Offline-First                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  FRONTEND (React 19 + React Router v7)                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Components / Routes / Pages                                         │    │
│  │   ↓                                                                 │    │
│  │ TanStack Query Hooks (useCustomers, useSales, etc)                 │    │
│  │   ├─ useQuery() → fetch data                                       │    │
│  │   └─ useMutation() → create/update/delete                          │    │
│  │   ↓                                                                 │    │
│  │ Collection Functions (packages/app/lib/db/collections.ts)           │    │
│  │   ├─ isOnline()?                                                    │    │
│  │   ├─ YES → api.customers.post() → Direct API                       │    │
│  │   └─ NO → syncClient.enqueueOperation() → Queue                    │    │
│  │   ↓                                                                 │    │
│  │ Sync Engine (packages/app/lib/sync/client.ts)                       │    │
│  │   ├─ SyncClient singleton                                          │    │
│  │   ├─ start() → setInterval(30s runSyncCycle)                       │    │
│  │   ├─ online/offline listeners                                      │    │
│  │   ├─ pushBatch() → POST /sync/batch                                │    │
│  │   └─ pullChanges() → GET /sync/changes                             │    │
│  │   ↓                                                                 │    │
│  │ IndexedDB Queue (packages/app/lib/sync/queue.ts)                    │    │
│  │   └─ Store: "operations" (pending/processed/failed)                │    │
│  │   ↓                                                                 │    │
│  │ localStorage (packages/app/lib/sync/storage.ts)                     │    │
│  │   ├─ avileo-sync-last-since (cursor)                               │    │
│  │   └─ avileo-sync-last-at (timestamp)                               │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                 ↑↓ HTTP API                                  │
│  BACKEND (Bun + ElysiaJS + Drizzle + PostgreSQL)                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ POST /sync/batch (from client)                                      │    │
│  │   ↓                                                                 │    │
│  │ syncService.processBatch()                                          │    │
│  │   ├─ Loop: for each operation                                       │    │
│  │   ├─ applyOperation() → INSERT/UPDATE/DELETE                        │    │
│  │   ├─ Set syncStatus = "synced"                                      │    │
│  │   └─ Record in syncOperations table                                 │    │
│  │   ↓                                                                 │    │
│  │ Return: { results: [ { operationId, success } ] }                  │    │
│  │   ↓                                                                 │    │
│  │ GET /sync/changes (from client)                                     │    │
│  │   ↓                                                                 │    │
│  │ syncService.getChanges(since)                                       │    │
│  │   └─ SELECT from syncOperations WHERE processedAt > since           │    │
│  │   ↓                                                                 │    │
│  │ Return: { nextSince, changes }                                      │    │
│  │                                                                      │    │
│  │ Database (PostgreSQL):                                              │    │
│  │   ├─ customers { id, name, ..., sync_status, sync_attempts }      │    │
│  │   ├─ sales { id, ..., sync_status, sync_attempts }                │    │
│  │   ├─ abonos { id, ..., sync_status, sync_attempts }               │    │
│  │   ├─ distribuciones { id, ..., sync_status, sync_attempts }      │    │
│  │   └─ syncOperations { operationId, entity, action, status }        │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

DATA FLOW:

Online:
  User action → useHook → collectFunc → isOnline=true → api.call → response ✓

Offline:
  User action → useHook → collectFunc → isOnline=false → enqueue → queue → ✓ (optimistic)
  ...
  User comes online
  → syncClient.runSyncCycle() (30s)
  → pushBatch() → /sync/batch → backend applies & records
  → pullChanges() → /sync/changes → get processed ops
  → markProcessed() → cache invalidate → UI updates ✓
```

---

## 18. Next Steps for Development

1. **Extend Sync Error Handling**
   - Add exponential backoff to retry strategy
   - Improve lastError messaging in UI
   - File: queue.ts (markFailed)

2. **Add Sync Conflict Resolution**
   - Handle server-side conflicts (optimistic vs real)
   - File: collections.ts, client.ts (pullChanges)

3. **Improve Offline Mutation UX**
   - Show pending badge on cards
   - Allow retry/cancel on pending items
   - File: customer-card.tsx, sale-card.tsx

4. **Add Comprehensive Tests**
   - Unit: queue, client, utils
   - Integration: offline→online flow
   - E2E: Playwright customer creation offline

5. **Monitor Sync Health**
   - Log sync failures
   - Expose lastError in UI
   - Add analytics/telemetry
   - File: sync-status.tsx

6. **Performance Optimization**
   - Batch multiple pending ops together
   - Compress payloads
   - Implement delta sync (only changed fields)

---

**End of Audit Report**

Generated: 2026-02-22  
Version: 1.0  
Scope: Complete offline-first & sync architecture
