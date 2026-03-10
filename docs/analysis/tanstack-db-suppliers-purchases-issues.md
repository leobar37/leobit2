# TanStack DB Implementation Issues: Proveedores y Compras

## Date: 2026-03-10

## Executive Summary

**Status: NOT COMPLIANT** - Neither proveedores (suppliers) nor compras (purchases) follow the TanStack DB skill patterns. They are implemented using traditional TanStack Query with direct API calls, missing offline-first capabilities completely.

---

## Files Discovered

### Backend Layer

| File | Purpose | Status |
|------|---------|--------|
| `packages/backend/src/db/schema/suppliers.ts` | Supplier DB schema | **MISSING** sync_status fields |
| `packages/backend/src/db/schema/purchases.ts` | Purchase DB schema | **MISSING** sync_status fields |
| `packages/backend/src/api/suppliers.ts` | Supplier API routes | Exists (complete) |
| `packages/backend/src/api/purchases.ts` | Purchase API routes | Exists (complete) |
| `packages/backend/src/services/repository/supplier.repository.ts` | Supplier repository | Exists |
| `packages/backend/src/services/repository/purchase.repository.ts` | Purchase repository | Exists |
| `packages/backend/src/services/business/supplier.service.ts` | Supplier business logic | Exists |
| `packages/backend/src/services/business/purchase.service.ts` | Purchase business logic | Exists |

### Frontend Layer

| File | Purpose | Status |
|------|---------|--------|
| `packages/app/app/hooks/use-suppliers.ts` | Supplier hooks | **NOT TanStack DB** |
| `packages/app/app/hooks/use-purchases.ts` | Purchase hooks | **NOT TanStack DB** |
| `packages/app/app/routes/_protected.proveedores._index.tsx` | Supplier list page | Uses useSuppliers() |
| `packages/app/app/routes/_protected.proveedores.nuevo.tsx` | New supplier form | Uses useCreateSupplier() |
| `packages/app/app/routes/_protected.compras._index.tsx` | Purchase list page | Uses usePurchases() |

### Collections (Missing)

| Expected Collection | Status |
|--------------------|--------|
| `supplier.collection.ts` | **DOES NOT EXIST** |
| `purchase.collection.ts` | **DOES NOT EXIST** |

### Correctly Implemented Collections (Reference)

| Entity | Collection File | Status |
|--------|-----------------|--------|
| Customers | `packages/app/app/lib/db/collections/customer.collection.ts` | EXISTS |
| Sales | `packages/app/app/lib/db/collections/sale.collection.ts` | EXISTS |
| Payments | `packages/app/app/lib/db/collections/payment.collection.ts` | EXISTS |
| Products | `packages/app/app/lib/db/collections/product.collection.ts` | EXISTS |

---

## Completeness Assessment

### ✅ Implemented

- Backend API endpoints for suppliers
- Backend API endpoints for purchases
- Frontend routes for suppliers and purchases
- Frontend hooks using traditional TanStack Query

### ⚠️ Partial/Missing

- **Collections**: No TanStack DB collections for suppliers or purchases
- **useLiveQuery**: Not using live queries
- **Offline mutations**: No optimistic updates
- **Sync status**: No offline sync capability
- **Real-time updates**: No live sync

### ❌ Not Found

- `supplier.collection.ts`
- `purchase.collection.ts`
- `purchase-item.collection.ts` (for purchase items)
- TanStack DB implementation in hooks

---

## Issues & Suggestions

### 🐛 CRITICAL Issue #1: No TanStack DB Collections

**Location:** Collections directory `packages/app/app/lib/db/collections/`

**Current State:**
```typescript
// use-suppliers.ts - Uses TanStack Query
import { useQuery } from "@tanstack/react-query";

export function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: getSuppliers,  // Direct API call
  });
}
```

**Expected Pattern (from customer.collection.ts):**
```typescript
import { useLiveQuery, eq } from "@tanstack/react-db";
import { supplierCollection } from "~/lib/db/collections/supplier.collection";

export function useSuppliers() {
  const { data: business } = useBusiness();
  return useLiveQuery(
    (q) => q.from({ supplier: supplierCollection })
      .where(({ supplier }) => eq(supplier.businessId, businessId)),
    [businessId]
  );
}
```

**Fix Required:** Create `supplier.collection.ts` and `purchase.collection.ts` following the pattern from `customer.collection.ts`

---

### 🐛 CRITICAL Issue #2: Using useQuery Instead of useLiveQuery

**Location:**
- `packages/app/app/hooks/use-suppliers.ts:119-124`
- `packages/app/app/hooks/use-purchases.ts`

**Problem:** Uses `useQuery` from TanStack Query instead of `useLiveQuery` from TanStack DB

