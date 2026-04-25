# Sync Engine Architecture Overview

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Client)                        │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │ SaleService  │    │PurchaseSvc   │    │ Other Services   │  │
│  └──────┬───────┘    └──────┬───────┘    └────────┬─────────┘  │
│         │                    │                     │            │
│         └────────────────────┼─────────────────────┘            │
│                              │                                  │
│                     ┌────────▼────────┐                       │
│                     │  BaseService    │                       │
│                     │ generateSyncGroup│                       │
│                     │ queueSync()     │                       │
│                     └────────┬────────┘                       │
│                              │                                  │
│         ┌────────────────────┼─────────────────────┐            │
│         │                    │                     │            │
│  ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐     │
│  │ SyncService  │    │ PullService  │    │ChangeApplier │     │
│  │ (push queue)│    │ (cursor pull)│    │(server→client│     │
│  └──────┬───────┘    └──────┬───────┘    └─────────────┘     │
│         │                   │                                  │
│  ┌──────▼───────────────────▼──────┐                         │
│  │       SyncCoordinator            │                         │
│  │  - start()/stop()               │                         │
│  │  - forceSync()/forceResetSync() │                         │
│  │  - online/offline events        │                         │
│  │  - stale pull detection         │                         │
│  └─────────────────────────────────┘                         │
└───────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │  POST /sync/batch  (push)     │
              │  GET /sync/changes (pull)     │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND (Server)                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   SyncRoutes (API)                         │  │
│  │  POST /sync/batch │ GET /sync/changes │ GET /sync/health│  │
│  │  GET /sync/conflicts │ GET /sync/conflicts/:id           │  │
│  │  POST /sync/conflicts/:id/resolve                       │  │
│  └────────────────────────────┬───────────────────────────┘  │
│                               │                                │
│                     ┌─────────▼─────────┐                    │
│                     │   SyncService     │                    │
│                     │ (registers 14     │                    │
│                     │  handlers)        │                    │
│                     └─────────┬─────────┘                    │
│                               │                                │
│                     ┌─────────▼─────────┐                    │
│                     │   SyncEngine      │                    │
│                     │ (batch processing │                    │
│                     │  per-op savepoints)│                    │
│                     └─────────┬─────────┘                    │
│                               │                                │
│  ┌────────────────────────────┼────────────────────────────┐  │
│  │                            │                             │  │
│  ▼                            ▼                             ▼  │
│ OperationSorter         ConflictResolver              HandlerRegistry
│ (sort by group         (version-based                (14 entity
│  + priority)            per-entity)                  handlers)
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Entity Handlers (14 total)                    │  │
│  │  CustomerSyncHandler │ SaleSyncHandler │ ... │ VisitaSyncHandler │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### Frontend Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **SyncCoordinator** | `packages/app/app/lib/sync/coordinator.ts` | Orchestrates push+pull, online/offline lifecycle, stale detection |
| **SyncService** | `packages/app/app/lib/sync/sync-service.ts` | Push queue, coalescing, dead letter, self-heal, backoff |
| **PullService** | `packages/app/app/lib/sync/pull-service.ts` | Cursor-based pull, auto-pull, stale detection, cursor persistence |
| **ChangeApplier** | `packages/app/app/lib/sync/change-applier.ts` | Applies server→client changes via raw SQL UPSERT |
| **BaseService** | `packages/app/app/lib/services/base-service.ts` | Provides `generateSyncGroup()` and `queueSync()` |
| **Config** | `packages/app/app/lib/sync/config.ts` | BATCH_SIZE=100, SYNC_INTERVAL_MS=5000, PULL_INTERVAL_MS=10000, MAX_RETRIES=5, MAX_STALE_PULLS=3, MAX_EMPTY_PULLS=5 |
| **Backoff** | `packages/app/app/lib/sync/backoff.ts` | ExponentialBackoff for retries |
| **SyncEvents** | `packages/app/app/lib/sync/sync-events.ts` | Event emitter for sync state changes |
| **SyncLogger** | `packages/app/app/lib/sync/sync-logger.ts` | Centralized sync logging |
| **DeviceFingerprint** | `@avileo/drizzle-sync/client` | Device tracking for multi-device sync |
| **SchemaMapper** | `packages/app/app/lib/sync/schema-mapper.ts` | camelCase↔snake_case for PGlite |
| **StagedPullCoordinator** | `packages/app/app/lib/sync/staged-pull-coordinator.ts` | 3-stage pull orchestration |

## Recent Performance Notes (Important)

### Queue fast-path

- `EnqueueParams.fastPath` allows low-latency enqueue for critical paths.
- In fast-path mode, sync operation is durably inserted first, and expensive prechecks/coalescing are skipped in the immediate path.
- This keeps offline correctness (durable outbox) while reducing UX latency.

### Startup behavior

- `SyncService.startAutoSync()` now executes one immediate `processPending()` call in addition to interval scheduling.
- This improves post-refresh/reopen recovery responsiveness.

### Runtime strategy

- PGlite worker path exists but is gated behind `VITE_ENABLE_PGLITE_WORKER`.
- Default behavior is safe fallback (non-worker) if flag is not set or worker init fails.
- `relaxedDurability: true` is enabled to reduce write latency overhead.

### Backend Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **SyncRoutes** | `packages/backend/src/api/sync.ts` | 6 REST API endpoints |
| **SyncService** | `packages/backend/src/services/sync/sync.service.ts` | Registers 14 handlers, provides processBatch + getChanges |
| **SyncEngine** | `packages/backend/src/services/sync/framework/SyncEngine.ts` | Batch processing with per-op savepoints, idempotency |
| **OperationSorter** | `packages/backend/src/services/sync/framework/OperationSorter.ts` | Sorts by syncGroupId + entity priority |
| **ConflictResolver** | `packages/backend/src/services/sync/framework/ConflictResolver.ts` | Version-based conflict detection per entity |
| **HandlerRegistry** | `packages/backend/src/services/sync/framework/HandlerRegistry.ts` | Factory for entity handlers |
| **SyncPipeline** | `packages/backend/src/services/sync/framework/SyncPipeline.ts` | Validation → business rules → execute |
| **SyncOperationRepository** | `packages/backend/src/services/sync/framework/SyncOperationRepository.ts` | Server-side idempotency tracking |
| **SyncConflictRepository** | `packages/backend/src/services/sync/framework/SyncConflictRepository.ts` | Persists conflicts for admin resolution |
| **EntityRegistry** | `packages/backend/src/services/sync/framework/EntityRegistry.ts` | Tracks successful ops within batch |

### Shared Configuration

| File | Purpose |
|------|---------|
| `packages/shared/src/sync-config.ts` | SYNC_ENTITIES (14), ENTITY_PRIORITIES (2-tier), SELF_HEAL_INSERTABLE, SYNC_STATUS_TRACKED |
| `packages/shared/src/sync-stages.ts` | 3-stage pull: CRITICAL (30d) → RECENT_SALES (7d) → HISTORICAL (full) |

### Generated Schema (Frontend)

| File | Purpose | Generated By |
|------|---------|--------------|
| `packages/app/app/lib/sync/generated/schema.ts` | Drizzle tables, enums, types | `drizzle-sync generate` |
| `packages/app/app/lib/sync/generated/engine.ts` | Engine factory with `tables: schema` | `drizzle-sync generate` |
| `packages/app/app/lib/sync/generated/services.ts` | BaseService subclasses | `drizzle-sync generate` |

**Note**: `@avileo/shared/schema.ts` is deprecated. The frontend schema is now auto-generated from the backend source of truth.

## Sync Flow: Push (Client → Server)

```
1. User creates sale (sale + items + payment)
   └─> SaleService.createDraft()
       └─> generateSyncGroup() → "uuid-123"
       └─> queueSync("create", saleId, saleData, syncGroupId)
       └─> queueSync("create", itemId1, itemData1, syncGroupId, "sale_items")
       └─> queueSync("create", itemId2, itemData2, syncGroupId, "sale_items")

2. SyncService.processPending() runs (auto every 5s or manual)
   └─> Fetches pending ops from PGlite
   └─> Groups by sync_group_id
   └─> Sorts within group by ENTITY_PRIORITIES (sales=1, sale_items=2)
   └─> Sends batch to POST /sync/batch

3. Server receives POST /sync/batch
   └─> SyncEngine.processBatch()
       └─> OperationSorter.sort() (server-side re-sort)
       └─> For each operation (within transaction):
           └─> SAVEPOINT sp_op_N
           └─> Check idempotency (already processed → skip)
           └─> Check conflict (version-based)
           └─> Get handler from registry
           └─> Execute via SyncPipeline (validate → business rules → handler)
           └─> RELEASE SAVEPOINT (or ROLLBACK on error)

4. Client receives response
   └─> For each result:
       └─> success → markCompleted() → update local sync_status='synced'
       └─> conflict → markConflict() → store serverData + suggestedMerge
       └─> failed → markFailed() → retry or move to dead letter
```

## Sync Flow: Pull (Server → Client)

```
1. PullService.pull() called (auto every 10s)
   └─> GET /sync/changes?since=<cursor>&limit=100
   └─> Cursor is composite: timestamp_operationId for stable pagination

2. Server processes GET /sync/changes
   └─> Query sync_operations WHERE processedAt > cursor
   └─> Order by processedAt ASC, operationId ASC
   └─> Return up to limit+1 to detect hasMore
   └─> nextSince = last.processedAt.toISOString() + "_" + last.operationId

3. Client receives response
   └─> Save cursor BEFORE applying changes (crash-safe)
   └─> For each change:
       └─> ChangeApplier.applyChange() → UPSERT to PGlite
       └─> Track applied entity types
   └─> Notify TanStack Query cache invalidation via onChangesApplied callback
   └─> Emit pull:completed event

4. Stale detection (for auto-pull)
   └─> If cursor didn't advance ≥3 times → isStuck=true → stop auto-pull
   └─> If empty pull (no changes) with hasMore=true ≥5 times → isStuck=true
   └─> Emit pull:stale event → coordinator stops auto-sync
```

## Sync Status Values

### Operation Status (sync_operations table)
- `pending` — Waiting to sync
- `processing` — Currently being sent
- `completed` — Successfully synced
- `failed` — Error, will retry up to MAX_RETRIES (5)
- `conflict` — Version conflict detected
- `dead_letter` — Max retries exceeded

### Entity Sync Status (sync_status column)
- `pending` — Needs sync
- `synced` — In sync with server
- `error` — Sync failed

## Coalescing Logic

When multiple operations target the same entity before sync sends:

| Existing | Incoming | Result |
|----------|----------|--------|
| create | create | merge payloads |
| create | update | merge payloads |
| create | delete | cancel (delete both) |
| update | update | merge payloads |
| update | delete | replace with delete |

See: `packages/app/app/lib/sync/sync-service.ts` (`getCoalescePlan()`)

### Fast-path interaction with coalescing

- Coalescing remains part of the sync architecture.
- For operations enqueued with `fastPath`, coalescing is intentionally not part of the immediate hot path.
- This is a deliberate tradeoff to prioritize local write responsiveness while preserving durable queue semantics.

## Self-Heal

For `SELF_HEAL_INSERTABLE` entities, if an `update` operation gets a `RECORD_NOT_FOUND` error, the operation is automatically converted to a `create`. This handles the case where the server never had the record (e.g., it was created offline, synced to another device, then the original device's update arrived before any pull).

Entities with self-heal: sales, customers, customer_groups, customer_group_members, visitas, abonos, purchases, purchase_items
