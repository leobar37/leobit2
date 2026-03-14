# PGlite + Electric + Drizzle Reference

> **Patterns, Anti-Patterns, and Implementation Guidelines**

## Table of Contents
1. [Core Patterns](#core-patterns)
2. [Engine Architecture](#engine-architecture)
3. [Entity Creation Flow (Local-First)](#pattern-entity-creation-flow-local-first)
4. [Anti-Patterns (DON'T DO THIS)](#anti-patterns)
5. [Schema Design Patterns](#schema-design-patterns)
6. [Sync Patterns](#sync-patterns)
7. [Write Patterns](#write-patterns)
8. [Error Handling Patterns](#error-handling-patterns)

---

## Core Patterns

### PATTERN 1: Shared Schema Definition

**DO THIS:**
- Define schema once, use everywhere
- Keep schema in `shared/schema.ts` or `packages/shared/src/schema.ts`
- Export types from schema for type safety

```typescript
// packages/shared/schema.ts
export const customers = pgTable('customers', { ... });
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
```

**Used by:**
- Frontend: `import { customers } from '@avileo/shared/schema'`
- Backend: `import { customers } from '@avileo/shared/schema'`

---

### PATTERN 2: Tenant-Filtered Shapes

**DO THIS:**
- Always filter shapes by tenant/business_id
- Use parameterized queries, never string interpolation

```typescript
// CORRECT
syncShapeToTable({
  shape: {
    table: 'customers',
    params: { where: `business_id = '${businessId}'` }
  }
})

// WRONG - No filter
syncShapeToTable({
  shape: { table: 'customers' }
})
```

---

### PATTERN 3: Write Through API

**DO THIS:**
```
UI Action → API Call → Backend Validation → Postgres
                    ↓
              Electric detects
                    ↓
              Syncs to client
```

**Flow:**
1. User creates sale
2. POST `/api/sales` (with validation)
3. Backend inserts into Postgres
4. Electric sees change
5. Electric pushes to client
6. UI updates via live query

---

### PATTERN 4: Offline Queue (PGlite Table - NOT IndexedDB)

**CRITICAL:** The write queue is stored in a PGlite table (`sync_operations`), NOT IndexedDB.

**DO THIS for offline support:**

```
User Action
    ↓
Write to local PGlite table (sync_status='pending')
    ↓
Queue operation in sync_operations table
    ↓
Show "Pending" UI
    ↓
Auto-sync every 30s (if online)
    ↓
POST /api/sync/batch
    ↓
Update status to 'completed'
```

**Why PGlite table instead of IndexedDB:**
- Single source of truth (all data in PGlite)
- ACID transactions (queue + entity updates atomic)
- Query with SQL (filter by status, count pending, etc.)
- Easier debugging (inspect with SQL queries)

---

## PATTERN: Entity Creation Flow (Local-First)

**This is how Avileo implements entity creation with offline support:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  Component (Form) ──▶ Hook (useMutation) ──▶ Service Layer            │
│                                                        │               │
│                                                        ▼               │
│                              ┌──────────────────────────────────────┐  │
│                              │          PGLite (IndexedDB)          │  │
│                              │                                      │  │
│                              │  1. INSERT entity (sync_status=pending)│  │
│                              │  2. INSERT sync_operation (queued)    │  │
│                              └──────────────────────────────────────┘  │
│                                                        │               │
│                                    AUTO SYNC (every 30s)              │
│                                                        │               │
│                                                        ▼               │
│                              ┌──────────────────────────────────────┐  │
│                              │        SyncService                    │  │
│                              │  - Fetch pending ops                 │  │
│                              │  - POST /api/sync/batch              │  │
│                              │  - Update status                    │  │
│                              └──────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼ HTTP POST
┌─────────────────────────────────────────────────────────────────────────┐
│                           BACKEND                                       │
│  POST /api/sync/batch ──▶ Validate ──▶ Process ops ──▶ Return results │
└─────────────────────────────────────────────────────────────────────────┘
```

### Step-by-Step Implementation

#### 1. Service Layer (BaseService)

Every entity service extends BaseService which provides:

```typescript
// packages/app/app/lib/services/base-service.ts
class BaseService {
  async create(input: CreateCustomerInput): Promise<Customer> {
    // 1. Generate ID and timestamp
    const id = this.generateId();
    const now = this.now();

    // 2. Create entity with PENDING sync status
    const customer: Customer = {
      id,
      name: input.name,
      syncStatus: SyncStatus.PENDING,  // Key: starts as pending
      syncAttempts: 0,
      businessId: this.businessId,
      // ...
    };

    // 3. Insert into PGlite
    await this.pg.exec(`INSERT INTO customers (...) VALUES (...)`);

    // 4. Queue for server sync
    await this.queueSync("insert", id, { name: input.name, ... });

    return customer;
  }
}
```

#### 2. Queue Sync Operation

```typescript
// In BaseService
async queueSync(
  operation: "insert" | "update" | "delete",
  entityId: string,
  payload: Record<string, unknown>,
  syncGroupId?: string
): Promise<void> {
  await this.syncService.enqueue({
    entityType: this.entityType,  // e.g., "customers"
    entityId,
    operation,
    payload,
    idempotencyKey: crypto.randomUUID(),
    syncGroupId,
  });
}
```

#### 3. Sync Service (Write Queue)

```typescript
// packages/app/app/lib/sync/sync-service.ts
async enqueue(params: EnqueueParams): Promise<string> {
  const idempotencyKey = params.idempotencyKey || crypto.randomUUID();

  // Check for existing pending operation (idempotency)
  const existing = await this.pg.query(`
    SELECT id FROM sync_operations
    WHERE idempotency_key = ? AND status != 'completed'
  `);

  if (existing.rows.length > 0) {
    return existing.rows[0].id;  // Return existing, don't duplicate
  }

  // Insert new operation
  await this.pg.exec(`
    INSERT INTO sync_operations (id, entity_type, operation, ...)
    VALUES (?, ?, ?, ...)
  `);

  return id;
}
```

#### 4. React Hook Integration

```typescript
// packages/app/app/hooks/use-customers.ts
export function useCreateCustomer() {
  const customerService = useCustomerService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input) => customerService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers-new"] });
    },
  });
}
```

---

### PATTERN: Complex Entities with Transactions

For entities with related items (like Sales + SaleItems), use transactions:

```typescript
// packages/app/app/lib/services/sale-service.ts
async createWithItems(saleInput, items): Promise<Sale> {
  const syncGroupId = this.generateSyncGroup();  // Group related ops

  await this.pg.exec("BEGIN");
  try {
    // Insert sale
    await this.pg.query(`INSERT INTO sales (...)`, [...]);

    // Insert all items
    for (const item of items) {
      await this.pg.query(`INSERT INTO sale_items (...)`, [...]);
    }

    await this.pg.exec("COMMIT");

    // Queue sync with same group ID (atomic operation)
    await this.queueSync("insert", saleId, saleData, syncGroupId);
    for (const item of items) {
      await this.queueSync("insert", itemId, itemData, syncGroupId);
    }
  } catch (error) {
    await this.pg.exec("ROLLBACK");
    throw error;
  }
}
```

**Key points:**
- Uses `syncGroupId` to group related operations
- All operations succeed or fail together
- Backend can process as a transaction

---

### PATTERN: Sync Status Values

```typescript
// packages/app/app/lib/sync/config.ts
export const OPERATION_STATUS = {
  PENDING: "pending",        // Ready to sync
  PROCESSING: "processing",   // Currently being processed
  SYNCING: "syncing",        // In-flight to server
  COMPLETED: "completed",    // Successfully synced
  FAILED: "failed",         // Sync failed (will retry)
  CONFLICT: "conflict",     // Version conflict detected
  DEAD_LETTER: "dead_letter" // Max retries exceeded
};

export const SYNC_CONFIG = {
  MAX_RETRIES: 5,
  BATCH_SIZE: 50,
  SYNC_INTERVAL_MS: 30000,  // 30 seconds
  BACKOFF_BASE_MS: 1000    // Exponential backoff
};
```

---

### PATTERN: Soft Delete (Status Change)

For processed sales that need deletion, use soft delete:

```typescript
// Backend - sale.service.ts
async deleteSale(ctx, id): Promise<void> {
  const sale = await this.repository.findById(ctx, id);

  if (sale.status === "draft") {
    // Hard delete for drafts
    await this.repository.delete(ctx, id);
  } else {
    // Soft delete for processed sales
    await this.repository.update(ctx, id, {
      status: "cancelled",
      cancelledAt: new Date(),
      cancelledBy: ctx.businessUserId,
    });
  }
}
```

Frontend hook handles both cases:

```typescript
// packages/app/app/hooks/use-sales.ts
export function useDeleteSale() {
  const saleService = useSaleService();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const sale = await saleService.findById(id);

      if (sale.status === "draft") {
        // Hard delete locally
        return saleService.delete(id);
      } else {
        // Soft delete via API
        const { error } = await api.sales({ id }).delete();
        if (error) throw new Error(String(error.value));
      }
    },
    // ... invalidation
  });
}
```

---

## Engine Architecture

This section describes how Avileo's local-first engine works.

### Directory Structure

```
packages/app/app/engine/
├── index.ts      # Exports (initDatabase, startSync, provider)
├── db.ts         # PGlite initialization + table creation
├── schema.ts     # Re-exports from @avileo/shared
└── electric.ts   # ElectricSQL sync manager
```

### Key Files

| File | Purpose |
|------|---------|
| `db.ts` | Initialize PGlite with IndexedDB, create tables, run migrations |
| `electric.ts` | Manage ElectricSQL sync shapes from server to client |
| `schema.ts` | Re-export Drizzle schema from shared package |
| `provider.tsx` | React context provider for engine |

### Database Initialization (db.ts)

```typescript
// packages/app/app/engine/db.ts
export async function initDatabase() {
  const [{ PGlite }, { electricSync }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("@electric-sql/pglite-sync"),
  ]);

  // Create PGlite with IndexedDB persistence
  const pg = await PGlite.create({
    dataDir: "idb://avileo-pg",  // IndexedDB storage
    extensions: {
      electric: electricSync(),  // ElectricSQL extension
    },
  });

  // Create tables
  await createTables(pg);

  // Wrap with Drizzle
  const db = drizzle(pg, { schema });

  return { pg, db };
}
```

### Tables Created

Every table includes these sync fields:

```sql
sync_status TEXT DEFAULT 'pending'
sync_attempts INTEGER DEFAULT 0
business_id UUID NOT NULL
created_at TIMESTAMP
updated_at TIMESTAMP
```

**Main tables:**
- `customers` - Customer data
- `sales` - Sales with status (draft/active/delivered/cancelled)
- `sale_items` - Line items for sales
- `abonos` - Payments received
- `products` - Product catalog
- `product_variants` - Product variants (sizes, etc.)
- `suppliers` - Supplier data
- `purchases` - Purchase orders
- `distribuciones` - Distribution assignments
- `sync_operations` - Write queue for server sync
- `schema_migrations` - Track applied migrations

### Migrations System

The engine runs migrations on startup:

```typescript
async function runMigrations(pg: PGlite) {
  const migrations = [
    { version: 1, description: "Add sync_attempts to products", sql: "..." },
    { version: 2, description: "Add business_id to product_variants", sql: "..." },
    // ... more migrations
  ];

  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      await pg.exec(migration.sql);
      await pg.exec(`INSERT INTO schema_migrations ...`);
    }
  }
}
```

### ElectricSQL Sync (electric.ts)

The sync manager handles server-to-client data replication:

```typescript
// packages/app/app/engine/electric.ts
class ElectricSyncManager {
  async startSync(config: ElectricSyncConfig) {
    const shapes = getShapesByPriority();

    // Retry up to 3 times with exponential backoff
    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const result = await syncTables(pg, businessId, token, shapes);
        // Handle success/failure callbacks
      } catch (error) {
        if (attempt < MAX_RETRY_ATTEMPTS) {
          await delay(RETRY_BASE_DELAY * Math.pow(2, attempt - 1));
        }
      }
    }
  }
}
```

### Sync Shapes Configuration

Shapes define which tables sync from server to client:

```typescript
// packages/app/app/lib/sync/shape-config.ts
export const SHAPES = [
  { table: "customers", priority: 10 },
  { table: "products", priority: 15 },
  { table: "product_variants", priority: 16 },
  { table: "sales", priority: 20 },
  { table: "sale_items", priority: 21 },
  { table: "abonos", priority: 25 },
  { table: "distribuciones", priority: 30 },
];
```

### Complete Sync Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        INITIALIZATION                            │
├─────────────────────────────────────────────────────────────────┤
│  1. App starts                                                  │
│  2. initDatabase() - Create PGlite + tables + migrations        │
│  3. User logs in (get businessId + token)                       │
│  4. startSync() - Configure Electric shapes                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     READ SYNC (Server → Client)                 │
├─────────────────────────────────────────────────────────────────┤
│  ElectricSQL                                                     │
│  PostgreSQL → Electric Proxy → PGlite → UI                     │
│                                                                  │
│  - Automatic on startup                                          │
│  - Filtered by business_id                                      │
│  - Real-time updates via WebSocket                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     WRITE SYNC (Client → Server)                │
├─────────────────────────────────────────────────────────────────┤
│  User Action → Service.create() → PGlite + queueSync()         │
│                              ↓                                  │
│                    sync_operations table                         │
│                              ↓                                  │
│              SyncService.processPending() (every 30s)           │
│                              ↓                                  │
│                    POST /api/sync/batch                         │
│                              ↓                                  │
│                    Backend processes ops                         │
└─────────────────────────────────────────────────────────────────┘
```

