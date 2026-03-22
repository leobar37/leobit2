---
name: pglite-electric-hybrid
description: Architecture guide for PGlite + ElectricSQL + Drizzle ORM hybrid
  sync. Use when designing offline-first apps where ElectricSQL handles
  server-to-client sync and REST API handles client-to-server writes with
  Drizzle ORM shared across frontend and backend.
user-invocable: true
disable-model-invocation: false
---

# PGlite + Electric + Drizzle (Hybrid Architecture)

> **IMPORTANT: Read project documentation first**

When this skill is activated, immediately read these documentation files from the project:

```bash
# Core architecture documentation (MUST READ)
read docs/offline/02-arquitectura.md   # Stack overview and patterns
read docs/offline/03-flujo-sync.md     # Data flow timelines and sequences  
read docs/offline/04-decisiones.md     # Architecture decision records (ADRs)

# Reference documentation (as needed)
read docs/offline/01-entidades.md      # Entity inventory for offline support
read docs/offline/05-migracion.md      # Migration guide from TanStack DB
read docs/offline/06-troubleshooting.md # Common issues and solutions
read docs/offline/07-testing.md        # Testing strategies
```

These documents contain:
- Approved patterns and anti-patterns
- Architecture decisions with rationale  
- Data flow examples and timelines
- Common pitfalls to avoid
- Troubleshooting guides

**Always reference these docs when:**
- Designing sync architecture
- Implementing offline features
- Troubleshooting sync issues
- Making architecture decisions

> **Architecture pattern: PGlite local-first, Custom Sync Queue for writes**

> **IMPORTANT:** Avileo uses a **custom sync service** with a **PGlite table** (`sync_operations`) for the write queue - NOT IndexedDB. See REFERENCE.md for the actual implementation patterns.

> **CRITICAL:** All IDs MUST be valid UUIDs. PostgreSQL will reject non-UUID strings.

## When to Use This Pattern

- Building offline-first web applications
- Using PGlite (PostgreSQL in browser) as local database
- ElectricSQL available for sync infrastructure
- Drizzle ORM as your data layer
- Need real-time sync from server with offline write support

## Core Architecture

```
┌─────────────────────────────────────────────┐
│  CLIENT (Browser)                           │
│  ├─ React/Vue/Svelte UI                     │
│  ├─ Drizzle ORM (queries)                   │
│  ├─ PGlite (local Postgres)                 │
│  ├─ ElectricSQL (read sync)                 │
│  └─ sync_operations table (write queue)     │
└──────────────────┬──────────────────────────┘
                   │
         Electric Sync (reads)
                   │
┌──────────────────┼──────────────────────────┐
│  SERVER          │                          │
│  ├─ REST API ←───┘ (writes)                 │
│  ├─ Drizzle ORM                             │
│  ├─ SyncEngine + Handlers (framework)       │
│  └─ PostgreSQL ←── Electric captures changes│
└─────────────────────────────────────────────┘
```

## Backend Sync Framework (v2.0)

The backend sync system uses a **handler-based framework** pattern:

```
packages/backend/src/services/sync/
├── sync.service.ts              # Thin orchestrator (103 lines)
├── sync-logger.ts               # Correlation tracking (400 lines)
├── schemas/
│   └── index.ts                 # Zod validation schemas (169 lines)
├── types.ts                     # Shared types
├── framework/
│   ├── SyncEngine.ts            # Batch processing + SAVEPOINTs (254 lines)
│   ├── SyncPipeline.ts          # 3-stage: validate structure → business → execute (71 lines)
│   ├── ConflictResolver.ts      # Per-entity conflict checking (130 lines)
│   ├── HandlerRegistry.ts       # Handler factory registration (35 lines)
│   └── types.ts                 # Framework types (75 lines)
└── handlers/
    ├── BaseSyncHandler.ts       # Base handler with logging (139 lines)
    ├── SaleSyncHandler.ts       # Sales: create/update/delete (236 lines)
    ├── SaleItemSyncHandler.ts   # Sale items: create/update/delete (179 lines)
    ├── CustomerSyncHandler.ts   # Customers (101 lines)
    ├── AbonoSyncHandler.ts      # Payments (76 lines)
    └── DistribucionSyncHandler.ts # Distributions (111 lines)
```

### Key Backend Concepts

1. **SyncEngine.processBatch()** - Single transaction with SAVEPOINTs per operation
2. **SyncPipeline** - 3-stage validation: structure (Zod) -> business rules -> execute
3. **Handlers** - Per-entity handlers implement `ISyncHandler` interface
4. **ConflictResolver** - Per-entity version checking before processing
5. **ID Preservation** - `operation.entityId` used as the actual entity ID on server

