# Fix N+1 Query Performance: Sales with PGlite/IndexedDB

## Context

Avileo uses **PGlite** (PostgreSQL compiled to WASM, backed by IndexedDB) for offline-first data access on the frontend. With 845+ sales, the system became noticeably slow — even creating a new sale was slow.

**Stack chain per query:** `SQL → Drizzle ORM → PGlite (WASM) → IndexedDB I/O`

## The Problem

The core issue is an **N+1 query pattern** in `sale-service.ts`. Five methods iterate over sales and make 2 extra queries per sale (customer lookup + items lookup) inside a `for` loop.

## Bottlenecks Found

### 1. N+1 Query Pattern in `findBy*` Methods (CRITICAL)

**File:** `packages/app/app/lib/services/sale-service.ts`

Five methods have the identical N+1 pattern:

- `findByBusiness()` — loads ALL sales for the business
- `findByCustomerId(customerId)` — loads sales filtered by customer
- `findByStatus(status)` — loads sales filtered by status
- `findByDistribucionId(distribucionId)` — loads sales for a distribution
- `findByDistribucionIdIsNull()` — loads sales without a distribution

Each method does:

```typescript
for (const row of salesResult) {
  // Query 1: fetch customer
  const customerResult = await this.pg.query(`SELECT ... FROM customers WHERE id = $1`, [sale.customerId]);
  // Query 2: fetch sale_items
  const itemsResult = await this.pg.query(`SELECT * FROM sale_items WHERE sale_id = $1`, [sale.id]);
}
```

**Impact with 845 sales:** 1 + (845 × 2) = **1,691 queries** per list load.

### 2. Customer Detail Page Loads ALL Sales Unfiltered (HIGH)

**File:** `packages/app/app/routes/_protected.clientes.$id._index.tsx` (line 53)

```typescript
const { data: sales = [] } = useSales(); // No filter! Loads ALL 845 sales
```

Then filters client-side with `useMemo`:

```typescript
const customerSales = useMemo(
  () => sales.filter(s => s.customerId === id && s.status !== "draft" && s.status !== "cancelled"),
  [id, sales]
);
```

This triggers the full N+1 pattern (`findByBusiness`) just to show one customer's sales.

**Fix:** Use `useSalesByCustomer(id)` which calls `findByCustomerId(customerId)` — loads only that customer's sales.

### 3. `createDraft()` Re-queries via `findById` (MEDIUM)

**File:** `packages/app/app/lib/services/sale-service.ts` — `createDraft()` method

After inserting the sale, it calls `this.findById(saleId)` which does 3 additional queries:
1. `SELECT * FROM sales WHERE id = $1`
2. `SELECT ... FROM customers WHERE id = $1` (for customer data)
3. `SELECT * FROM sale_items WHERE sale_id = $1` (for items — always empty for a new draft)

**Fix:** Construct the return `Sale` object directly from the INSERT parameters instead of re-querying.

### 4. Sync Status Polling Every 5 Seconds (MEDIUM)

**File:** `packages/app/app/lib/sync/service-provider.tsx`

```typescript
const interval = setInterval(updateStatus, 5000);
```

Every 5 seconds, `syncService.getStatus()` runs:

```sql
SELECT status, COUNT(*) FROM sync_operations WHERE business_id = $1 GROUP BY status;
SELECT COUNT(*) FROM sync_dead_letter WHERE business_id = $1;
```

Combined with sync intervals (push: 5s, pull: 10s), PGlite is under constant I/O pressure.

### 5. Already Optimized: `findPageByBusiness()`

The paginated method already uses the correct batch pattern — it collects customer IDs, fetches them in one `ANY($1)` query, and maps in-memory. The `ventas._index.tsx` route uses this correctly. The problem is the other routes and non-paginated methods.

## Solution: `enrichSalesBatch()` Helper

A private helper method that replaces N+1 with 2 fixed queries:

```typescript
private async enrichSalesBatch(sales: Sale[]): Promise<SaleWithItems[]> {
  if (sales.length === 0) return [];

  // Batch query 1: all customers in one query
  const customerIds = [...new Set(sales.map(s => s.customerId).filter(Boolean))];
  const customerMap = new Map();
  if (customerIds.length > 0) {
    const result = await this.pg.query(
      `SELECT id, name, dni, phone FROM customers WHERE id = ANY($1)`,
      [customerIds]
    );
    // Map customers by ID
  }

  // Batch query 2: all sale items in one query
  const saleIds = sales.map(s => s.id);
  const itemsMap = new Map();
  if (saleIds.length > 0) {
    const result = await this.pg.query(
      `SELECT * FROM sale_items WHERE sale_id = ANY($1) AND business_id = $2`,
      [saleIds, this.businessId]
    );
    // Map items by saleId
  }

  return sales.map(sale => ({
    ...sale,
    customer: sale.customerId ? customerMap.get(sale.customerId) ?? null : null,
    items: itemsMap.get(sale.id) || [],
  }));
}
```

## Impact Summary

| Method | Queries Before (845 sales) | Queries After |
|--------|---------------------------|---------------|
| `findByBusiness()` | 1 + 845×2 = 1,691 | 1 + 2 = 3 |
| `findByCustomerId()` | 1 + N×2 | 1 + 2 = 3 |
| `findByStatus()` | 1 + N×2 | 1 + 2 = 3 |
| `findByDistribucionId()` | 1 + N×2 | 1 + 2 = 3 |
| `findByDistribucionIdIsNull()` | 1 + N×2 | 1 + 2 = 3 |
| `createDraft()` | INSERT + 3 queries | INSERT + 0 queries |

## IndexedDB Capacity Reference

| Aspect | Limit |
|--------|-------|
| IndexedDB raw storage | ~60% of disk (hundreds of thousands of records) |
| PGlite (WASM) with N+1 queries | ~500 sales before noticeable slowdown |
| PGlite with batch queries | ~5,000-10,000 sales |

## Files to Modify

| File | Change |
|------|--------|
| `packages/app/app/lib/services/sale-service.ts` | Add `enrichSalesBatch()`, rewrite 5 methods |
| `packages/app/app/routes/_protected.clientes.$id._index.tsx` | Switch `useSales()` → `useSalesByCustomer(id)` |
| `packages/app/app/lib/services/sale-service.ts` | `createDraft()` return constructed object |

## Key Technical Notes

- `SaleItem.saleId` (camelCase, mapped from `sale_id`) is used to group items by sale in the batch helper
- `mapToCamelCaseWithDates` is used for sales rows (handles Date→ISO string conversion)
- `mapToCamelCase` is used for items and customers (no date fields needed)
- The `findById()` method (single sale lookup) is **not changed** — it's used for detail views where N=1 is fine
- The `findPageByBusiness()` method already had the batch pattern — it was the template for `enrichSalesBatch()`

---

*Analysis date: 2026-04-01*