### Provider Setup

```typescript
// packages/app/app/engine/provider.tsx
export function EngineProvider({ children, businessId, token }) {
  const { pg, db } = useEngine();  // From initDatabase

  useEffect(() => {
    // Start Electric sync
    const cleanup = await startSync({ pg, businessId, token });
    return cleanup;
  }, [businessId, token]);

  return <ServicesProvider pg={pg}>{children}</ServicesProvider>;
}
```

---

## Anti-Patterns

### ❌ ANTI-PATTERN 1: Direct PGlite Writes

**DON'T DO THIS:**
```typescript
// WRONG - Bypasses API validation
await db.insert(sales).values({ ... });
```

**WHY:**
- No server validation
- No business logic enforcement
- Data inconsistency between server/client
- Breaks audit trail

**DO THIS INSTEAD:**
```typescript
// CORRECT - Through API
await api.sales.post({ ... });
```

---

### ❌ ANTI-PATTERN 2: Missing Primary Keys in Shapes

**DON'T DO THIS:**
```typescript
// WRONG - No primary key specified
pg.electric.syncShapeToTable({
  shape: { table: 'customers' },
  table: 'customers'
  // Missing: primaryKey
})
```

**WHY:**
- Electric can't track changes
- Duplicate records possible
- Updates fail silently

