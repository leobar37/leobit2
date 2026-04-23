# Configuration Reference

Complete reference for all configuration options.

## defineSyncConfig

Main config function.

```typescript
import { defineSyncConfig } from "@avileo/drizzle-sync/config";

const config = defineSyncConfig({
  entities: { /* ... */ },
  tenancy: { /* ... */ },
  options: { /* ... */ },
  schema: { /* ... */ },
});
```

### Config Schema

```typescript
interface SyncConfig {
  entities: Record<string, EntityConfig>;
  tenancy?: TenancyConfig;
  options?: SyncOptions;
  schema?: SchemaConfig;
}
```

---

## EntityConfig

Configuration for a single syncable entity.

```typescript
interface EntityConfig {
  // Required
  table: PgTable;
  syncable: boolean;

  // Field selection
  fields?: string[];
  autoFields?: boolean;
  excludeFields?: string[];

  // Sync behavior
  conflictResolver?: ConflictResolutionStrategy;
  relations?: RelationsConfig;
  fieldCodecs?: FieldCodecMap;
  apiPath?: string;

  // Custom data
  metadata?: Record<string, unknown>;
}
```

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `table` | `PgTable` | **required** | Drizzle table reference |
| `syncable` | `boolean` | **required** | Enable sync |
| `fields` | `string[]` | all | Explicit field list |
| `autoFields` | `boolean` | `false` | Use all fields |
| `excludeFields` | `string[]` | `[]` | Exclude from auto |
| `conflictResolver` | `string` | `"version-based"` | Resolution strategy |
| `relations` | `RelationsConfig` | `{}` | Parent/child relations |
| `fieldCodecs` | `FieldCodecMap` | `{}` | Serialization codecs |
| `apiPath` | `string` | entity name | API route override |
| `metadata` | `object` | `{}` | Custom metadata |

### conflictResolver

```typescript
type ConflictResolutionStrategy =
  | "version-based"   // Server wins if version > local
  | "last-write-wins"  // Latest timestamp wins
  | "merge";           // Field-level merge
```

### RelationsConfig

```typescript
interface RelationsConfig {
  children?: ChildRelationConfig[];
  parents?: ParentRelationConfig[];
}

interface ChildRelationConfig {
  entity: string;           // Child entity name
  foreignKey: string;       // FK column name
  cascade?: boolean;        // Delete children with parent
}

interface ParentRelationConfig {
  entity: string;          // Parent entity name
  foreignKey: string;       // FK column name
}
```

### FieldCodecMap

```typescript
interface FieldCodecMap {
  [fieldName: string]: FieldCodec | ((field: unknown) => unknown);
}
```

---

## TenancyConfig

Multi-tenant isolation settings.

```typescript
interface TenancyConfig {
  tenantColumn: string;  // DB column name (e.g., "business_id")
  tenantField: string;   // Operation field name (e.g., "businessId")
}
```

---

## SyncOptions

Runtime behavior options.

```typescript
interface SyncOptions {
  batchSize?: number;        // Default: 50
  maxRetries?: number;       // Default: 5
  syncInterval?: number;      // Default: 30000 (ms)
  pullInterval?: number;      // Default: 10000 (ms)
  backoffBaseMs?: number;    // Default: 1000
  backoffMaxMs?: number;     // Default: 30000
}
```

---

## SchemaConfig

Schema generation settings.

```typescript
interface SchemaConfig {
  output: string;           // Output path for JSON
  autoBuild?: boolean;     // Build on config change
  watch?: boolean;         // Watch mode
  watchPath?: string;      // File to watch
}
```

---

## Field Codecs

Built-in field codecs.

### currency

```typescript
function currency(options?: { nullable?: boolean }): FieldCodec<number, string>
```

### weight

```typescript
function weight(options?: { nullable?: boolean }): FieldCodec<number, string>
```

### dateOnly

```typescript
function dateOnly(): FieldCodec<Date, string>
```

### emptyStringToNull

```typescript
function emptyStringToNull(): FieldCodec<string, string | null>
```

---

## ClientConfig

Frontend engine configuration.

```typescript
interface ClientConfig {
  pg: Pglite;
  db: Database;
  tenantId: string;
  userId?: string;
  authToken: string;
  apiUrl: string;
  httpClient?: ISyncHttpClient;
  entities: string[];
  options?: {
    batchSize?: number;
    syncInterval?: number;
    pullInterval?: number;
  };
}
```

---

## ServerConfig

Backend engine configuration.

```typescript
interface ServerConfig {
  db: Database;
  config: SyncConfig;
  conflictResolver?: IConflictResolver;
  handlers?: Record<string, ISyncHandler>;
  logger?: SyncLogger;
}
```

---

## SyncStatusType

Operation status values.

```typescript
type SyncStatusType =
  | "pending"      // Waiting in queue
  | "processing"   // Being processed
  | "syncing"      // Sent to server
  | "completed"    // Successfully synced
  | "failed"       // Failed (may retry)
  | "conflict"     // Conflict detected
  | "dead_letter"; // Permanently failed
```

---

## PullStages

Initial sync stages.

```typescript
const PULL_STAGES = {
  CRITICAL: "CRITICAL",        // Immediate data
  RECENT_SALES: "RECENT_SALES", // Last 7 days
  HISTORICAL: "HISTORICAL",    // All other data
} as const;
```

---

## Default Values

```typescript
const DEFAULT_SYNC_CONFIG = {
  batchSize: 50,
  maxRetries: 5,
  syncInterval: 30000,
  pullInterval: 10000,
  backoffBaseMs: 1000,
  backoffMaxMs: 30000,
};
```

---

## Validation Errors

Config validation returns structured errors.

```typescript
interface ValidationError {
  path: string;      // e.g., "entities.customers.table"
  message: string;   // e.g., "Table is required"
  hint?: string;     // e.g., "Add a Drizzle table reference"
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
```

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Table is required` | Entity without table | Add Drizzle table reference |
| `Invalid table` | Table is not Drizzle table | Use a proper `pgTable` |
| `Circular dependency` | Parent-child cycle | Break the cycle |
| `Unknown entity` | Relation to non-existent entity | Check entity names |
| `Invalid codec` | Codec function error | Check codec implementation |

---

## Next Steps

- [Quick Start](./01-quickstart.md) - Get started
- [Backend Config](./03-backend-config.md) - Example configurations
- [CLI Reference](./04-cli.md) - Commands and flags