### SAVEPOINT Pattern (Critical)

```
BEGIN TRANSACTION
  SAVEPOINT sp_op_0
    Process operation 0 (insert sale)
  RELEASE SAVEPOINT sp_op_0  -- success
  
  SAVEPOINT sp_op_1
    Process operation 1 (insert sale_item)
    ERROR! (e.g., duplicate)
  ROLLBACK TO SAVEPOINT sp_op_1  -- recover, tx still usable
  
  SAVEPOINT sp_op_2
    Process operation 2 (insert sale_item)
  RELEASE SAVEPOINT sp_op_2  -- success
COMMIT
```

Without SAVEPOINTs, PostgreSQL enters "aborted transaction" state on any error, killing all subsequent operations in the batch.

## Frontend Write Sync (Client -> Server)

```
User Action → Service.create() → PGlite INSERT + queueSync()
                             ↓
                   sync_operations table (PGlite)
                             ↓
             SyncService.processPending() (every 30s)
                             ↓
             Group operations by sync_group_id
                             ↓
                   POST /api/sync/batch (per group)
                             ↓
             Backend SyncEngine.processBatch()
                             ↓
             Update local status to 'completed' / 'failed'
```

### syncGroupId: Atomic Multi-Operation Batches

Operations sharing the same `syncGroupId` are sent together:

- **Sale creation**: insert sale + insert items + confirm = same group
- **Backend processes**: all operations in the group atomically (single transaction)
- **Frontend groups**: `processPending()` fetches by group, sends as one batch

## Key Decisions You Need to Make

### 1. Schema Sharing
**Question:** How will you share Drizzle schema between frontend and backend?

**Options:**
- **Monorepo with shared package**: `packages/shared/schema.ts`
- **Single file copied**: Same schema file in both projects
- **Backend exports, frontend imports**: Backend package exports schema

**Considerations:**
- Keep schema as the single source of truth
- Avoid drift between frontend/backend types
- Version schema changes carefully

### 2. Electric Shapes
**Question:** Which tables need to sync to the client?

**Pattern:**
```typescript
pg.electric.syncShapeToTable({
  shape: {
    table: 'customers',
    where: `business_id = '${businessId}'`
  },
  table: 'customers',
  primaryKey: ['id']
})
```

**Decisions:**
- Which entities sync (customers, sales, products)?
- Filter by tenant (business_id) for multi-tenant apps
- Read-only tables vs syncable tables

### 3. Write Strategy
**Question:** How do you handle writes when offline?

Avileo uses **Optimistic Local + Queue + Batch Sync**:
1. Write to PGlite immediately (optimistic, `sync_status='pending'`)
2. Queue operation in `sync_operations` table (same PGlite DB)
3. Auto-sync every 30s groups pending operations by `sync_group_id`
4. POST `/api/sync/batch` with grouped operations
5. Backend processes atomically with SAVEPOINTs
6. Update local status on success/failure

### 4. Conflict Resolution
**Question:** What happens if server data changes while user was offline?

**Backend ConflictResolver:** Per-entity version checking before processing.
**Electric handles reads:** Server changes sync automatically to PGlite.
**Last-write-wins:** On individual fields by timestamp.

## Implementation Checklist

### Phase 1: Setup
- [ ] Install `@electric-sql/pglite` and `@electric-sql/pglite-sync`
- [ ] Install `drizzle-orm` in frontend and backend
- [ ] Set up shared schema definition
- [ ] Configure Electric sync endpoint

### Phase 2: Read Path
- [ ] Initialize PGlite with Electric extension
- [ ] Create schema in PGlite (tables + indexes)
- [ ] Configure sync shapes for your entities
- [ ] Implement live queries with `useLiveQuery`
- [ ] When adding a new synced table, update all sync layers:
  `shape-config` or shape registration, local PGlite table creation, backend tenant filter/proxy logic, and `REPLICA IDENTITY FULL` on Postgres

### Phase 3: Write Path
- [ ] Create API endpoints for writes (`POST /api/sync/batch`)
- [ ] Implement write queue in PGlite (`sync_operations` table)
- [ ] Add offline detection and retry logic
- [ ] Implement `syncGroupId` for multi-operation atomicity
- [ ] Create backend sync handlers per entity
- [ ] Add SAVEPOINTs in backend batch processing
- [ ] Show sync status in UI