**DO THIS INSTEAD:**
```typescript
// CORRECT
pg.electric.syncShapeToTable({
  shape: { table: 'customers' },
  table: 'customers',
  primaryKey: ['id']  // REQUIRED
})
```

---

### ❌ ANTI-PATTERN 3: Global Shape Sync

**DON'T DO THIS:**
```typescript
// WRONG - Syncs ALL data
syncShapeToTable({
  shape: { table: 'sales' }  // All sales from all businesses!
})
```

**WHY:**
- Memory bloat in browser
- Security risk (seeing other tenants' data)
- Slow initial sync

**DO THIS INSTEAD:**
```typescript
// CORRECT - Filtered by tenant
syncShapeToTable({
  shape: {
    table: 'sales',
    params: { where: `business_id = '${currentBusinessId}'` }
  }
})
```

---

### ❌ ANTI-PATTERN 4: Ignoring Shape Errors

**DON'T DO THIS:**
```typescript
// WRONG - No error handling
pg.electric.syncShapeToTable({
  shape: { table: 'customers' },
  table: 'customers',
  primaryKey: ['id']
})
// No onError callback
```

**WHY:**
- Silent failures
- User sees stale data
- Can't recover from errors

**DO THIS INSTEAD:**
```typescript
// CORRECT - Handle errors
pg.electric.syncShapeToTable({
  shape: { table: 'customers' },
  table: 'customers',
  primaryKey: ['id'],
  onError: (error) => {
    console.error('Sync failed:', error);
    // Show user notification
    // Maybe retry logic
  }
})
```

---

### ❌ ANTI-PATTERN 5: Schema Drift

**DON'T DO THIS:**
```typescript
// Frontend schema
customers: {
  id, name, email, phone
}

// Backend schema (DIFFERENT!)
customers: {
  id, name, email, phone, address  // Extra field
}
```

**WHY:**
- Type mismatches
- Runtime errors
- Data loss on sync

**DO THIS INSTEAD:**
- Single shared schema file
- Version schema changes
- Migration strategy

---

## Schema Design Patterns

### PATTERN: Sync Metadata Fields

**Required fields for every syncable table:**

```typescript
export const baseSyncFields = {
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
};

// Use in every table
export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ...baseSyncFields,
});
```

**Why:**
- Electric uses timestamps for change tracking
- Helps with conflict resolution
- Audit trail

---

### PATTERN: Tenant Isolation

**Every table must have business_id:**

```typescript
export const sales = pgTable('sales', {
  id: text('id').primaryKey(),
  businessId: text('business_id').notNull(),
  customerId: text('customer_id').notNull(),
  // ... other fields
});

// Index for performance
export const salesBusinessIdx = index('sales_business_idx')
  .on(sales.businessId);
```

---

### PATTERN: Soft Deletes

**Don't delete rows, mark as deleted:**

```typescript
export const sales = pgTable('sales', {
  id: text('id').primaryKey(),
  // ... fields
  deletedAt: timestamp('deleted_at'),
});

// Query only active
const activeSales = await db
  .select()
  .from(sales)
  .where(isNull(sales.deletedAt));
```

**Why:**
- Electric syncs deletions (can't undelete)
- Soft delete = data recovery possible
- Maintains referential integrity

---

## Sync Patterns

### PATTERN: Multi-Table Consistency

**Use syncShapesToTables for transactional consistency:**

```typescript
// Sync related tables together
pg.electric.syncShapesToTables({
  shapes: {
    sale: { shape: {...}, table: 'sales', primaryKey: ['id'] },
    items: { shape: {...}, table: 'sale_items', primaryKey: ['id'] },
    payments: { shape: {...}, table: 'payments', primaryKey: ['id'] }
  },
  key: 'sale-transaction'
})
```

---

### PATTERN: Adding a New Synced Table

Adding a table to Electric sync is a cross-layer change, not just a new shape entry.

**Checklist:**
1. Add the table to your frontend shape registry/config.
2. Ensure the local PGlite database creates the table and indexes.
3. Add or verify tenant filtering in the backend Electric proxy.
4. Add `REPLICA IDENTITY FULL` for the Postgres table.
5. If the table is queried in the UI, export the schema/types from the shared schema package.

**Simple case: table has `business_id`**

```typescript
// Frontend shape config
{
  table: "distribuciones",
  primaryKey: ["id"],
  where: "business_id = '{businessId}'",
  priority: 20,
}
```

Backend tenant filter can usually be a direct rule:

```typescript
if (DIRECT_BUSINESS_TABLES.has(table)) {
  return `business_id = ${quoteSqlString(businessId)}`;
}
```

Database requirement:

```sql
ALTER TABLE distribuciones REPLICA IDENTITY FULL;
```

**FK case: table does not have `business_id`**

Example: `sale_items`, `product_variants`, `distribucion_items`.

In this case, a frontend shape entry alone is not enough. The backend must construct the tenant filter through the parent table.

```typescript
if (table === "distribucion_items") {
  const rows = await db
    .select({ id: distribuciones.id })
    .from(distribuciones)
    .where(eq(distribuciones.businessId, businessId));

  if (rows.length === 0) {
    return "1 = 0";
  }

  return `distribucion_id IN (${rows.map((row) => quoteSqlString(row.id)).join(", ")})`;
}
```

**Important note:**
- `foreignKeys` metadata in the frontend shape config is helpful for documentation and dependency ordering.
- It does **not** automatically generate tenant filters unless your backend/proxy explicitly implements that logic.

**Recommended implementation order:**
1. Shared/backend schema
2. Postgres migration with `REPLICA IDENTITY FULL`
3. Local PGlite table creation
4. Backend Electric proxy tenant filter
5. Frontend shape registration
6. UI queries/hooks

**Common failure modes when adding a table:**
- Shape exists but local PGlite table does not
- Table syncs globally because tenant filtering was not added
- Child table has no `business_id`, but no FK-based backend filter exists
- Replication works for inserts but breaks on updates/deletes because `REPLICA IDENTITY FULL` is missing

---

### PATTERN: Shape Lifecycle

**Always cleanup shapes on unmount:**

```typescript
useEffect(() => {
  let unsubscribe: () => void;
  
  const init = async () => {
    const shape = await pg.electric.syncShapeToTable({...});
    unsubscribe = shape.unsubscribe;
  };
  
  init();
  
  return () => {
    unsubscribe?.();
  };
}, []);
```

---

## Write Patterns

### PATTERN: Optimistic UI Updates

**Show data immediately, confirm later:**

```
User Action
    ↓
Update UI (optimistic)
    ↓
API Call
    ↓
Success? → Keep UI
    ↓ No
Rollback UI
Show Error
```

**Implementation:**
- Use React's `useOptimistic` hook
- Or local state + rollback on error
- Don't wait for API to show UI

---

### PATTERN: Queue with Retry

**Exponential backoff for failed writes:**

```
Attempt 1: Immediate
    ↓ Fail
Wait 1 second
    ↓
Attempt 2
    ↓ Fail
Wait 2 seconds
    ↓
Attempt 3
    ↓ Fail
Wait 4 seconds
    ↓
Mark as failed (manual retry)
```

---

## Error Handling Patterns

### PATTERN: Sync Status Indicator

**Always show sync state to user:**

```
🟢 Online - Synced
🟡 Online - Syncing...
🟠 Offline - N pending
🔴 Error - Tap to retry
```

---

### PATTERN: Graceful Degradation

**When sync fails:**
1. Show cached data (stale is better than none)
2. Indicate data is stale
3. Provide manual refresh
4. Queue writes locally

**Never:** Show blank screen or error toast only

---

## Decision Matrix

| Scenario | Pattern to Use |
|----------|---------------|
| Read data from server | Electric shape + useLiveQuery |
| Write data to server | API POST/PUT + queue |
| Multi-table transaction | syncShapesToTables |
| Offline support | IndexedDB queue |
| Conflict resolution | Electric default (last-write-wins) |
| Tenant isolation | business_id filter in shape |
| Large dataset | Pagination in shape params |

---

## Performance Guidelines

### DO:
- Filter shapes aggressively (tenant + time range)
- Use indexes on filtered columns
- Limit shape size (< 10k rows ideal)
- Unsubscribe unused shapes

### DON'T:
- Sync entire tables
- Sync historical data (use time filters)
- Keep shapes alive on hidden routes
- Ignore memory usage warnings

---

## Security Checklist

- [ ] All shapes filtered by tenant
- [ ] API validates tenant on writes
- [ ] Auth token passed to Electric
- [ ] No sensitive data in PGlite unless encrypted
- [ ] Rate limiting on sync endpoints
- [ ] CORS properly configured

---

## Migration from Other Patterns

### From TanStack DB:
1. Keep Zod schemas (convert to Drizzle)
2. Replace `useLiveQuery` from TanStack with Electric's
3. Replace collection mutations with API calls
4. Keep business logic, change data layer

### From Direct API Calls:
1. Add PGlite as cache layer
2. Add Electric for automatic sync
3. Keep API calls for writes
4. Add offline queue

---

## CRITICAL: UUID Requirements

**ALL IDs must be valid UUIDs.** PostgreSQL columns defined as `UUID` type will reject non-UUID strings.

### Error You'll See
```
invalid input syntax for type uuid: "insert-..."
```

### Correct ID Generation
```typescript
// ✅ CORRECT - Always use crypto.randomUUID()
const id = crypto.randomUUID();

// ❌ INCORRECT - Never use these patterns
const id = `insert-${Date.now()}`;
const id = `${entityType}-${Date.now()}-${Math.random()}`;
const id = `${baseId}-var`;
const id = `action-${entityId}-${timestamp}`;
```

### Where This Matters
- Entity IDs (customers, sales, products, etc.)
- Operation IDs in sync_operations table
- Idempotency keys
- Sync group IDs

---

## CRITICAL: Database Initialization Order

**The order of operations matters.** Drizzle must be initialized AFTER tables are created.

### Error You'll See
```
column "business_id" does not exist
```

This happens when Drizzle is initialized before tables are created.

### Correct Order
```typescript
// ✅ CORRECT
const pg = await PGlite.create({...});
await createTables(pg);        // 1. Create tables FIRST
const db = drizzle(pg, {...}); // 2. Then initialize Drizzle

// ❌ WRONG - Will cause schema errors
const db = drizzle(pg, {...}); // Too early!
await createTables(pg);        // Tables created too late
```

### createTables Function
```typescript
async function createTables(pg: PGlite): Promise<void> {
  await pg.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      business_id UUID NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id);
    CREATE INDEX IF NOT EXISTS idx_customers_sync_status ON customers(sync_status);
  `);
  // ... more tables
}
```

---

## BaseService Pattern

**Abstract base class providing common functionality for all entity services.**

```typescript
// packages/app/app/lib/services/base-service.ts
export abstract class BaseService {
  protected readonly pg: PGlite;
  protected readonly syncService: SyncService;
  protected readonly businessId: string;