**Fix Required:** Replace all TanStack Query hooks with TanStack DB patterns

---

### 🐛 CRITICAL Issue #3: Filtering in JS Instead of where()

**Location:** `packages/app/app/routes/_protected.compras._index.tsx:70-72`

**Current Code:**
```typescript
const filteredPurchases = purchases?.filter((purchase) =>
  purchase.supplier?.name.toLowerCase().includes(search.toLowerCase())
);
```

**Expected Pattern:**
```typescript
const { data: purchases } = useLiveQuery(
  (q) => q.from({ purchase: purchaseCollection })
    .where(({ purchase }) => ilike(purchase.supplierName, `%${search}%`)),
  [search]
);
```

**Why:** JS filtering re-runs the entire query from scratch. Using `where()` with operators only recalculates delta.

---

### 🐛 CRITICAL Issue #4: Mutations Call API Directly

**Location:** `packages/app/app/hooks/use-suppliers.ts:134-143`

**Current Code:**
```typescript
export function useCreateSupplier() {
  return useMutation({
    mutationFn: createSupplier,  // Calls API directly
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}
```

**Expected Pattern:**
```typescript
export function useCreateSupplier() {
  return async (input: CreateSupplierInput) => {
    await supplierCollection.insert({
      id: generateId(),
      ...input,
      syncStatus: "pending",
    });
  };
}
```

**Why:** Direct API calls have no offline support. Collections provide optimistic mutations.

---

### 🐛 CRITICAL Issue #5: Missing sync_status in Database Schema

**Location:**
- `packages/backend/src/db/schema/suppliers.ts`
- `packages/backend/src/db/schema/purchases.ts`

**Current suppliers.ts (missing fields):**
```typescript
export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")...
    name: varchar("name", { length: 255 }).notNull(),
    // MISSING: syncStatus, syncAttempts
  }
);
```

**Expected (with sync fields):**
```typescript
import { pgEnum, integer } from "drizzle-orm/pg-core";

const syncStatusEnum = pgEnum("sync_status", ["pending", "synced", "error"]);

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")...
    name: varchar("name", { length: 255 }).notNull(),
    // ADD THESE:
    syncStatus: syncStatusEnum("sync_status").default("pending"),
    syncAttempts: integer("sync_attempts").default(0),
  }
);
```

---

### 🐛 CRITICAL Issue #6: Missing REPLICA IDENTITY for ElectricSQL

**Problem:** Tables are not configured for ElectricSQL sync

**Fix Required:** Execute SQL migrations:
```sql
ALTER TABLE suppliers REPLICA IDENTITY FULL;
ALTER TABLE purchases REPLICA IDENTITY FULL;
ALTER TABLE purchase_items REPLICA IDENTITY FULL;
```

---

## Comparison with Correct Implementation (Customers)

| Aspect | Customers (Correct) | Suppliers (Current) | Purchases (Current) |
|--------|-------------------|---------------------|---------------------|
| Collection file | ✅ YES | ❌ NO | ❌ NO |
| useLiveQuery | ✅ YES | ❌ NO | ❌ NO |
| eq() operator | ✅ YES | ❌ N/A | ❌ N/A |
| Offline mutations | ✅ YES | ❌ NO | ❌ NO |
| sync_status field | ✅ YES | ❌ NO | ❌ NO |
| REPLICA IDENTITY | ✅ YES | ❌ NO | ❌ NO |

---

## Architecture Observations

### Pattern Violations Found

1. **Offline-first not implemented**: Suppliers and purchases use direct API calls, no IndexedDB queue
2. **No real-time sync**: Missing TanStack DB collections means no live query updates
3. **Traditional TanStack Query**: Still using useQuery/useMutation instead of useLiveQuery
4. **Inefficient filtering**: Using JS filter instead of database-level where()

### What Works

1. Backend API is complete for both modules
2. Routes are properly configured
3. Basic CRUD functionality exists

---

## Next Steps

### Phase 1: Database Changes (Priority: CRITICAL)

1. **Add sync_status fields to suppliers table:**
```sql
-- Create migration
ALTER TABLE suppliers ADD COLUMN sync_status TEXT DEFAULT 'pending';
ALTER TABLE suppliers ADD COLUMN sync_attempts INTEGER DEFAULT 0;
```

2. **Add sync_status fields to purchases table:**
```sql
ALTER TABLE purchases ADD COLUMN sync_status TEXT DEFAULT 'pending';
ALTER TABLE purchases ADD COLUMN sync_attempts INTEGER DEFAULT 0;
ALTER TABLE purchase_items ADD COLUMN sync_status TEXT DEFAULT 'pending';
ALTER TABLE purchase_items ADD COLUMN sync_attempts INTEGER DEFAULT 0;
```