### Phase 4: Polish
- [ ] Handle sync errors gracefully (dead letter queue)
- [ ] Add conflict resolution via ConflictResolver
- [ ] Test offline/online transitions
- [ ] Optimize shape filters for performance

## Data Flow Examples

### Creating a Sale (Online)
1. User clicks "Create Sale"
2. Insert into PGlite `sales` table (sync_status='pending')
3. Queue `insert` operation in `sync_operations` table
4. Auto-sync fires: POST `/api/sync/batch`
5. SyncEngine processes via SaleSyncHandler (uses `operation.entityId` as ID)
6. Electric detects change in Postgres
7. Electric pushes update to client
8. PGlite updates, local status -> 'synced'

### Creating a Sale (Offline)
1. User clicks "Create Sale"
2. Insert into PGlite `sales` table (sync_status='pending')
3. Queue `insert` operation in `sync_operations` table
4. Show "Pending" badge in UI
5. Connection restored
6. Auto-sync fires: groups operations by `sync_group_id`
7. POST `/api/sync/batch` with grouped operations
8. Backend processes atomically (SAVEPOINT per op)
9. Electric syncs to client
10. Local status -> 'synced', badge removed

### Reading Data (Always)
1. Component mounts
2. `useLiveQuery(db.select().from(sales))`
3. Returns current data from PGlite
4. Electric updates PGlite automatically
5. Query re-runs when data changes
6. UI updates reactively

## Common Pitfalls

### 1. Writing directly to PGlite for server-synced data
- **Don't:** Insert directly into PGlite without queuing a sync operation
- **Do:** Always use the service layer (which inserts + queues sync)

### 2. Forgetting tenant filtering
- **Don't:** Sync all data: `syncShapeToTable({table: 'customers'})`
- **Do:** Filter by tenant: `where: business_id = 'xyz'`

### 3. Shapes without primary keys
- **Don't:** Forget to specify `primaryKey` in shape config
- **Do:** Always define: `primaryKey: ['id']`

### 4. Not handling shape errors
- **Don't:** Ignore `onError` callback
- **Do:** Log errors and show user-friendly messages

### 5. Adding only the shape definition
- **Don't:** Assume adding one `syncShapeToTable` config is enough
- **Do:** Treat new synced tables as a full-stack change:
  - frontend shape registration
  - local PGlite table/schema creation
  - backend tenant-filter logic for Electric
  - database `REPLICA IDENTITY FULL`

### 6. Missing syncGroupId on related operations
- **Don't:** Queue sale insert and item inserts with different/no group IDs
- **Do:** Use same `syncGroupId` for all operations in a logical unit

### 7. Not preserving entity IDs from client
- **Don't:** Generate new IDs on the server for synced entities
- **Do:** Use `operation.entityId` as the actual row ID (SaleSyncHandler line 65)

### 8. Missing SAVEPOINTs in batch processing
- **Don't:** Process batch operations in a flat transaction (one error kills all)
- **Do:** Use SAVEPOINT per operation so failures are isolated (SyncEngine lines 72-79)

For the full checklist and examples, see `REFERENCE.md` in this skill.

## Resources

- **ElectricSQL Sync Docs**: https://pglite.dev/docs/sync
- **Drizzle PGlite Driver**: https://orm.drizzle.team/docs/connect-pglite
- **Electric React Hooks**: https://pglite.dev/docs/framework-hooks/react
- **PGlite Examples**: https://pglite.dev/examples

## Architecture Comparison

| Aspect | Full Custom Sync | Electric + API (This Pattern) |
|--------|-----------------|-------------------------------|
| Read Sync | Manual polling/pullChanges | Electric handles automatically |
| Write Sync | Manual pushChanges | Your API + PGlite queue |
| Offline Reads | Cached in PGlite | Cached in PGlite |
| Offline Writes | Complex queue logic | sync_operations table + batch API |
| Conflict Resolution | You implement | ConflictResolver + Electric |
| Batch Processing | Custom | SyncEngine + SAVEPOINTs |
| Complexity | High | Medium |
| Control | Full | Reads: Electric, Writes: You |

## Next Steps

1. **Define your schema** in shared Drizzle format
2. **Choose your write strategy** (Avileo uses optimistic local + queue)
3. **Set up Electric sync** for your tables
4. **Build sync handlers** per entity type
5. **Implement SyncEngine** with SAVEPOINTs for batch processing
6. **Add syncGroupId** for atomic multi-operation batches

For implementation details, consult REFERENCE.md and EXAMPLES.md in this skill.
