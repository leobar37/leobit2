# PGlite + Electric + Drizzle Reference

> **Patterns, Anti-Patterns, and Implementation Guidelines**

## Table of Contents
1. [Core Patterns](#core-patterns)
2. [Anti-Patterns (DON'T DO THIS)](#anti-patterns)
3. [Schema Design Patterns](#schema-design-patterns)
4. [Sync Patterns](#sync-patterns)
5. [Write Patterns](#write-patterns)
6. [Error Handling Patterns](#error-handling-patterns)

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

### PATTERN 4: Offline Queue

**DO THIS for offline support:**

```
User Action
    ↓
Try API Call
    ↓
Success? → Done
    ↓ No
Save to IndexedDB
    ↓
Show "Pending" UI
    ↓
Online Event
    ↓
Process Queue
    ↓
Clear from IndexedDB
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

## Links to Official Documentation

- **ElectricSQL Sync**: https://pglite.dev/docs/sync
- **Electric React Hooks**: https://pglite.dev/docs/framework-hooks/react
- **Drizzle PGlite**: https://orm.drizzle.team/docs/connect-pglite
- **Drizzle Schema**: https://orm.drizzle.team/docs/sql-schema-declaration
- **PGlite Examples**: https://pglite.dev/examples
