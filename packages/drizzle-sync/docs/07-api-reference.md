# API Reference

Complete API reference for `@avileo/drizzle-sync`.

## Main Entry (`@avileo/drizzle-sync`)

```typescript
import {
  createSyncEngine,
  defineEntity,
  entityBuilder,
  validateConfig,
  assertValidConfig,
} from "@avileo/drizzle-sync";
```

### Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `createSyncEngine(config)` | `SyncEngineInstance` | Create server-side sync engine |
| `defineEntity(config)` | `EntityConfig` | Define a single entity |
| `entityBuilder()` | `EntityBuilder` | Fluent entity builder |
| `validateConfig(config)` | `ValidationResult` | Validate sync config |
| `assertValidConfig(config)` | `void` | Assert config validity, throw if invalid |

### Types

```typescript
type EntityConfig = {
  table: PgTable;
  syncable: boolean;
  fields?: string[];
  autoFields?: boolean;
  excludeFields?: string[];
  conflictResolver?: ConflictResolutionStrategy;
  relations?: RelationsConfig;
  fieldCodecs?: FieldCodecMap;
  apiPath?: string;
  metadata?: Record<string, unknown>;
};

type ConflictResolutionStrategy = "version-based" | "last-write-wins" | "merge";
```

---

## `@avileo/drizzle-sync/core`

Runtime-agnostic types and interfaces.

```typescript
import * as Core from "@avileo/drizzle-sync/core";
```

### Types

```typescript
// Operation types
type SyncOperationType = "create" | "update" | "delete";
type SyncStatusType = "pending" | "processing" | "syncing" | "completed" | "failed" | "conflict" | "dead_letter";

// Core interfaces
interface SyncOperation {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: SyncOperationType;
  data: Record<string, unknown>;
  status: SyncStatusType;
  idempotency_key: string;
  sync_group_id?: string;
  created_at: string;
  updated_at: string;
  sync_attempts: number;
  sync_error?: string;
}

interface EnqueueParams {
  entity_type: string;
  entityId: string;
  operation: SyncOperationType;
  data: Record<string, unknown>;
  idempotencyKey?: string;
  fastPath?: boolean;
}

interface BatchSyncResponse {
  results: OperationResult[];
  cursor?: string;
}

interface BackendConflict {
  operation_id: string;
  entity_type: string;
  entity_id: string;
  local_version: number;
  server_version: number;
  local_data: Record<string, unknown>;
  server_data: Record<string, unknown>;
}
```

### Interfaces

```typescript
interface ISyncQueue {
  enqueue(params: EnqueueParams): Promise<string>;
  getPending(limit: number): Promise<SyncOperation[]>;
  updateStatus(id: string, status: SyncStatusType): Promise<void>;
  getStatus(id: string): Promise<SyncOperation | null>;
}

interface ISyncHandler {
  handle(operation: SyncOperation): Promise<HandlerResult>;
}

interface ISyncHttpClient {
  push(operations: SyncOperation[]): Promise<BatchSyncResponse>;
  pull(cursor?: string): Promise<PullResponse>;
}

interface IConflictResolver {
  detect(local: EntityData, server: EntityData): ConflictResult;
  resolve(conflict: BackendConflict, strategy: ConflictResolutionStrategy): ResolutionResult;
}
```

### Error Classification

```typescript
enum SyncErrorCode {
  RECORD_NOT_FOUND = "RECORD_NOT_FOUND",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  CONFLICT = "CONFLICT",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

function classifyError(error: unknown): {
  code: SyncErrorCode;
  isRetryable: boolean;
  isSelfHealable: boolean;
  message: string;
};
```

---

## `@avileo/drizzle-sync/shared`

Shared constants.

```typescript
import {
  OPERATION_STATUS,
  CONFLICT_STRATEGY,
  PULL_STAGES,
  DEFAULT_SYNC_CONFIG,
  SYNCABLE_ENTITIES,
} from "@avileo/drizzle-sync/shared";
```

### Constants

```typescript
const OPERATION_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  SYNCING: "syncing",
  COMPLETED: "completed",
  FAILED: "failed",
  CONFLICT: "conflict",
  DEAD_LETTER: "dead_letter",
} as const;

const CONFLICT_STRATEGY = {
  SERVER_WINS: "server-wins",
  CLIENT_WINS: "client-wins",
  FIELD_MERGE: "field-merge",
  MANUAL: "manual",
} as const;

const PULL_STAGES = {
  CRITICAL: "CRITICAL",
  RECENT_SALES: "RECENT_SALES",
  HISTORICAL: "HISTORICAL",
} as const;

const DEFAULT_SYNC_CONFIG = {
  MAX_RETRIES: 5,
  BATCH_SIZE: 100,
  SYNC_INTERVAL_MS: 5000,
  PULL_INTERVAL_MS: 10000,
  BACKOFF_BASE_MS: 1000,
  BACKOFF_MAX_MS: 30000,
};
```

---

## `@avileo/drizzle-sync/client`

Framework-agnostic client engine.

```typescript
import {
  createSyncClientEngine,
  initPgliteDatabase,
  getDatabase,
  disposeDatabase,
  resetDatabase,
  computeSchemaHash,
  hasSchemaChanged,
  createFetchHttpClient,
} from "@avileo/drizzle-sync/client";
```

### Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `createSyncClientEngine(config)` | `SyncClientEngine` | Create client engine |
| `initPgliteDatabase(config?)` | `Promise<Pglite>` | Initialize PGlite |
| `getDatabase()` | `Pglite` | Get current DB instance |
| `disposeDatabase()` | `void` | Cleanup DB |
| `resetDatabase()` | `void` | Reset to empty state |
| `createFetchHttpClient(config)` | `ISyncHttpClient` | Create HTTP client |

