# ElectricSQL Diagnostic Report

> Analysis of Electric SQL implementation in Avileo
> Generated: March 2026

---

## Executive Summary

The Avileo project uses **ElectricSQL with PGlite** as a hybrid offline-first architecture. This report analyzes how the sync engine is implemented across backend, frontend, and database layers.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           AVILEO OFFLINE ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────────────┐   │
│  │   React    │      │   PGlite    │      │    PostgreSQL        │   │
│  │   Frontend │◄────►│  (WASM in   │◄────►│    + ElectricSQL     │   │
│  │   (App)    │      │   Browser)   │      │    (Server)         │   │
│  └─────────────┘      └─────────────┘      └─────────────────────┘   │
│         │                     │                        │                 │
│         │              ┌──────┴──────┐               │                 │
│         │              │  IndexedDB  │               │                 │
│         │              │ (Local Pers)│               │                 │
│         │              └─────────────┘               │                 │
│         │                                         │                 │
│         │  ┌──────────────────────────────────────┴──────────────┐   │
│         │  │              SYNC FLOW                              │   │
│         │  │  Writes: App → Queue → API → Postgres            │   │
│         │  │  Reads:  Postgres → Electric → PGlite → App      │   │
│         │  └────────────────────────────────────────────────────┘   │
│         │                                                         │
└─────────┴─────────────────────────────────────────────────────────┘
```

---

## Layer 1: Database & Schema

### Sync-Enabled Tables

| Table | Sync Status Fields | Priority | Dependencies |
|-------|-------------------|----------|--------------|
| `customers` | ✅ | 10 (first) | None |
| `products` | ✅ | 10 (first) | None |
| `suppliers` | ✅ | 10 (first) | None |
| `product_variants` | ✅ | 20 | products |
| `sales` | ✅ | 20 | customers |
| `purchases` | ✅ | 20 | suppliers |
| `abonos` | ✅ | 20 | customers, sales |
| `sale_items` | ✅ | 30 | sales, product_variants |
| `purchase_items` | ✅ | 30 | purchases, products |
| `distribuciones` | ✅ | 25 | business_users |
| `distribucion_items` | ✅ | 35 | distribuciones, product_variants |
| `closings` | ✅ | 30 | business_users |

### Schema Pattern (Drizzle)

```typescript
// All sync-enabled tables have these fields
syncStatus: text("sync_status").notNull().default("pending"),
syncAttempts: integer("sync_attempts").notNull().default(0),
```

### Issues Found

| Severity | Issue | Location | Recommendation |
|----------|-------|----------|----------------|
| ⚠️ Medium | `business_id` filter not applied to all tables in backend | `electric.service.ts:112-170` | Tables without direct `business_id` need special handling |

---

## Layer 2: Backend (Electric Service)

### Key Files

| File | Purpose |
|------|---------|
| `packages/backend/src/services/business/electric.service.ts` | Proxy shape requests, apply tenant filtering |
| `packages/backend/src/api/electric.ts` | Route handler `/electric` |

### Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                      BACKEND ELECTRIC PROXY                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Client (PGlite)                                                  │
│       │                                                            │
│       │ GET /electric?table=customers&where=...                    │
│       ▼                                                            │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │              ElectricRoute (Elysia)                       │     │
│  │   - Validates table parameter                            │     │
│  │   - Extracts businessId from ctx                        │     │
│  └───────────────────────┬─────────────────────────────────────┘     │
│                          │                                           │
│                          ▼                                           │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │           ElectricService.proxyShape()                  │     │
│  │                                                          │     │
│  │  1. buildTenantWhere(table, businessId)               │     │
│  │     ├─ Direct tables: business_id = '{id}'             │     │
│  │     └─ Child tables: IN (parent_ids)                    │     │
│  │                                                          │     │
│  │  2. buildElectricUrl(searchParams, tenantWhere)        │     │
│  │     ├─ Adds source_id                                    │     │
│  │     └─ Merges WHERE clauses                             │     │
│  │                                                          │     │
│  │  3. Fetch from Electric SQL Cloud                       │     │
│  │     └─ Bearer token auth                                │     │
│  │                                                          │     │
│  │  4. Return response + passthrough headers              │     │
│  └───────────────────────┬─────────────────────────────────────┘     │
│                          │                                           │
│                          ▼                                           │
│              https://api.electric-sql.cloud/v1/shape               │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Multi-Tenancy Filtering Logic

```typescript
// Direct business tables (has business_id column)
const DIRECT_BUSINESS_TABLES = new Set([
  "customers", "sales", "products", "assets", "files",
  "suppliers", "purchases", "abonos"
]);

