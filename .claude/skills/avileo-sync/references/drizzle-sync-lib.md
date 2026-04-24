# Drizzle-Sync Library Guide

Guide to the `@avileo/drizzle-sync` library extracted from `packages/drizzle-sync/docs/`.

## Overview

`@avileo/drizzle-sync` is a **Drizzle-based offline-first sync library** for PostgreSQL (backend) and PGlite (frontend). Key features:

- Bidirectional sync between local PGlite (WASM PostgreSQL) and remote PostgreSQL
- Operation queue with status tracking
- Conflict detection and resolution
- Code generation from Drizzle schema
- Staged data loading for initial sync
- React integration

## Submodules

| Module | Purpose |
|--------|---------|
| `@avileo/drizzle-sync` | Main re-exports |
| `@avileo/drizzle-sync/core` | Types, interfaces, `classifyError()` |
| `@avileo/drizzle-sync/shared` | Constants (`OPERATION_STATUS`, `CONFLICT_STRATEGY`, `PULL_STAGES`) |
| `@avileo/drizzle-sync/pglite` | `PgSyncQueue`, `PushSyncService`, `PullSyncService`, `ChangeApplier`, `SyncCoordinator`, `StagedPullCoordinator` |
| `@avileo/drizzle-sync/client` | `createSyncClientEngine` — framework-agnostic client |
| `@avileo/drizzle-sync/server` | `SyncEngine`, `BaseSyncHandler`, `GenericSyncHandler`, `HandlerRegistry` |
| `@avileo/drizzle-sync/react` | `SyncProvider`, `useSyncState` |
| `@avileo/drizzle-sync/config` | `defineSyncConfig`, `validateConfig` |
| `@avileo/drizzle-sync/codecs` | `currency()`, `weight()`, `dateOnly()`, `emptyStringToNull()` |

## Library Documentation Map

| Topic | Doc File |
|-------|----------|
| Quick Start | `packages/drizzle-sync/docs/01-quickstart.md` |
| Architecture | `packages/drizzle-sync/docs/02-architecture.md` |
| Backend Config | `packages/drizzle-sync/docs/03-backend-config.md` |
| CLI Reference | `packages/drizzle-sync/docs/04-cli.md` |
| Frontend React | `packages/drizzle-sync/docs/05-frontend-react.md` |
| Key Concepts | `packages/drizzle-sync/docs/06-concepts.md` |
| API Reference | `packages/drizzle-sync/docs/07-api-reference.md` |
| Advanced | `packages/drizzle-sync/docs/08-advanced.md` |
| Configuration | `packages/drizzle-sync/docs/09-configuration.md` |
| File Handling | `packages/drizzle-sync/docs/10-file-handling.md` |
| **Migration v2** | `packages/drizzle-sync/docs/11-migration-v2.md` |

## Key Concepts

### Sync Operations

```typescript
interface SyncOperation {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: "create" | "update" | "delete";
  data: Record<string, unknown>;
  status: SyncStatus;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
  sync_attempts: number;
  sync_error?: string;
}
```

### Operation Lifecycle

```
pending → processing → syncing → completed
                   ↘         ↗
                     failed
                   ↘         ↗
                   conflict → resolved
                   ↘
                dead_letter
```

### Staged Initial Sync

For first-time sync, data loads in 3 prioritized stages:

| Stage | Entities | Description |
|-------|----------|-------------|
| `CRITICAL` | customers, products | Immediate data needed |
| `RECENT_SALES` | sales (7 days) | Recent operational data |
| `HISTORICAL` | everything else | Full data load |

## Field Codecs

```typescript
import { currency, weight, dateOnly, emptyStringToNull } from "@avileo/drizzle-sync/codecs";

// Usage in entity config
fieldCodecs: {
  total_amount: currency(),
  weight_kg: weight(),
  birth_date: dateOnly(),
  optional_note: emptyStringToNull(),
}
```

## Conflict Resolution Strategies

```typescript
// In entity config
sales: {
  conflictResolver: "version-based", // | "last-write-wins" | "merge"
}
```

## Self-Healing

Some errors can be auto-corrected:

```typescript
const { code, isRetryable, isSelfHealable } = classifyError(error);

// RECORD_NOT_FOUND → auto-convert update → create
// VALIDATION_ERROR → not retryable
// NETWORK_ERROR → retryable
// CONFLICT → requires manual resolution
```

## Multi-Tenancy

```typescript
tenancy: {
  tenantColumn: "business_id",  // DB column
  tenantField: "businessId",    // Operation field
}
```

## Next Steps

- [Quick Start](../packages/drizzle-sync/docs/01-quickstart.md) - Get running in 5 minutes
- [Migration v2](../packages/drizzle-sync/docs/11-migration-v2.md) - Breaking changes from v1
