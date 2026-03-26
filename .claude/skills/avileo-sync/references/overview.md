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
│                     ┌────────▼────────┐                       │
│                     │  SyncService    │                       │
│                     │ (PGlite queue)  │                       │
│                     └────────┬────────┘                       │
│                              │                                  │
│         ┌────────────────────┼─────────────────────┐            │
│         │                    │                     │            │
│  ┌──────▼───────┐    ┌──────▼───────┐    ┌──────▼───────┐  │
│  │ Coalescing   │    │ Dead Letter  │    │ Auto-Sync    │  │
│  │ (merge ops)  │    │ Queue       │    │ (30s interval│  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ POST /sync/batch
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND (Server)                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   SyncRoutes (API)                       │  │
│  │  POST /sync/batch  │  GET /sync/changes  │  /conflicts  │  │
│  └────────────────────────────┬───────────────────────────┘  │
│                               │                                │
│                     ┌─────────▼─────────┐                    │
│                     │   SyncService     │                    │
│                     │ (thin orchestrator│                    │
│                     └─────────┬─────────┘                    │
│                               │                                │
│                     ┌─────────▼─────────┐                    │
│                     │   SyncEngine      │                    │
│                     │ (batch processing │                    │
│                     │  with SAVEPOINTs) │                    │
│                     └─────────┬─────────┘                    │
│                               │                                │
│         ┌─────────────────────┼─────────────────────┐        │
│         │                     │                     │        │
│  ┌──────▼───────┐    ┌───────▼───────┐    ┌───────▼─────┐  │
│  │OperationSorter│   │ConflictResolver│    │ HandlerRegistry│  │
│  │(sort by group │    │(version check) │    │(entity handlers│  │
│  │ + priority)   │    └───────────────┘    └──────────────┘  │
│  └───────────────┘                                                  │
│         │                                                           │
│  ┌──────▼──────────────────────────────────────────┐              │
│  │              Entity Handlers                     │              │
│  │  SaleSyncHandler │ PurchaseSyncHandler │ ...    │              │
│  └─────────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### Frontend Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **SyncService** | `packages/app/app/lib/sync/sync-service.ts` | Main client-side queue, groups operations by syncGroupId |
| **PullService** | `packages/app/app/lib/sync/pull-service.ts` | Fetches server changes via GET /sync/changes |
| **ChangeApplier** | `packages/app/app/lib/sync/change-applier.ts` | Applies server changes to local PGlite (UPSERT) |
| **BaseService** | `packages/app/app/lib/services/base-service.ts` | Provides `generateSyncGroup()` and `queueSync()` |
| **Config** | `packages/app/app/lib/sync/config.ts` | BATCH_SIZE, MAX_RETRIES, SYNC_INTERVAL_MS, etc. |

### Backend Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **SyncRoutes** | `packages/backend/src/api/sync.ts` | REST API endpoints |
| **SyncService** | `packages/backend/src/services/sync/sync.service.ts` | Thin orchestrator |
| **SyncEngine** | `packages/backend/src/services/sync/framework/SyncEngine.ts` | Batch processing with SAVEPOINTs |
| **OperationSorter** | `packages/backend/src/services/sync/framework/OperationSorter.ts` | Sorts by syncGroupId + entity priority |
| **ConflictResolver** | `packages/backend/src/services/sync/framework/ConflictResolver.ts` | Version-based conflict detection |
| **HandlerRegistry** | `packages/backend/src/services/sync/framework/HandlerRegistry.ts` | Factory for entity handlers |
| **SyncPipeline** | `packages/backend/src/services/sync/framework/SyncPipeline.ts` | Validation → business rules → execute |
| **SyncOperationRepository** | `packages/backend/src/services/sync/framework/SyncOperationRepository.ts` | Server-side sync queue |

## Sync Flow: Push (Client → Server)

```
1. User creates sale (sale + items + payment)
   └─> SaleService.createDraft()
       └─> generateSyncGroup() → "uuid-123"
       └─> queueSync("insert", saleId, saleData, syncGroupId)
       └─> queueSync("insert", itemId1, itemData1, syncGroupId)  ← same group
       └─> queueSync("insert", itemId2, itemData2, syncGroupId)  ← same group
       └─> queueSync("insert", pagoId, pagoData, syncGroupId)    ← same group

2. SyncService.processPending() runs (auto or manual)
   └─> Fetches pending ops from PGlite
   └─> Groups by sync_group_id
   └─> Sorts within group by entity priority (sales=1, sale_items=2, abonos=3)
   └─> Sends batch to server

3. Server receives POST /sync/batch
   └─> SyncEngine.processBatch()
       └─> OperationSorter.sort() (server-side re-sort)
       └─> For each operation:
           └─> SAVEPOINT sp_op_N
           └─> Check conflict (version)
           └─> Get handler from registry
           └─> Execute via SyncPipeline
           └─> RELEASE SAVEPOINT (or ROLLBACK on error)

4. Client receives response
   └─> For each result:
       └─> success → markCompleted()
       └─> conflict → markConflict()
       └─> failed → markFailed() (retry or dead letter)
```

## Sync Flow: Pull (Server → Client)

```
1. PullService.pull() called (auto or manual)
   └─> GET /sync/changes?since=timestamp&limit=100
   └─> Server returns changes since timestamp
   └─> For each change:
       └─> Apply to local PGlite (UPSERT)
       └─> Update cursor (since parameter)
```

## Sync Status Values

### Operation Status (sync_operations table)
- `pending` - Waiting to sync
- `processing` - Currently being sent
- `completed` - Successfully synced
- `failed` - Error, will retry
- `conflict` - Version conflict detected
- `dead_letter` - Max retries exceeded

### Entity Sync Status (sales, customers, etc.)
- `pending` - Needs sync
- `synced` - In sync with server
- `error` - Sync failed

## Coalescing Logic

When multiple operations target the same entity before sync:

| Existing | Incoming | Result |
|----------|----------|--------|
| insert | insert | merge payloads (first wins fields, second wins others) |
| insert | update | merge payloads |
| insert | delete | cancel (delete both) |
| update | update | merge payloads |
| update | delete | replace with delete |

See: `packages/app/app/lib/sync/sync-service.ts:223-262` (`getCoalescePlan()`)