// Special filter tables (need parent relationship)
const SPECIAL_FILTER_TABLES = new Set([
  "product_variants",  // → filter by product_id IN (products.businessId)
  "sale_items",        // → filter by sale_id IN (sales.businessId)
  "purchase_items",   // → filter by purchase_id IN (purchases.businessId)
  "distribucion_items" // → filter by distribucion_id IN (distribuciones.businessId)
]);
```

### Issues Found

| Severity | Issue | Location | Recommendation |
|----------|-------|----------|----------------|
| ⚠️ Medium | No validation for table names | `electric.service.ts:77` | Add allowlist validation |
| ⚠️ Low | Console.log in production | `electric.service.ts:81-84` | Remove or use proper logger |

---

## Layer 3: Frontend (Sync Engine)

### Key Files

| File | Purpose |
|------|---------|
| `packages/app/app/engine/electric.ts` | Start/stop sync, manage sync state |
| `packages/app/app/lib/sync/sync-shapes.ts` | Shape subscription management |
| `packages/app/app/lib/sync/shape-config.ts` | Table sync configuration |
| `packages/app/app/lib/sync/sync-service.ts` | Client-to-server write queue |
| `packages/app/app/lib/sync/config.ts` | Sync constants |

### Sync Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                    FRONTEND SYNC ENGINE                                │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    INITIALIZATION                                │  │
│  │                                                                  │  │
│  │  1. createPGlite()                                             │  │
│  │     └─ Load @electric-sql/pglite + @electric-sql/pglite-sync  │  │
│  │                                                                  │  │
│  │  2. startSync(businessId, token)                               │  │
│  │     ├─ getShapesByPriority() → 12 tables                       │  │
│  │     └─ syncTables() sequentially                                │  │
│  └────────────────────────────┬────────────────────────────────────┘  │
│                               │                                        │
│                               ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │              SHAPE SUBSCRIPTION (per table)                    │  │
│  │                                                                  │  │
│  │  pg.electric.syncShapeToTable({                                │  │
│  │    shape: {                                                     │  │
│  │      url: '/electric?table=customers',                         │  │
│  │      headers: { Authorization: 'Bearer ...', x-business-id }   │  │
│  │    },                                                           │  │
│  │    table: 'customers',                                          │  │
│  │    primaryKey: ['id'],                                          │  │
│  │    onError: (err) => handleError(),                             │  │
│  │    onMustRefetch: (tx) => clearAndRetry()                      │  │
│  │  })                                                             │  │
│  └────────────────────────────┬────────────────────────────────────┘  │
│                               │                                        │
│                               ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    LIVE QUERIES                                 │  │
│  │                                                                  │  │
│  │  useLiveQuery(db.customers.where(...))                         │  │
│  │     │                                                           │  │
│  │     ├─ First run: Query PGlite                                 │  │
│  │     │                                                           │  │
│  │     └─ Subscribe: Listen to PGlite changes                     │  │
│  │         └─ When Electric updates PGlite → trigger re-render   │  │
│  │                                                                  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

### Write Queue (Offline Support)

```
┌────────────────────────────────────────────────────────────────────────┐
│                    CLIENT WRITE QUEUE                                  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  User Action (offline detected)                                        │
│       │                                                                │
│       ▼                                                                │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ syncService.enqueue()                                           │ │
│  │   ├─ entity_type: 'sale'                                        │ │
│  │   ├─ operation: 'insert'                                        │ │
│  │   ├─ entity_id: 'local-uuid'                                    │ │
│  │   ├─ payload: {...}                                             │ │
│  │   └─ idempotency_key: 'uuid'                                    │ │
│  └────────────────────────────┬─────────────────────────────────────┘ │
│                               │                                        │
│                               ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ PGlite: sync_operations table                                   │ │
│  │   ├─ status: 'pending' | 'processing' | 'completed'           │ │
│  │   ├─ sync_attempts: 0-3                                        │ │
│  │   ├─ last_error: string                                        │ │
│  │   └─ Dead letter after MAX_RETRIES                              │ │
│  └────────────────────────────┬─────────────────────────────────────┘ │
│                               │                                        │
│                               ▼ (when online)                          │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ syncService.processPending()                                    │ │
│  │   └─ POST /api/sync/batch                                       │ │
│  │       └─ [operations] → [results]                               │ │
│  │           └─ Handle conflicts, errors                            │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