3. **Add REPLICA IDENTITY:**
```sql
ALTER TABLE suppliers REPLICA IDENTITY FULL;
ALTER TABLE purchases REPLICA IDENTITY FULL;
ALTER TABLE purchase_items REPLICA IDENTITY FULL;
```

### Phase 2: Create Collections (Priority: CRITICAL)

1. **Create supplier collection** at `packages/app/app/lib/db/collections/supplier.collection.ts`
   - Follow pattern from `customer.collection.ts`
   - Define Zod schema with syncStatus
   - Implement onInsert, onUpdate, onDelete handlers calling API

2. **Create purchase collection** at `packages/app/app/lib/db/collections/purchase.collection.ts`
   - Follow pattern from `sale.collection.ts`
   - Handle purchase_items as separate collection with relation

### Phase 3: Create Hooks (Priority: HIGH)

1. **Replace use-suppliers.ts** with TanStack DB version:
   -()` using useLive `useSuppliersQuery
   - `useCreateSupplier()` using collection.insert()
   - `useUpdateSupplier()` using collection.update()
   - `useDeleteSupplier()` using collection.delete()

2. **Replace use-purchases.ts** with TanStack DB version:
   - `usePurchases()` using useLiveQuery
   - `useCreatePurchase()` using collection.insert()
   - `useUpdatePurchaseStatus()` using collection.update()

### Phase 4: Update Components (Priority: MEDIUM)

1. **Update _protected.proveedores._index.tsx:**
   - Replace JS filter with useLiveQuery where()

2. **Update _protected.compras._index.tsx:**
   - Replace JS filter with useLiveQuery where()

---

## Quick Fix Templates

### Collection Template (supplier.collection.ts)

```typescript
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { supplierSchema } from "../schema";
import { api } from "~/lib/api-client";
import { createShapeOptions } from "./utils";

export const supplierCollection = createCollection(
  electricCollectionOptions({
    id: "suppliers",
    schema: supplierSchema,
    getKey: (supplier) => supplier.id,
    shapeOptions: createShapeOptions("suppliers"),
    onInsert: async ({ transaction }) => {
      const newSupplier = transaction.mutations[0].modified;
      const response = await api.suppliers.post({
        name: newSupplier.name,
        type: newSupplier.type,
        ruc: newSupplier.ruc || undefined,
        address: newSupplier.address || undefined,
        phone: newSupplier.phone || undefined,
        email: newSupplier.email || undefined,
        notes: newSupplier.notes || undefined,
      });

      if (response.error) {
        throw new Error(String(response.error.value));
      }

      const data = response.data as { data: { id: string; txid?: number } };
      const txid = data?.data?.txid;
      if (!txid) {
        throw new Error("No txid returned from server");
      }
      return { txid };
    },
    onUpdate: async ({ transaction }) => {
      const { original, changes } = transaction.mutations[0];
      const response = await api.suppliers({ id: original.id }).put({
        name: changes.name,
        type: changes.type,
        ruc: changes.ruc,
        address: changes.address,
        phone: changes.phone,
        email: changes.email,
        notes: changes.notes,
      });

      if (response.error) {
        throw new Error(String(response.error.value));
      }

      return { txid: Date.now() };
    },
    onDelete: async ({ transaction }) => {
      const { original } = transaction.mutations[0];
      await api.suppliers({ id: original.id }).delete();
    },
  })
);
```

### Hook Template (use-suppliers.ts)

```typescript
import { useLiveQuery, eq, ilike } from "@tanstack/react-db";
import { supplierCollection } from "~/lib/db/collections/supplier.collection";
import { useBusiness } from "./use-business";
import { generateId } from "~/lib/utils";

export function useSuppliers(searchQuery?: string) {
  const { data: business } = useBusiness();
  const businessId = business?.id;

  return useLiveQuery(
    (q) => {
      let query = q.from({ supplier: supplierCollection })
        .where(({ supplier }) => eq(supplier.businessId, businessId));

      if (searchQuery) {
        query = query.where(({ supplier }) =>
          ilike(supplier.name, `%${searchQuery}%`)
        );
      }
      return query.orderBy(({ supplier }) => supplier.name, "asc");
    },
    [businessId, searchQuery]
  );
}

export function useCreateSupplier() {
  return async (data: CreateSupplierInput) => {
    const id = generateId();
    await supplierCollection.insert({
      id,
      ...data,
      syncStatus: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return id;
  };
}
```

---

## References

- TanStack DB Skill: `/Users/leobar37/code/avileo/.claude/skills/tanstack-db`
- Reference Implementation: `packages/app/app/lib/db/collections/customer.collection.ts`
- Quick Start Guide: `.claude/skills/tanstack-db/references/QUICK_START.md`

---

*Document generated from analysis of TanStack DB implementation for proveedores and compras modules.*
