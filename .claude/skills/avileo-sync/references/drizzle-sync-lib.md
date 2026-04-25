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
| `@avileo/drizzle-sync/core` | Types, interfaces, `DatabaseAdapter`, `classifyError()` |
| `@avileo/drizzle-sync/shared` | Constants (`OPERATION_STATUS`, `CONFLICT_STRATEGY`, `PULL_STAGES`) |
| `@avileo/drizzle-sync/pglite` | `PgSyncQueue`, `PushSyncService`, `PullSyncService`, `ChangeApplier`, `SyncCoordinator`, `StagedPullCoordinator`, `PgLiteAdapter` |
| `@avileo/drizzle-sync/client` | `SyncClientEngine` — framework-agnostic client |
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

## DatabaseAdapter Abstraction

The `@avileo/drizzle-sync` library uses a `DatabaseAdapter` interface to abstract the database backend, enabling support for PGlite (browser), SQLite (React Native), or PostgreSQL (Node.js).

### Interface

```typescript
// @avileo/drizzle-sync/core
export interface DatabaseAdapter {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(sql: string, params?: unknown[]): Promise<void>;
  getDb(): unknown;
}
```

### PGlite Implementation

```typescript
// @avileo/drizzle-sync/pglite
export class PgLiteAdapter implements DatabaseAdapter {
  constructor(pg: PGlite, db: DrizzleInstance) {}
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>
  exec(sql: string, params?: unknown[]): Promise<void>
  getDb(): DrizzleInstance
}
```

### Engine Initialization

`SyncClientEngine` supports 3 modes, all converging to `DatabaseAdapter`:

| Mode | Config | Result |
|------|--------|--------|
| **Custom adapter** | `config.adapter` | Uses consumer-provided adapter directly |
| **Auto-init** | `config.databaseConfig` | Creates PGlite, wraps in `PgLiteAdapter` |
| **Legacy** | `config.pg` + `config.db` | Wraps provided instances in `PgLiteAdapter` |

### Context

`SyncClientEngineContext` exposes **only** `adapter` — no `pg` or `db` fields:

```typescript
export interface SyncClientEngineContext {
  adapter: DatabaseAdapter;  // ← only DB field
  tenantId: string;
  tenantColumn: string;
  userId: string;
  syncService: SyncWritePort;
}
```

All internal services (`SyncBatchProcessor`, `SyncOperationLifecycleService`, `SyncEntityStatusUpdater`, `PgSyncQueue`, `ChangeApplier`) consume `DatabaseAdapter` exclusively.

### Future Backends

Implement `DatabaseAdapter` for any SQL backend:

```typescript
class SQLiteAdapter implements DatabaseAdapter {
  query<T>(sql, params) { /* SQLite implementation */ }
  exec(sql, params) { /* SQLite implementation */ }
  getDb() { return this.drizzleDb; }
}
```

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

## Schema Generation

`@avileo/drizzle-sync` automatically generates a PGlite-compatible Drizzle schema from the backend PostgreSQL schema:

### Generated Artifacts

Located in `packages/app/app/lib/sync/generated/`:

| File | Purpose | Source |
|------|---------|--------|
| `schema.ts` | **Drizzle ORM tables, enums, types** | Auto-generated from `sync.schema.json` |
| `services.ts` | BaseService subclasses | Auto-generated |
| `hooks.ts` | TanStack Query hooks | Auto-generated |
| `engine.ts` | `createAvileoSyncEngine()` factory | Auto-generated |
| `init.sql` | PGlite DDL | Auto-generated |
| `schemas.ts` | Zod validation schemas | Auto-generated |

### Schema Architecture

```
Backend Schema (pgEnum, FKs, indexes) ← Source of truth
         │
         ▼
   drizzle-sync build-schema
         │
         ▼
   sync.schema.json (serialized)
         │
         ▼
   drizzle-sync generate
         │
         └── packages/app/app/lib/sync/generated/
                  ├── schema.ts (pgTable + enums + types)
                  ├── engine.ts (imports schema, exposes via engine.tables)
                  └── ...
```

### Usage in Services

**OLD (deprecated)**:
```typescript
// ❌ Don't import from @avileo/shared
import { customers, SyncStatus } from "@avileo/shared";
```

**NEW (generated)**:
```typescript
// ✅ Import from generated schema
import { customers, SyncStatus } from "~/lib/sync/generated/schema";

// Or access via engine.tables (preferred for services)
export class CustomerService extends BaseService {
  async findById(id: string) {
    return this.db.select()
      .from(this.tables.customers)  // ← via engine.tables
      .where(eq(this.tables.customers.id, id));
  }
}
```

### Enum Generation

PostgreSQL `pgEnum` columns are automatically converted to `const` objects:

```typescript
// Generated in schema.ts
export const SyncStatus = {
  PENDING: "pending",
  SYNCED: "synced",
  ERROR: "error",
} as const;

// Used in table definition
export const customers = pgTable("customers", {
  syncStatus: text("sync_status").notNull().default(SyncStatus.SYNCED),
  // ...
});
```

### Type Generation

Types are inferred from Drizzle `$inferSelect`/`$inferInsert`:

```typescript
// Generated in schema.ts
export type Customers = typeof customers.$inferSelect;
export type NewCustomers = typeof customers.$inferInsert;
```

### Regeneration

```bash
# From packages/backend/
bun run sync:generate

# Or manually:
cd ../drizzle-sync && bun run build && bun ./dist/cli.js generate \
  --schema ../backend/src/sync.schema.json \
  --output ../app/app/lib/sync/generated
```

## Next Steps

- [Quick Start](../packages/drizzle-sync/docs/01-quickstart.md) - Get running in 5 minutes
- [Migration v2](../packages/drizzle-sync/docs/11-migration-v2.md) - Breaking changes from v1