  constructor(pg: PGlite, syncService: SyncService, businessId: string) {
    this.pg = pg;
    this.syncService = syncService;
    this.businessId = businessId;
  }

  abstract getEntityType(): EntityType;
  abstract getEntityPrefix(): string;

  /**
   * Generates a pure UUID v4 - NO prefixes, NO fallbacks
   */
  protected generateId(): string {
    return crypto.randomUUID();
  }

  protected now(): string {
    return new Date().toISOString();
  }

  /**
   * Generates a group ID for atomic operations
   */
  protected generateSyncGroup(): string {
    return crypto.randomUUID();
  }

  /**
   * Queues a sync operation
   */
  protected async queueSync(
    action: SyncAction,
    entityId: string,
    payload: Record<string, unknown>,
    syncGroupId?: string
  ): Promise<void> {
    await this.syncService.enqueue({
      entity_type: this.getEntityType(),
      operation: action,
      entityId,
      data: payload,
      idempotencyKey: crypto.randomUUID(), // Always UUID
      syncGroupId,
    });
  }
}
```

### Extending BaseService
```typescript
export class CustomerService extends BaseService {
  getEntityType(): EntityType {
    return "customers";
  }

  getEntityPrefix(): string {
    return "cust";
  }

  async create(input: CreateCustomerInput): Promise<Customer> {
    const id = this.generateId(); // UUID
    const now = this.now();

    await this.pg.exec(`
      INSERT INTO customers (id, name, business_id, sync_status, created_at, updated_at)
      VALUES ($1, $2, $3, 'pending', $4, $5)
    `, [id, input.name, this.businessId, now, now]);

    // Queue for server sync
    await this.queueSync("insert", id, { name: input.name });

    return { id, name: input.name, syncStatus: "pending" };
  }
}
```

---

## SyncGroup Pattern (Multi-Table Transactions)

**For atomic operations involving multiple tables (e.g., Sale + SaleItems).**

```typescript
async createWithItems(saleInput: CreateSaleInput, items: SaleItemInput[]): Promise<Sale> {
  const syncGroupId = this.generateSyncGroup(); // Same UUID for all ops

  await this.pg.exec("BEGIN");
  try {
    // 1. Insert sale
    const saleId = this.generateId();
    await this.pg.query(`
      INSERT INTO sales (id, business_id, total, sync_status, ...)
      VALUES ($1, $2, $3, 'pending', ...)
    `, [saleId, this.businessId, saleInput.total]);

    // 2. Insert all items
    for (const item of items) {
      const itemId = this.generateId();
      await this.pg.query(`
        INSERT INTO sale_items (id, sale_id, ...)
        VALUES ($1, $2, ...)
      `, [itemId, saleId]);

      // Queue with same syncGroupId
      await this.queueSync("insert", itemId, item, syncGroupId);
    }

    await this.pg.exec("COMMIT");

    // Queue sale with same syncGroupId
    await this.queueSync("insert", saleId, saleInput, syncGroupId);

    return { id: saleId, ... };
  } catch (error) {
    await this.pg.exec("ROLLBACK");
    throw error;
  }
}
```

**Key points:**
- All operations share the same `syncGroupId`
- Backend processes them as a single transaction
- All succeed or all fail together

---

## Entity Mapper Pattern

**Convert snake_case (PGlite) to camelCase (TypeScript).**

```typescript
// packages/app/app/lib/utils/entity-mappers.ts
export function mapToCamelCase<T>(row: Record<string, unknown>): T {
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    mapped[camelKey] = value;
  }
  return mapped as T;
}

