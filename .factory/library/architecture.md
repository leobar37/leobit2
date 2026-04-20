# Architecture - Avileo Sync Core Integration

**What belongs here:** How the sync system works — components, relationships, data flows, invariants.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`), env vars (use `environment.md`).

---

## Sync Architecture Overview

```
Backend Schema (Drizzle)
    ↓
sync.config.ts (entity definitions)
    ↓
drizzle-sync generate (CLI)
    ↓
Generated Code (services.ts, hooks.ts, schemas.ts, init.sql, applier.ts, types.ts)
    ↓
Frontend Services (extend generated BaseService subclasses)
    ↓
PGlite (local DB) + Sync Queue
    ↓
REST API (/sync/batch, /sync/changes)
    ↓
Backend SyncEngine (OperationSorter → Handlers → DB)
```

## Key Components

### 1. Drizzle-Sync Library (`packages/drizzle-sync/`)

Reusable library with subpath exports:
- `core/` — Shared types, interfaces, events
- `shared/` — Constants, priority logic, backoff
- `pglite/` — PGlite change applier, pull service, sync queue
- `server/` — SyncEngine, BaseSyncHandler, OperationSorter, ConflictResolver
- `react/` — React hooks and context
- `config/` — Generator CLI, introspection, code generators
- `presets/` — Pre-built configs (avileo.ts)

### 2. Code Generation Pipeline

```
Backend Drizzle Tables → introspectTable() → ColumnMetadata[]
    ↓
EntitySyncConfig (sync.config.ts) + RelationGraph
    ↓
Generators:
  - service-generator.ts → BaseService subclasses
  - hooks-generator.ts → TanStack Query hooks
  - zod-generator.ts → Zod schemas
  - postgres-ddl-generator.ts → PGlite DDL
  - applier-generator.ts → Change applier config
```

### 3. Frontend Service Layer

**Pattern:** Thin wrapper extending generated service

```typescript
// Generated (by drizzle-sync)
class CustomersService extends BaseService {
  async findById(id: string) → Customer | null
  async findByBusiness() → Customer[]
  async create(input: CreateCustomersInput) → Customer
  async update(id: string, input: UpdateCustomersInput) → void
  async delete(id: string) → void
}

// Manual (thin wrapper)
class CustomerService extends CustomersService {
  async findByBusiness(search?: string) → Customer[]  // override with search
  async searchByTag(tagId: string) → Customer[]       // custom method
}
```

### 4. Sync Data Flow (New Architecture - FK-based)

```
React Component → Service.createWithItems(data, items)
    ↓
Parent ID generated: const saleId = createId()
    ↓
queueSync("create", saleId, { ...saleData, id: saleId })
queueSync("create", itemId, { ...itemData, sale_id: saleId })
    ↓
Sync Queue (PGlite sync_operations table)
    ↓
SyncBatchProcessor → POST /sync/batch
    ↓
Backend SyncEngine
    ↓
OperationSorter.topologicalSort() — uses payload FK references
    ↓
Handlers execute in dependency order (parents before children)
```

## Invariants

1. **Parent-before-child ordering:** The server MUST process parent entities before child entities. In the new architecture, this is guaranteed by OperationSorter analyzing payload FK references.

2. **Frontend-generated IDs:** All entity IDs are generated on the frontend using CUID2 (`createId()`). This ensures IDs are available for FK references before sync.

3. **Atomic operations via FK:** Related operations are linked by FK references in payloads, not by syncGroupId. The queue and sorter handle ordering.

4. **Backward compatibility:** syncGroupId is optional. Legacy code that passes syncGroupId continues to work.

5. **Type safety:** Generated code must compile without errors. Migrated services must maintain backward-compatible type exports.

## Migration Status Tracker

| Service | Status | Generated Base | Custom Override |
|---------|--------|---------------|-----------------|
| SupplierService | ✅ Migrated | SuppliersService | search |
| TagService | ✅ Migrated | TagsService | customer count |
| CustomerTagService | ✅ Migrated | CustomerTagsService | junction methods |
| CustomerService | ⏳ Pending | CustomersService | search/filter/pagination |
| ProductService | ⏳ Pending | ProductsService | variants |
| PaymentService | ⏳ Pending | AbonosService | payment logic |
| PurchaseService | ⏳ Pending | PurchasesService | atomic items |
| DistribucionService | ⏳ Pending | DistribucionesService | atomic items |
| VisitaService | ⏳ Pending | VisitasService | enriched types |
| CustomerGroupService | ⏳ Pending | CustomerGroupsService | members |
| SaleService | ⏳ Pending | SalesService | state machine + items |
| InventoryService | ⏳ Local-only | N/A | N/A |
