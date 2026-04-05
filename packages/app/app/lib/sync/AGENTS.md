# AGENTS.md - Sync Engine

> **REST-based custom sync layer for offline-first architecture**

## Overview

The `app/lib/sync/` directory contains the sync engine that enables Avileo's offline-first architecture. It uses a custom REST-based sync mechanism with PGLite (PostgreSQL in WASM) for local database storage and background synchronization with the backend.

## Architecture

### Sync Stack

```
┌─────────────────────────────────────────────────────────────┐
│                     React Components                        │
│              (TanStack Query hooks)                         │
├─────────────────────────────────────────────────────────────┤
│                  TanStack Query (Cache)                     │
├─────────────────────────────────────────────────────────────┤
│                  SyncCoordinator                            │
│    (Lifecycle orchestration, queue management, status)      │
├─────────────────────────────────────────────────────────────┤
│                  Sync Service Layer                         │
│    (SyncService for push, PullService for pull)             │
├─────────────────────────────────────────────────────────────┤
│                     PGLite (Local DB)                       │
│                 (IndexedDB persistence)                     │
├─────────────────────────────────────────────────────────────┤
│                     REST API                                │
│         (/sync/batch for push, /sync/changes for pull)     │
└─────────────────────────────────────────────────────────────┘
```

### SyncCoordinator

The **SyncCoordinator** (located at `packages/app/app/lib/sync/coordinator.ts`) orchestrates the sync lifecycle:

| Responsibility | Description |
|----------------|-------------|
| Queue Management | Manages the `sync_operations` queue |
| Event System | Provides event-driven updates for sync status |
| Status Tracking | Tracks sync status per entity and overall health |
| Retry Logic | Exponential backoff for failed operations |

## Directory Structure

```
app/lib/sync/
├── index.ts                    # Barrel exports
├── sync-service.ts             # Push sync (client → server)
├── pull-service.ts             # Pull sync (server → client)
├── config.ts                   # Sync configuration & constants
├── manual-sync.ts              # Manual sync trigger
├── service-provider.tsx        # React context provider
├── schema-mapper.ts            # Schema mapping utilities
├── change-applier.ts           # Apply server changes to local DB
└── backoff.ts                  # Retry backoff strategy
```

## Key Concepts

### Push Sync (Client → Server)

`SyncService` maneja la cola de operaciones pendientes y las sincroniza con el servidor:

```typescript
// sync-service.ts
export class SyncService {
  async enqueue(params: EnqueueParams): Promise<string> {
    // Add operation to sync queue
  }

  async processPending(): Promise<{ processed: number; failed: number; conflicts: number }> {
    // Process pending operations in batches
  }
}
```

### Pull Sync (Server → Client)

`PullService` descarga cambios del servidor y aplica a la base local:

```typescript
// pull-service.ts
export class PullService {
  async pull(): Promise<PullResult> {
    // Fetch changes from /sync/changes
    // Apply to local PGlite database
  }

  startAutoPull(): void {
    // Start periodic pull (every 10s when online)
  }
}
```

## Sync Configuration

```typescript
// config.ts
export const SYNC_CONFIG = {
  // Sync interval (5 seconds)
  SYNC_INTERVAL_MS: 5000,

  // Pull interval (10 seconds)
  PULL_INTERVAL_MS: 10000,

  // Batch size for operations
  BATCH_SIZE: 50,

  // Max retry attempts
  MAX_RETRIES: 5,

  // Backoff settings
  BACKOFF_BASE_MS: 1000,
  BACKOFF_MAX_MS: 30000,
} as const;

// Entity types that can be synced
export const SYNCABLE_ENTITIES = [
  "customers",
  "sales",
  "abonos",
  // ... add more entities here
] as const;
```

## Adding a New Syncable Entity

1. **Add to Shared Manifest** in `packages/shared/src/sync-manifest.ts`
   - Add to `canonicalEntities` for bidirectional sync
   - Or `localOnlyEntities` for client-only data
2. **Add to `SYNCABLE_ENTITIES`** in `config.ts`
3. **Add to `VALID_TABLES`** in `pull-service.ts` (for server → client sync)
4. **Create table** in `engine/db.ts` with `sync_status` and `sync_attempts` columns
5. **Create server handler** in `packages/backend/src/services/sync/handlers/`

## Service Provider

Wrap app with sync provider:

```typescript
// service-provider.tsx
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [syncService] = useState(() => new SyncService(pg, businessId, token));
  const [pullService] = useState(() => new PullService(pg, db, businessId, token));

  useEffect(() => {
    syncService.startAutoSync();
    pullService.startAutoPull();
  }, []);

  return (
    <SyncContext.Provider value={{ syncService, pullService }}>
      {children}
    </SyncContext.Provider>
  );
}
```

## Offline Write Pattern

When offline, writes go to PGLite and sync later:

```typescript
// In a component or hook
const handleCreateCustomer = async (data: CreateCustomerInput) => {
  // Always write to local DB first
  const tempId = crypto.randomUUID();
  await pg.query(
    `INSERT INTO customers (id, ..., sync_status) VALUES ($1, ..., 'pending')`,
    [tempId, ...]
  );

  // Enqueue for sync
  await syncService.enqueue({
    entity_type: 'customers',
    operation: 'insert',
    entityId: tempId,
    data,
  });

  return { id: tempId };
};
```

## Important Notes

### DO:
- Always write to local PGlite first
- Use `sync_status` field to track pending changes
- Handle sync errors gracefully
- Show sync status in UI
- Use SyncCoordinator for status tracking

### DON'T:
- Don't call API directly without enqueuing
- Don't forget to add entity to `SYNCABLE_ENTITIES`
- Don't ignore sync errors - show to user
- Don't forget to add table to `VALID_TABLES` for pull sync

---

*See [App AGENTS.md](../../AGENTS.md) for frontend overview.*
