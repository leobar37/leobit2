# PGlite Layer (Frontend)

## PullService

Located at `pull-service.ts:141`. Fetches changes from server via `GET /sync/changes`.

### Key Methods

- `pull()` — single pull with default cursor
- `pullWithOptions(opts)` — pull with entity filter, custom cursor, limit
- `pullAll()` — loop until `hasMore: false`
- `startAutoPull()` — `setInterval`-based polling every `PULL_INTERVAL_MS` (10 s; constant at `shared/constants.ts`)
- `forceReset()` — clears stuck state and restarts auto-pull
- `pullAll()` — drains all pages

### Cursor & Pagination

Cursor persisted via `ICursorStorage` (default: `InMemoryCursorStorage`). Key: `avileo_pull_cursor`.

URL params: `since` (cursor), `limit` (default 100), `entityTypes` (comma-separated), `syncGroupId`.

### Stale Pull Detection

Two failure modes tracked:

| Mode | Constant | Threshold | Check |
|------|----------|-----------|-------|
| Cursor stuck | `MAX_STALE_PULLS` | 5 | Cursor doesn't advance but `hasMore: true` and got changes |
| Empty pulls | `MAX_EMPTY_PULLS` | 3 | `hasMore: true` but 0 changes in response |

When stuck: stops auto-pull, emits `pull:stale` event, requires `forceReset()` or re-login.

### Backoff

Uses `calculateBackoffDelay()` from `core/backoff`. Tracks `consecutiveFailures`, increments on any failure, resets on success.

### Dependencies (Injected)

- `ICursorStorage` — cursor persistence (in-memory default, implement with localStorage)
- `ISyncMutex` — coordinate push/pull (default: `NoOpMutex` — always returns true)
- `ISyncEventEmitter` — typed events
- `isOnline()` — network detection function

## ChangeApplier

Located at `change-applier.ts:70`. Applies server changes to local PGlite.

### applyChange Signatures

```typescript
// Current (preferred)
applyChange(pg, change, businessId, options?)

// Deprecated (has _db param)
applyChange(pg, _db, change, businessId, options?)
```

### Schema Mismatch Workaround

Uses **raw SQL** instead of Drizzle ORM because:
- `@avileo/shared` schema uses `camelCase` (e.g., `customerId`)
- Local PGlite schema uses `snake_case` (e.g., `customer_id`)

Column conversion via `schema-mapper.ts:toSnakeCase()`.

### applyChange Flow

1. Validate table name (SQL injection protection via `VALID_TABLES`)
2. Check for local conflict (if `checkConflicts: true`)
3. Route to `applyInsert` / `applyUpdate` / `applyDelete`
4. Upsert behavior: insert if not exists, update if exists
5. Force `sync_status = 'synced'`, `sync_attempts = 0`
6. Retry up to 3 times on transient errors

### Batch Application

`applyChangesBatch()` pre-computes conflicting IDs in one query per table, then applies individually. Transaction support is best-effort — PGlite may not support full transactions, falls back gracefully.

### Required Column Defaults

`change-applier.ts:33-43` — hardcoded defaults for NOT NULL columns missing from server payloads:

```typescript
const REQUIRED_COLUMN_DEFAULTS = {
  products: { base_price: "0", cost_price: "0" },
  product_variants: { price: "0", cost_price: "0", unit_quantity: "1" },
};
```

## SchemaMapper

`schema-mapper.ts` — validates entity/column names for SQL safety.

### VALID_TABLES (17 tables)

```typescript
VALID_TABLES = new Set([
  "customers", "products", "product_variants", "sales", "sale_items",
  "abonos", "purchases", "purchase_items", "suppliers", "variant_inventory",
  "distribuciones", "distribucion_items", "tags", "customer_tags",
  "customer_groups", "customer_group_members", "visitas"
]);
```

### TABLE_COLUMNS

Whitelist per table — only these columns can be INSERTed/UPDATEd. Prevents SQL injection via payload column names.

### toSnakeCase Bug

`schema-mapper.ts:203` — simple regex `/[A-Z]/g → _${letter}` — **breaks consecutive uppercase acronyms**:

- `customerId` → `customer_id` ✅
- `orderDate` → `order_date` ✅
- `customerID` → `customer_i_d` ❌ (should be `customer_id`)
- `saleID` → `sale_i_d` ❌ (should be `sale_id`)

**Known bug**: any field with a trailing uppercase acronym before a lowercase letter will be mis-converted. No workaround exists in the current implementation — payloads using `customerID`, `saleID`, or similar patterns will produce wrong column names.

### Relation Fields

Excluded from INSERT/UPDATE:
```typescript
RELATION_FIELDS = new Set([
  "items", "customer", "seller", "business", "distribucion", "visita",
  "sale", "product", "variant", "supplier", "purchase",
  "advanceProofImage", "cancelledBy", "createdBy", "updatedBy"
]);
```

## SyncLogger (PGlite)

`pglite/sync-logger.ts` — ring buffer logger for frontend. Exports `syncLogger` instance.

## PULL_INTERVAL_MS

From `shared/constants.ts`:
```typescript
PULL_INTERVAL_MS = 10000  // 10 seconds
MAX_STALE_PULLS = 5
MAX_EMPTY_PULLS = 3
```
