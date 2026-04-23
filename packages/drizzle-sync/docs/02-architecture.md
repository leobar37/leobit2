# Architecture

High-level architecture of `@avileo/drizzle-sync`.

## Overview

`@avileo/drizzle-sync` is a **Drizzle-based offline-first sync library** for PostgreSQL (backend) and PGlite (frontend). It provides:

- Bidirectional sync between local PGlite (WASM PostgreSQL) and remote PostgreSQL
- Operation queue with status tracking
- Conflict detection and resolution
- Code generation from Drizzle schema
- Staged data loading for initial sync
- React integration

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │ React Hooks │    │   TanStack  │    │   Service Layer     │  │
│  │ useSync*   │◄──►│   Query     │◄──►│ (generated .services)│  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
│         │                                       │               │
│         ▼                                       ▼               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    SyncClientEngine                          ││
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐    ││
│  │  │PushService │  │PullService │  │SyncCoordinator     │    ││
│  │  │(local→srv) │  │(srv→local) │  │(lifecycle/orchest)│    ││
│  │  └────────────┘  └────────────┘  └────────────────────┘    ││
│  └─────────────────────────────────────────────────────────────┘│
│         │                                       │               │
│         ▼                                       ▼               │
│  ┌─────────────────┐                ┌─────────────────────────┐│
│  │  PgSyncQueue    │                │    ChangeApplier        ││
│  │  (local ops)    │                │    (apply srv changes)  ││
│  └─────────────────┘                └─────────────────────────┘│
│         │                                       │               │
│         ▼                                       ▼               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    PGlite (WASM PostgreSQL)                 ││
│  │                    (IndexedDB persistence)                   ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Backend (ElysiaJS)                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │ SyncEngine  │    │   Handler   │    │  ConflictResolver   │  │
│  │ (processBat │◄──►│  Registry   │◄──►│  (version-based)    │  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
│         │                                       │               │
│         ▼                                       ▼               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    PostgreSQL (Neon)                          ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Submodules

### `@avileo/drizzle-sync` (main)

Re-exports the recommended API:

```typescript
import { createSyncEngine } from "@avileo/drizzle-sync";
import { defineEntity } from "@avileo/drizzle-sync";
```

### `@avileo/drizzle-sync/core`

Runtime-agnostic types and interfaces. No platform dependencies.

| Export | Description |
|--------|-------------|
| `SyncOperation` | Operation record type |
| `SyncStatus` | Operation status enum |
| `EnqueueParams` | Parameters for enqueueing operations |
| `ISyncQueue` | Queue interface |
| `ISyncHandler` | Handler interface |
| `classifyError()` | Error classification |

### `@avileo/drizzle-sync/shared`

Shared constants used across modules:

```typescript
import { OPERATION_STATUS, CONFLICT_STRATEGY, PULL_STAGES } from "@avileo/drizzle-sync/shared";
```

### `@avileo/drizzle-sync/pglite`

PGlite (frontend) implementations:

| Class | Role |
|-------|------|
| `PgSyncQueue` | Local operation queue |
| `PushSyncService` | Push sync (local → server) |
| `PullSyncService` | Pull sync (server → local) |
| `ChangeApplier` | Apply changes to PGlite |
| `SyncCoordinator` | Auto-sync orchestration |
| `StagedPullCoordinator` | Initial 3-stage sync |

### `@avileo/drizzle-sync/client`

Framework-agnostic client engine:

```typescript
import { createSyncClientEngine } from "@avileo/drizzle-sync/client";

const engine = createSyncClientEngine({
  pg: myPglite,
  db: drizzle(myPglite),
  tenantId: "biz-123",
  apiUrl: "https://api.example.com",
});
```

### `@avileo/drizzle-sync/server`

Backend sync framework:

| Class | Role |
|-------|------|
| `SyncEngine` | Batch processing |
| `BaseSyncHandler` | Entity handler base |
| `GenericSyncHandler` | CRUD handler |
| `HandlerRegistry` | Handler registration |

### `@avileo/drizzle-sync/react`

React integration:

```typescript
import { SyncProvider, useSyncState } from "@avileo/drizzle-sync/react";

function MyComponent() {
  const { isSyncing, isOnline, pendingCount } = useSyncState();
}
```

### `@avileo/drizzle-sync/config`

Configuration, validation, and code generation:

```typescript
import { defineSyncConfig, validateConfig } from "@avileo/drizzle-sync/config";
```

### `@avileo/drizzle-sync/codecs`

Field-level serialization:

```typescript
import { currency, weight, dateOnly } from "@avileo/drizzle-sync/codecs";

const config = {
  fieldCodecs: {
    total_amount: currency(),
    weight_kg: weight(),
  },
};
```

## Data Flow

### Push Sync (Local → Server)

1. App writes to PGlite
2. Operation added to `sync_operations` queue with status `pending`
3. `PushSyncService.processPending()` sends batch to server
4. Server processes with `SyncEngine.processBatch()`
5. Local status updated to `completed`, `failed`, or `conflict`

### Pull Sync (Server → Local)

1. `PullSyncService.pull()` fetches changes from `/sync/changes`
2. `ChangeApplier.applyBatch()` applies to PGlite
3. Cursor stored for incremental sync

### Initial Sync (Staged)

For first-time sync, data loads in 3 stages:

1. **CRITICAL** - customers, products (immediate need)
2. **RECENT_SALES** - last 7 days of sales
3. **HISTORICAL** - older data

## Next Steps

- [Quick Start](./01-quickstart.md) - Get running in 5 minutes
- [Backend Configuration](./03-backend-config.md) - Config reference
- [Concepts](./06-concepts.md) - Deep dive into sync mechanics