### Sync Configuration

```typescript
// shape-config.ts - Tables to sync, ordered by priority
const SHAPES_CONFIG = [
  // Priority 10: Core (no dependencies)
  { table: "customers", priority: 10 },
  { table: "products", priority: 10 },
  { table: "suppliers", priority: 10 },
  
  // Priority 20: Dependent
  { table: "product_variants", priority: 20 },
  { table: "sales", priority: 20 },
  { table: "purchases", priority: 20 },
  { table: "abonos", priority: 20 },
  
  // Priority 30: Children
  { table: "sale_items", priority: 30 },
  { table: "purchase_items", priority: 30 },
  { table: "distribuciones", priority: 25 },
  { table: "distribucion_items", priority: 35 },
  { table: "closings", priority: 30 },
];
```

### Issues Found

| Severity | Issue | Location | Recommendation |
|----------|-------|----------|----------------|
| ⚠️ Medium | Sync interval not implemented | `sync-service.ts:456` | Currently manual trigger only |
| ⚠️ Medium | No retry limit on shape sync | `sync-shapes.ts:108-181` | Add retry logic |
| ⚠️ Low | Duplicate key errors not handled gracefully | `sync-shapes.ts:162-170` | Already handled but logged as error |

---

## Layer 4: API Integration

### Backend Route

```typescript
// packages/backend/src/api/electric.ts
export const electricRoutes = new Elysia({ prefix: "/electric" })
  .get("/", async ({ request, set, ctx, electricService }) => {
    const url = new URL(request.url);
    const table = url.searchParams.get("table");
    
    if (!table) {
      set.status = 400;
      return { error: "Missing table parameter" };
    }
    
    const result = await electricService.proxyShape(ctx, {
      table,
      searchParams: url.searchParams,
      accept: request.headers.get("Accept"),
    });
    
    set.status = result.status;
    return new Response(result.body, { headers: result.headers });
  });
```

### Passthrough Headers

```typescript
const PASSTHROUGH_HEADERS = [
  "content-type",
  "cache-control",
  "electric-offset",
  "electric-handle",
  "electric-schema",
  "electric-cursor",
  "electric-up-to-date",
];
```

---

## Completeness Assessment

### ✅ Implemented

| Feature | Status |
|---------|--------|
| PGlite initialization | ✅ Complete |
| Electric shape subscription | ✅ Complete |
| Tenant filtering (multi-tenancy) | ✅ Complete |
| Read from local DB | ✅ Complete |
| Offline write queue | ✅ Complete |
| Conflict detection | ✅ Basic |
| Sync status tracking | ✅ Complete |
| Shape retry on error | ⚠️ Partial |
| Auto-sync interval | ❌ Not implemented |
| Full conflict resolution UI | ❌ Not implemented |
| Real-time subscription cleanup | ⚠️ Manual |

### ❌ Missing / Incomplete

1. **Auto-sync interval** - Currently manual trigger only
2. **Full conflict resolution UI** - Conflicts detected but no UI to resolve
3. **Shape subscription cleanup on logout** - Needs explicit stopSync()
4. **Error recovery UI** - No user-facing error display

---

## Recommendations

### High Priority

1. **Add auto-sync interval**
   ```typescript
   // In sync-service.ts
   startAutoSync(intervalMs = 30000) {
     this.syncIntervalId = setInterval(() => {
       if (navigator.onLine) this.processPending();
     }, intervalMs);
   }
   ```

2. **Implement logout cleanup**
   ```typescript
   // In _protected.tsx logout handler
   useEffect(() => {
     return () => stopSync();
   }, []);
   ```

3. **Add shape error retry**
   ```typescript
   // Exponential backoff for failed shapes
   const retryDelay = Math.min(1000 * Math.pow(2, attempts), 30000);
   ```

### Medium Priority

1. **Add table allowlist validation** in backend
2. **Implement conflict resolution UI** in frontend
3. **Add sync status indicator component**

### Low Priority

1. **Remove console.log** from production code
2. **Add metrics/monitoring** for sync operations
3. **Improve error messages** for users

---