// Usage in service
async findById(id: string): Promise<Sale | null> {
  const result = await this.pg.query<DbSale>(`
    SELECT * FROM sales WHERE id = $1 AND business_id = $2
  `, [id, this.businessId]);

  if (result.rows.length === 0) return null;

  return mapToCamelCase<Sale>(result.rows[0]);
}
```

---

## PGlite Migrations

**Track and apply schema migrations.**

```typescript
async function runMigrations(pg: PGlite): Promise<void> {
  // Migration tracking table
  await pg.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      description TEXT
    );
  `);

  const result = await pg.query<{ version: number }>(
    `SELECT version FROM schema_migrations ORDER BY version`
  );
  const appliedVersions = new Set(result.rows.map(r => r.version));

  const migrations = [
    {
      version: 1,
      description: "Add sync_attempts to products",
      sql: `
        ALTER TABLE products ADD COLUMN IF NOT EXISTS sync_attempts INTEGER DEFAULT 0;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending';
      `
    },
    {
      version: 2,
      description: "Add business_id to product_variants",
      sql: `
        ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS business_id UUID;
        CREATE INDEX IF NOT EXISTS idx_product_variants_business_id ON product_variants(business_id);
      `
    },
    // ... more migrations
  ];

  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      await pg.exec(migration.sql);
      await pg.exec(`
        INSERT INTO schema_migrations (version, description)
        VALUES (${migration.version}, '${migration.description}');
      `);
    }
  }
}
```