### SyncClientEngine

```typescript
interface SyncClientEngine {
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): void;

  // Services
  getSyncService(): PushSyncService;
  getPullService(): PullSyncService;
  getCoordinator(): SyncCoordinator;

  // DB access
  getPg(): Pglite;
  getDb(): Database;

  // Services by entity
  getService<T>(entity: string): T;
}
```

### ClientConfig

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

## `@avileo/drizzle-sync/pglite`

PGlite-specific implementations (frontend).

```typescript
import {
  PgSyncQueue,
  PushSyncService,
  PullSyncService,
  ChangeApplier,
  SyncCoordinator,
  SyncAutoRunner,
  StagedPullCoordinator,
} from "@avileo/drizzle-sync/pglite";
```

### Classes

| Class | Description |
|-------|-------------|
| `PgSyncQueue` | Local operation queue backed by PGlite |
| `PushSyncService` | Orchestrates push sync |
| `PullSyncService` | Fetches and applies changes |
| `ChangeApplier` | Applies changes to local DB |
| `SyncCoordinator` | Manages auto-sync |
| `SyncAutoRunner` | Background auto-sync runner |
| `StagedPullCoordinator` | Handles 3-stage initial sync |

### PullStatus

```typescript
interface PullStatus {
  isPulling: boolean;
  lastPullTime: string | null;
  lastError: string | null;
  consecutiveFailures: number;
  cursor: string | null;
  isStuck: boolean;
  consecutiveStalePulls: number;
}
```

---

## `@avileo/drizzle-sync/react`

React integration hooks and providers.

```typescript
import {
  SyncProvider,
  useSyncState,
  useSyncStatus,
  useSyncEngine,
  useSyncInit,
  useSyncOperations,
  useSyncConflicts,
  useSyncEvent,
  useSyncLogs,
  createSyncReactRuntime,
} from "@avileo/drizzle-sync/react";
```

### Components

| Component | Props | Description |
|-----------|-------|-------------|
| `SyncProvider` | `engine`, `runtime?` | App-level provider |
| `SyncDevTools` | (none) | Debug panel |

### Hooks

| Hook | Returns | Description |
|------|---------|-------------|
| `useSyncState()` | `SyncState` | Full sync state |
| `useSyncStatus()` | `SyncStatus` | Boolean flags |
| `useSyncEngine()` | `SyncClientEngine` | Engine instance |
| `useSyncInit()` | `StagedPullState` | Initial sync progress |
| `useSyncOperations(filters?)` | `OperationsResult` | Query operations |
| `useSyncConflicts()` | `ConflictsResult` | Conflict records |
| `useSyncEvent(event, handler)` | `void` | Subscribe to events |
| `useSyncLogs()` | `SyncLog[]` | Access sync logs |

### SyncState

```typescript
interface SyncState {
  pull: PullStatus;
  push: {
    pending: number;
    processing: number;
    syncing: number;
    completed: number;
    failed: number;
    conflict: number;
    deadLetter: number;
    total: number;
  };
  isSyncing: boolean;
  isOnline: boolean;
  lastSyncTime: Date | null;
  isStuck: boolean;
}
```

### SyncStatus

```typescript
interface SyncStatus {
  isSyncing: boolean;
  isOnline: boolean;
  isStuck: boolean;
  hasPending: boolean;
  hasFailed: boolean;
  hasConflicts: boolean;
  hasDeadLetter: boolean;
}
```

---

## `@avileo/drizzle-sync/server`

Backend sync engine.

```typescript
import {
  SyncEngine,
  BaseSyncHandler,
  GenericSyncHandler,
  HandlerRegistry,
} from "@avileo/drizzle-sync/server";
```

### Classes

| Class | Description |
|-------|-------------|
| `SyncEngine` | Core batch processing engine |
| `BaseSyncHandler` | Abstract base for entity handlers |
| `GenericSyncHandler` | Generic CRUD handler |
| `HandlerBuilder` | Builder for custom handlers |
| `HandlerRegistry` | Dynamic handler registration |

### SyncEngine

```typescript
class SyncEngine {
  constructor(config: SyncEngineConfig);
  processBatch(ctx: RequestContext, operations: SyncOperation[]): Promise<BatchResult>;
  registerHandler(entity: string, handler: ISyncHandler): void;
}
```

---

## `@avileo/drizzle-sync/config`

Configuration and code generation.

```typescript
import {
  defineSyncConfig,
  validateConfig,
  defineEntity,
  entityBuilder,
  loadConfig,
  generateAll,
} from "@avileo/drizzle-sync/config";
```

### Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `defineSyncConfig(config)` | `SyncConfigBuilder` | Create sync config |
| `validateConfig(config)` | `ValidationResult` | Validate config |
| `defineEntity(config)` | `EntityConfig` | Define entity |
| `entityBuilder()` | `EntityBuilder` | Fluent builder |
| `loadConfig(path)` | `Promise<unknown>` | Load from file |
| `generateAll(schema, options)` | `GenerateOutput` | Generate all files |

---

## `@avileo/drizzle-sync/codecs`

Field serialization codecs.

```typescript
import {
  currency,
  weight,
  dateOnly,
  emptyStringToNull,
  serializeEntityInput,
  deserializeEntityRow,
} from "@avileo/drizzle-sync/codecs";
```

### Codecs

| Codec | Options | Description |
|-------|---------|-------------|
| `currency(opts?)` | `nullable?` | Money (PEN) |
| `weight(opts?)` | `nullable?` | Weight (kg) |
| `dateOnly()` | - | Date without time |
| `emptyStringToNull()` | - | Empty → null |

---

## Next Steps

- [Quick Start](./01-quickstart.md) - Get started
- [Configuration](./09-configuration.md) - Full config reference