## Architecture Diagram: Complete Sync Cycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMPLETE SYNC CYCLE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                      ONLINE MODE                                    │     │
│  │                                                                     │     │
│  │   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────────┐   │     │
│  │   │  User   │    │  React  │    │  API    │    │  PostgreSQL │   │     │
│  │   │  Action │───►│  App    │───►│ Backend │───►│   + Electric│   │     │
│  │   └─────────┘    └────┬────┘    └────┬────┘    └──────┬──────┘   │     │
│  │                        │               │                │           │     │
│  │                        │               │                │ INSERT    │     │
│  │                        │               │                │    │      │     │
│  │                        │               │                ▼    │      │     │
│  │                        │               │         ┌─────────┐    │      │     │
│  │                        │               │         │Electric │    │      │     │
│  │                        │               │         │ Sync    │◄───┘      │     │
│  │                        │               │         └────┬────┘           │     │
│  │                        │               │              │                │     │
│  │                        │               │              │ WebSocket      │     │
│  │                        │               │              │推送            │     │
│  │                        │               │              ▼                │     │
│  │                        │               │         ┌─────────┐          │     │
│  │                        │◄──────────────┴─────────┤ PGlite  │          │     │
│  │                        │               │         └────┬────┘          │     │
│  │                        │               │              │                │     │
│  │                        │               │              │ useLiveQuery   │     │
│  │                        ▼               │              │ Trigger        │     │
│  │                   ┌─────────┐          │              ▼                │     │
│  │                   │ Re-render│◄─────────┴─────────────────────────────┤     │
│  │                   └─────────┘                         │                │     │
│  │                                                             │                │     │
│  └─────────────────────────────────────────────────────────────┘                │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                      OFFLINE MODE                                   │     │
│  │                                                                     │     │
│  │   ┌─────────┐    ┌─────────┐    ┌─────────────┐                   │     │
│  │   │  User   │    │  React  │    │  IndexedDB  │                   │     │
│  │   │  Action │───►│  App    │───►│  Queue      │                   │     │
│  │   └─────────┘    └────┬────┘    └─────────────┘                   │     │
│  │                        │                                            │     │
│  │                        ▼                                            │     │
│  │                   ┌─────────┐                                      │     │
│  │                   │ Re-render│ (optimistic update)                 │     │
│  │                   └─────────┘                                      │     │
│  │                                                                     │     │
│  │   +─────────────────── RE-connects ───────────────────+            │     │
│  │   │                                                  │            │     │
│  │   ▼                                                  ▼            │     │
│  │   ┌─────────────┐                      ┌──────────────────┐       │     │
│  │   │ Auto-Process │                      │  Background Sync │       │     │
│  │   │   Queue      │────────────────────►│  to API          │       │     │
│  │   └─────────────┘                      └──────────────────┘       │     │
│  │                                                                     │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## File Inventory

### Backend

| File | Lines | Purpose |
|------|-------|---------|
| `packages/backend/src/services/business/electric.service.ts` | 224 | Tenant filtering, proxy |
| `packages/backend/src/api/electric.ts` | 25 | Route handler |
| `packages/backend/src/api/electric.route.test.ts` | 80 | Tests |
| `packages/backend/src/services/business/electric.service.test.ts` | 280+ | Tests |

### Frontend

| File | Lines | Purpose |
|------|-------|---------|
| `packages/app/app/engine/electric.ts` | 145 | Sync orchestration |
| `packages/app/app/engine/db.ts` | 60+ | PGlite initialization |
| `packages/app/app/lib/sync/sync-shapes.ts` | 264 | Shape subscription |
| `packages/app/app/lib/sync/shape-config.ts` | 216 | Table config |
| `packages/app/app/lib/sync/sync-service.ts` | 670 | Write queue |
| `packages/app/app/lib/sync/config.ts` | ~50 | Constants |

### Database

| File | Tables |
|------|--------|
| `packages/backend/src/db/schema/sales.ts` | sales, sale_items |
| `packages/backend/src/db/schema/customers.ts` | customers, abonos |
| `packages/backend/src/db/schema/inventory.ts` | products, product_variants, distribuciones, distribucion_items, purchases, purchase_items, closings |

---

## Conclusion

The ElectricSQL implementation is **well-structured** with proper multi-tenant filtering and offline write queue support. Key areas for improvement are:

1. **Auto-sync** - Add periodic sync for pending operations
2. **Conflict resolution** - Build UI for handling conflicts
3. **Error handling** - Improve user feedback on sync failures

The hybrid architecture correctly separates server-to-client sync (Electric) from client-to-server writes (REST API queue), which is a solid pattern for offline-first applications.

---

*Report generated by /analyze command*
