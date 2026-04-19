# Architecture

## How the System Works

### Monorepo Structure
```
packages/
├── app/              # React Router v7 frontend (SPA)
├── backend/          # ElysiaJS API server
├── shared/           # Shared types, enums, sync config
└── drizzle-sync/     # Sync library (server + client + generators)
```

### Sync Architecture
- **Local DB**: PGlite (PostgreSQL in WASM) on device
- **Push**: Client enqueues operations → batch POST to `/sync/batch`
- **Pull**: 3-stage strategy (CRITICAL → RECENT_SALES → HISTORICAL)
- **Handlers**: Entity-specific handlers extend BaseSyncHandler
- **Conflict Resolution**: Version-based with admin UI

### Backend Sync Flow
1. `SyncService.processBatch(ctx, operations)` receives operations
2. `SyncEngine` sorts by priority, manages transaction + savepoints
3. `SyncPipeline` (as middleware) validates structure → business rules → executes
4. `BaseSyncHandler` implementations perform CRUD via repositories
5. Conflict resolver checks version conflicts before execution
6. Results returned with success/failure/conflict status

### Frontend Sync Flow
1. User creates/updates/deletes entity via service method
2. Service writes to PGlite and queues sync operation
3. `SyncService` (frontend) batches pending operations
4. `PushService` sends batch to backend when online
5. Backend processes and returns results
6. `PullService` fetches server changes and applies via `ChangeApplier`
7. Query caches invalidated, UI updates reactively

### Code Generation
- `drizzle-sync generate` introspects Drizzle schema
- Produces: Zod schemas, PostgreSQL DDL, applier config, hooks, services, types
- Frontend uses generated code instead of manual implementations

## Data Flow
```
Drizzle Schema (backend)
    ↓
Introspection (drizzle-sync)
    ↓
Generated: DDL → PGlite tables
Generated: Zod → validation
Generated: Services → CRUD + sync queue
Generated: Hooks → TanStack Query
    ↓
Frontend uses generated hooks/services
    ↓
PGlite (local) ←→ Sync Queue ←→ Backend API
```

## Invariants
- All sync-capable tables have `sync_status` and `sync_attempts` columns
- All backend queries filter by `businessId`
- All writes go through local PGlite first (offline-first)
- Generated code must match manual patterns exactly
- Complex entities (sales, distribuciones, purchases) remain manual