---

## Dead Letter Queue Pattern

**Handle operations that fail after max retries.**

```typescript
// In SyncService
private async moveToDeadLetter(operationId: string, originalError: string): Promise<void> {
  const op = await this.getOperation(operationId);
  if (!op) return;

  const dlqId = crypto.randomUUID();

  await this.pg.exec(`
    INSERT INTO sync_dead_letter (
      id, operation_id, entity_type, operation, entity_id,
      data, error, sync_attempts, original_error, created_at
    ) VALUES (
      '${dlqId}',
      '${op.id}',
      '${op.entity_type}',
      '${op.operation}',
      '${op.entity_id}',
      '${JSON.stringify(op.payload)}',
      'Max retries exceeded',
      ${op.sync_attempts},
      '${originalError}',
      ${Date.now()}
    )
  `);

  await this.pg.exec(`
    UPDATE sync_operations
    SET status = 'dead_letter'
    WHERE id = '${operationId}'
  `);
}
```

---

## Lessons Learned: Common Errors

### Error 1: "column business_id does not exist"
- **Symptom:** Infinite loading after login
- **Cause:** Drizzle initialized before creating tables
- **Fix:** Reorder: `createTables()` → then `drizzle()`

### Error 2: "invalid input syntax for type uuid"
- **Symptom:** Cannot create entities
- **Cause:** Using non-UUID ID formats
- **Fix:** Use ONLY `crypto.randomUUID()`, remove all fallbacks

### Error 3: Loading Infinite in ProtectedLayout
- **Symptom:** Spinner never disappears
- **Cause:** `isMounted` checks blocking state updates on re-render
- **Fix:** Remove problematic `isMounted` guards in React 18+

### Error 4: "Business seller is not available"
- **Symptom:** Error creating sales
- **Cause:** Accessing `business?.businessUserId` before loaded
- **Fix:** Disable buttons until data is loaded

---

## Links to Official Documentation

- **ElectricSQL Sync**: https://pglite.dev/docs/sync
- **Electric React Hooks**: https://pglite.dev/docs/framework-hooks/react
- **Drizzle PGlite**: https://orm.drizzle.team/docs/connect-pglite
- **Drizzle Schema**: https://orm.drizzle.team/docs/sql-schema-declaration
- **PGlite Examples**: https://pglite.dev/examples
