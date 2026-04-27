# Análisis del Framework drizzle-sync

**Fecha:** 2026-04-27
**Commit analizada:** 8c917d6
**Líneas de código:** ~31,421

## Resumen

El framework `drizzle-sync` es una librería de sincronización offline-first con **31,421 líneas de código** organizadas en 6 módulos principales. Implementa un motor push/pull completo con resolución de conflictos, colas de operaciones, backoff exponencial, y generación de código para servicios, hooks y schemas Drizzle. La arquitectura es runtime-agnóstica en el core y tiene adaptadores específicos para PGlite (cliente) y PostgreSQL (servidor).

Hay partes incompletas: cursores de stages no están conectados, `cleanupCompleted()` es un no-op, y `processGroup()` es un stub.

---

## Arquitectura General

```
packages/drizzle-sync/src/
├── core/           # Tipos, interfaces, utilidades runtime-agnósticas
├── server/         # Motor sync del servidor (PostgreSQL)
├── pglite/         # Adaptador PGlite (cliente)
├── client/         # SyncClientEngine (PGlite)
├── config/         # Sistema de configuración + code generators
├── codecs/         # Transformación de campos (date, currency, weight)
├── react/          # Integración React (hooks, provider, devtools)
└── shared/         # Constantes y utilidades compartidas
```

### Exports del paquete

```typescript
// Main entry
export { createSyncEngine, SyncEngineInstance } from './create-sync-engine';

// Config
export { defineEntity, entityBuilder, validateConfig, assertValidConfig };

// Core
export * from "./core/index";

// Database Adapter
export type { DatabaseAdapter };
export { PgLiteAdapter } from "./pglite/pglite-adapter";

// Codecs
export { decimalCodec, currency, weight, emptyStringToNull, dateOnly };
```

---

## Módulo Core (`src/core/`)

### types.ts

Define los tipos fundamentales del sync:

```typescript
// Tipos de operación y estado
SyncOperationType = "create" | "update" | "delete" | "batch"
SyncStatusType = "pending" | "processing" | "syncing" | "completed" | "failed" | "conflict" | "dead_letter"

// Parámetros para encolar una operación
interface EnqueueParams {
  entity_type: string;
  entityId: string;
  operation: SyncOperationType;
  data: Record<string, unknown>;
  idempotencyKey: string;
}

// Registro de operación en BD
interface SyncOperationRecord {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: SyncOperationType;
  payload: Record<string, unknown>;
  status: SyncStatusType;
  sync_attempts: number;
  // ...timestamps y metadatos
}

// Respuesta de batch sync
interface BatchSyncResponse {
  results: SyncOperationResult[];
  summary: { total, succeeded, failed, conflicts };
}

// Conflicto del servidor
interface BackendConflict {
  entity_type: string;
  entity_id: string;
  local_data: Record<string, unknown>;
  server_data: Record<string, unknown>;
  local_version: number;
  server_version: number;
}
```

Funciones utility destacadas:

```typescript
normalizeDatesToISO(obj)     // Convierte Date → ISO string recursivamente
buildPlaceholders(count, offset?) // Genera "$1, $2, $3..." para SQL
classifyError(error)        // Clasifica errores para retry (incluye patrones en español)
validateEntityTableName(entityType) // Valida que la entidad esté rastreada
```

### interfaces.ts

Contratos que las implementaciones deben cumplir:

```typescript
interface ISyncQueue {
  enqueue(params: EnqueueParams | EnqueueParams[]): Promise<string>;
  getPending(limit?: number): Promise<SyncOperationRecord[]>;
  markProcessing(id: string): Promise<void>;
  markCompleted(id: string): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  markConflict(id: string, conflict: BackendConflict): Promise<void>;
  moveToDeadLetter(id: string, error: string): Promise<void>;
  getStatus(): Promise<SyncStatus>;
  cleanupCompleted(olderThanMs: number): Promise<number>;
  retryOperation(id: string): Promise<void>;
  getFailedOperations(): Promise<SyncOperationRecord[]>;
  getDeadLetterOperations(): Promise<DeadLetterOperationRecord[]>;
}

interface ISyncHandler {
  entityType: string;
  execute(ctx: SyncContext, op: SyncOperationRecord, tx: unknown): Promise<HandlerResult>;
  supportsSelfHeal?(): boolean;
}

interface ISyncLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
}

interface ISyncHttpClient {
  sendBatch(entries: SyncBatchEntry[]): Promise<BatchSyncResponse>;
  fetchChanges(since: string, options?: FetchOptions): Promise<PullResponse>;
}
```

### backoff.ts

Estrategia de retry con backoff exponencial y jitter:

```typescript
interface BackoffOptions {
  baseDelayMs?: number;      // default: 1000
  maxDelayMs?: number;       // default: 30000
  multiplier?: number;         // default: 2
  jitter?: boolean;           // default: true (0.5-1.0 random)
}

class ExponentialBackoff implements IBackoffStrategy {
  getDelay(): number;
  recordSuccess(): void;
  recordFailure(): void;
  reset(): void;
  getConsecutiveFailures(): number;
}

// Wrapper genérico con retry
withRetry(fn, {
  maxRetries?: 3,
  retryDelayMs?: 100,
  onRetry?: (attempt, error) => void,
  isRetryable?: (error) => boolean,
}): Promise<T>
```

Patrones de error transitorio detectados (incluye español):
- `"database is locked"`, `"SQLITE_BUSY"`, `"connection"`, `"timeout"`
- `"deadlock"`, `"network"`, `"fetch failed"`, `"abort"`, `"offline"`
- `"no encontrad[oa]"`, `"no existe"`

### coalesce.ts

Merge de operaciones pendientes para el mismo entity:

| Existing Op | Incoming Op | Result |
|-------------|-------------|--------|
| create | create/update | merge into create |
| create | delete | cancel (nunca existió en server) |
| update | update | merge into update |
| update | delete | replace with delete |
| delete | create | replace with update (recreate) |
| anything else | - | none |

```typescript
getCoalescePlan(existing, incoming): CoalescePlan
canCoalesce(existing, incoming): boolean
deepMerge(target, source)  // Merge recursivo
mergeArrayById(arr1, arr2) // Merge por campo 'id'
```

### priority.ts

Ordenamiento de entidades para mantener integridad referencial. **Lower number = higher priority**:

```typescript
DEFAULT_PRIORITY = 99  // Default para entidades sin padres

// Parent = priority 1, cada nivel de hijos agrega 1
buildEntityProcessingOrder(entities) // Topological sort con cycle detection

// Helpers
isParentEntity(entityType): boolean   // priority === 1 o tiene childEntities
isChildEntity(entityType): boolean    // priority > 1 && priority < 99
getChildEntities(entityType): TEntity[]
getParentEntity(entityType): TEntity | undefined
```

### sync-events.ts

Sistema de eventos tipado, zero-dependency:

```typescript
// Tipos de eventos
type SyncEventType =
  | "pull:complete" | "pull:stale" | "pull:error"
  | "push:complete" | "push:error"
  | "conflict:detected"
  | "status:changed"
  | "operation:completed" | "operation:failed" | "operation:conflict"
  | "sync:online" | "sync:offline"
  | "coordinator:started" | "coordinator:stopped";

// Emitters disponibles
SyncEventEmitter        // In-memory con Map/Set
EventTargetAdapter      // Browser EventTarget API
NoOpSyncEventEmitter   // Zero overhead para producción
```

### database-adapter.ts

Abstracción para SQL execution:

```typescript
interface DatabaseAdapter {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(sql: string, params?: unknown[]): Promise<void>;
  getDb(): unknown;  // Retorna instancia Drizzle ORM
}
```

### event-buffer.ts

Ring buffer de 500 eventos para devtools:

```typescript
MAX_EVENTS = 500

initializeEventBuffer(syncEvents) // Suscribe a eventos, retorna unsubscribe
getEventBuffer(): TimelineEvent[]
getEventsByType(type, maxEvents?): TimelineEvent[]
clearEventBuffer(): void
```

---

## Módulo Server (`src/server/`)

### sync-engine.ts (740 líneas)

Motor principal del servidor. Procesa batches de operaciones en una transacción.

```typescript
interface SyncEngineConfig<TRequestContext, TTransaction> {
  db: DbClient<TTransaction>;
  syncOpRepo: ISyncOperationRepository;
  syncConflictRepo?: ISyncConflictRepository;
  conflictResolverRegistry?: GenericConflictResolverRegistry;
  entityRelations?: Record<string, { relations?; priority? }>;
  entityPriorities?: Record<string, number>;
  logger?: ISyncLogger;
  eventEmitter?: ISyncEventEmitter;
  middleware?: SyncEngineMiddleware;
  now: () => string;
  // SQL para savepoints
  savepointSql: (name: string) => unknown;
  releaseSavepointSql: (name: string) => unknown;
  rollbackSavepointSql: (name: string) => unknown;
}
```

**Flujo de processEntries():**

1. Wrapper en transacción database
2. Para cada entrada (`SyncBatchEntry`):
   - Si `kind === "single"`: usa savepoint por operación
   - Si `kind === "batch"`: procesa atómicamente (todo o nada)
3. `processOperation()`:
   - Check idempotencia (línea 472-484)
   - Detección de conflictos (línea 494-555)
   - Persist operation record
   - Get handler del registry
   - Execute con middleware hooks
   - Update status

**Middleware hooks:**

```typescript
interface SyncEngineMiddleware {
  beforeExecute?(ctx, op, handler, tx): Promise<SyncHandlerResult | null>;
  // Retornar no-null para short-circuit

  afterExecute?(ctx, op, result, handler, tx): Promise<SyncHandlerResult>;
  // Puede transformar resultado

  onError?(ctx, op, error, handler, tx): Promise<SyncHandlerResult>;
  // Handle errors sin rollback
}
```

### generic-handler.ts (502 líneas)

Handler genérico configurabe para CRUD:

```typescript
interface IGenericHandlerConfig<C, U, TEntity> {
  entityType: TEntity;
  schemas: { create: z.ZodType<C>; update: z.ZodType<U> };
  supportedOperations?: ("create" | "update" | "delete")[];

  // Field mapping (payload → DB column)
  createFieldMapping?: GenericFieldMapping;
  updateFieldMapping?: GenericFieldMapping;

  // Hooks
  postCreate?: GenericPostCreateHook<C>;
  postUpdate?: GenericPostUpdateHook<U>;
  preValidation?: GenericPreValidationOp;
  payloadEnricher?: GenericPayloadEnricherOp;  // Inject ctx-derived fields
  postOperation?: GenericPostOperationOp;

  // Parent validation
  parentCheck?: GenericParentCheck;
  additionalParentChecks?: GenericAdditionalParentCheck[];
  skipOnParentMissing?: boolean;  // Para delete

  // Version conflict
  versionConflictField?: string;

  // Custom operations (reemplazan repo CRUD)
  customCreate?: GenericCustomCreateOp;
  customUpdate?: GenericCustomUpdateOp;
  customDelete?: GenericCustomDeleteOp;

  createDefaults?: Record<string, unknown>;
}
```

**Flujo Create:**
1. Enrich payload (inyecta campos del ctx)
2. preValidation hook
3. Parse con schema + apply defaults
4. Map fields via createFieldMapping
5. Validate parent (registry check → DB fallback)
6. Execute customCreate o repo.create
7. postCreate y postOperation hooks

### base-handler.ts (392 líneas)

Base class abstracta con funcionalidad común:

```typescript
// Template method para create/update/delete
protected async executeOperation(
  ctx, operation,
  handlers: { create, update, delete }
): Promise<SyncHandlerResult>

// Clasificación de errores
classifyError(error): {
  code: "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT" | "DATABASE_ERROR" | "NETWORK_ERROR";
  isRetryable: boolean;
  isSelfHealable: boolean;
}

// Validación de parent con optimization registry
ensureParentExists(parentId, ctx, tx): Promise<void>
// Usa registry.wasCreated() para skip DB queries si parent fue creado en same batch
```

### operation-repository.ts (247 líneas)

```typescript
interface ISyncOperationRepository {
  findByIdempotencyKey(ctx, key, tx?): Promise<SyncOperationRecord | undefined>;
  findByIdempotencyKeyForUpdate(ctx, key, tx?): Promise<SyncOperationRecord>; // con row lock

  insertOrUpdate(ctx, operation, tx?): Promise<"inserted" | "updated" | "already-processed">;
  // "already-processed" = idempotency hit

  updateStatus(ctx, key, status, error?, tx?, payload?): Promise<void>;
  findMany(ctx, options): Promise<SyncOperationRecord[]>;
}
```

### operation-sorter.ts (337 líneas)

Ordenamiento topológico por dependencias FK:

```typescript
// 1. FK dependencies (padres antes que hijos)
// 2. Entity priority (secondary)
// 3. Local timestamp (tertiary para deterministic ordering)

sortOperationsByPriority(operations): SyncOperationRecord[]
buildDependencyGraph(operations): DependencyGraph  // Kahn's algorithm con cycle detection
```

### conflict-resolver.ts

```typescript
// Version-based conflict detection
// Skip para create/delete (solo updates tienen version conflict)
BaseVersionConflictResolver.checkConflict(ctx, op, tx): ConflictCheckResult

// Registry para entity-specific resolvers
GenericConflictResolverRegistry.getResolver(entityType): IGenericConflictResolver
```

### router.ts

Factory de route handlers framework-agnostic:

```typescript
interface SyncRouteHandlers<TContext> {
  postBatch: (ctx, body) => Promise<SyncBatchResult>;
  getChanges: (ctx, query: { since?, limit?, cursor?, entityTypes? }) => Promise<Change[]>;
  getHealth: (ctx) => Promise<HealthStatus>;
  getConflicts: (ctx, query) => Promise<Conflict[]>;
  resolveConflict: (ctx, params, body: { resolution, mergedData? }) => Promise<void>;
  getDeadLetter: (ctx, query) => Promise<DeadLetterItem[]>;
  deleteDeadLetter: (ctx, params) => Promise<void>;
}
```

### sync-service.ts (365 líneas)

Orquesta el SyncEngine con hooks de negocio:

```typescript
interface SyncServiceHooks {
  onConflictDetected?: (entityType, result, record, ctx) => Promise<ConflictCheckResult>;
  enrichChanges?: (changes: SyncChange[], ctx) => Promise<SyncChange[]>;
  beforeOperation?: (operation, ctx) => Promise<void>;
  afterOperation?: (operation, result, ctx) => Promise<void>;
  onBatchComplete?: (result, ctx) => Promise<void>;
}
```

---

## Módulo PGlite/Client (`src/pglite/` + `src/client/`)

### sync-client-engine.ts (822 líneas)

Facade principal que composa toda la infraestructura:

```typescript
interface SyncClientEngineOptions {
  databaseConfig: PgliteDatabaseConfig;
  serverUrl: string;
  entityConfigs: EntityConfigs;
  stagedSyncConfig?: StagedPullConfig;
  fileStorage?: FileStorageAdapter;
  events?: ISyncEventEmitter;
  logger?: ISyncLogger;
  syncIntervalMs?: number;
}

// Inicialización (línea 211-352)
async initialize(): Promise<void> {
  // 1. Initialize PGlite
  // 2. Create PgSyncQueue
  // 3. Create PushSyncService + PullSyncService
  // 4. Create SyncCoordinator
  // 5. Create StagedPullCoordinator si stages configurado
  // 6. Instantiate entity services via factory functions
}

// Métodos públicos
async performInitialSync(onProgress?): Promise<InitialSyncResult>
async start(): Promise<void>           // Auto-sync
async stop(): Promise<void>            // Stop auto-sync
async triggerSync(): Promise<void>     // Force push
async triggerPull(): Promise<PullResult>
async batch<T>(callback): Promise<T>   // Atomic operations
async resetAndLogout(): Promise<void>
```

### PushSyncService (`push-service.ts`, 346 líneas)

Orquesta push sync:

```typescript
interface PushResult {
  success: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  conflicts: number;
  errors: string[];
}

async enqueue(params: EnqueueParams | EnqueueParams[]): Promise<string>
async processPending(ignoreOnlineCheck?): Promise<PushResult>
async resolveConflict(opId, resolution, mergedData?): Promise<boolean>
async getStatus(): Promise<SyncStatus>
startAutoSync(): void
stopAutoSync(): void
```

### SyncBatchProcessor (`batch-processor.ts`, 412 líneas)

Procesa operaciones pendientes en batches:

```typescript
// Sorting por entity priority (FK ordering)
fetchPendingOperations(limit): SyncOperationRecord[]

// Chunking (BATCH_SIZE = 50 default)
chunkOperations(ops, BATCH_SIZE): SyncOperationRecord[][]

// Upload files referenciados antes de enviar batch
uploadPendingFiles(operations): Promise<{ success: boolean; errors: string[] }>
// Detecta CUID2-format strings como file IDs

// Process batch
private async processBatch(rows): Promise<ProcessPendingResult>
```

### SyncCoordinator (`coordination-coordinator.ts`, 399 líneas)

Orquesta push + pull auto-sync:

```typescript
interface SyncCoordinatorOptions {
  pushIntervalMs?: number;   // default: 5000
  pullIntervalMs?: number;   // default: 10000
  enableAutoSync?: boolean;   // default: true
}

async start(): Promise<void>
stop(): void

// Handle online/offline
private async onOnline(): Promise<void> {
  // 1. Reset backoffs
  // 2. Check if pull stuck → forceResetSync
  // 3. Otherwise trigger reconnect
}
```

### StagedPullCoordinator (`coordination-staged-pull-coordinator.ts`, 546 líneas)

3-stage prioritized data loading para initial sync:

```typescript
interface StageConfig<TStage> {
  name: TStage;
  entities: readonly string[];
  lookbackDays: number | null;
  behavior: {
    maxIterations: number;
    retryAttempts: number;
    retryDelayMs: number;
    onError: "throw" | "continue";
    batchDelayMs: number;
  };
}

// 3 Stages
const STAGES = {
  CRITICAL: { blocking: true },      // Core entities para que la app funcione
  RECENT_SALES: { blocking: true },  // Transacciones recientes
  HISTORICAL: { blocking: false },   // Datos antiguos (background)
} as const;

// Ejecuta sequence
async executeStagedLoad(): Promise<{
  critical: StagedPullState;
  recent: StagedPullState;
  historical: Promise<StagedPullState>;
}>
```

⚠️ **Incompleto:** `getStageCursor()` retorna `null` — cursor persistence no conectada.

### PullSyncService (`pull-service.ts`)

```typescript
async pull(options?: PullOptions): Promise<PullResult> {
  // 1. Fetch changes desde server (since cursor)
  // 2. Apply cambios locally via ChangeApplier
  // 3. Store cursor para próxima vez
}
```

---

## Módulo Config (`src/config/`)

### define-config.ts

Entry point principal:

```typescript
defineSyncConfig({
  entities: {
    customers: { table: customersTable, syncable: true },
    sales: { table: salesTable, syncable: true, relations: { children: ["sale_items"] } },
    // ...
  },
  options: {
    tenancy: { tenantField: "businessId", tenantColumn: "business_id" },
  },
  schema: { autoBuild: true, output: "./generated" }
})
```

### builder.ts

```typescript
class SyncConfigBuilder<TEntities> {
  async buildSchema(): Promise<SyncSchema>
  getSchema(): SyncSchema | undefined
  getRuntimeConfig(): RuntimeSyncConfig
  startWatch(): void   // File watching para dev
  stopWatch(): void
}
```

### entity-definition.ts

DSL fluent para definir entidades:

```typescript
// Approach funcional
defineEntity("customer", {
  table: customersTable,
  fields: ["name", "email", "phone"],
  priority: 1,
  conflictResolver: "version-based",
  hooks: {
    beforeSync: async (data) => { /* */ },
    onConflict: "merge",
  },
});

// Approach builder
entityBuilder("customer")
  .fields(["name", "email"])
  .priority(1)
  .parentFields(["business_id"])
  .childEntities(["sale_items"])
  .hooks({ onConflict: "server" })
  .build();
```

### validator.ts

Validación completa de configuración:

```typescript
validateSyncConfig(config): ConfigValidationResult
// {
//   valid: boolean;
//   errors: ConfigValidationError[];
//   warnings: ConfigValidationWarning[];
// }

// Errores incluyen path, message, y hint
```

### introspect.ts

Introspecciona tablas Drizzle y construye grafo de relaciones:

```typescript
// Detecta columnas, tipos, precisión, defaults
introspectTable(table): ColumnMetadata[]

// Detecta relaciones desde naming convention *_id
detectRelations(table): {
  foreignKeys: Array<{ column, references, isRequired }>;
  children: string[];
}

// Construye grafo con priorities basadas en parent chain depth
buildRelationGraph(entities): RelationGraph
```

### Code Generators

#### service-generator.ts (625 líneas)

Genera `BaseService` subclasses para PGlite:

```typescript
// Generado para cada entidad:
// - Create*Input, Update*Input interfaces
// - findById(id)
// - list({ search?, limit?, offset?, sortBy?, sortOrder? })
// - create(input)
// - update(id, input)
// - delete(id)

// Field codec support
// currency → normalizeCurrency()
// weight → normalizeWeight()
// empty-string-to-null

// Auto-managed columns excluidas:
Set(["id", "sync_status", "sync_attempts", "tenant_id",
     "created_at", "updated_at", "version"])
```

#### hooks-generator.ts (419 líneas)

Genera TanStack Query hooks:

```typescript
// Por entidad:
useCustomers(options?)           // list query
useCustomer(id)                 // single query
useCreateCustomer()             // mutation
useUpdateCustomer()             // mutation
useDeleteCustomer()             // mutation

// ListOptions interface
interface CustomerListOptions {
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: "name" | "createdAt";
  sortOrder?: "asc" | "desc";
}
```

#### local-first-hooks-generator.ts (477 líneas)

Genera hooks offline-first:

```typescript
// Pattern offline-first:
async create(input, tenantId) {
  const id = crypto.randomUUID();

  // 1. INSERT into PGlite IMMEDIATELY
  await pg.query(insertSQL, params);

  // 2. Enqueue sync operation para background sync
  await syncService.enqueue({ entity_type, entityId: id, operation: "create", data });

  // 3. Return inmediato — no espera server
  return { id };
}
```

Soporta child entities — extrae arrays children del input, crea cada child con parent FK.

#### drizzle-schema-generator.ts (403 líneas)

Genera Drizzle ORM schema para PGlite:

```typescript
// Enum scoping (maneja name collisions)
// Auto-indexes en sync_status, business_id, *_id
// Type exports ($inferSelect, $inferInsert)
```

#### server-factory-generator.ts (403 líneas)

Genera `AvileoSyncFactory` para backend:

```typescript
export class AvileoSyncFactory {
  constructor(options: AvileoSyncFactoryOptions) { }

  onConflictDetected(handler): this
  enrichChanges(handler): this
  beforeOperation(handler): this
  afterOperation(handler): this
  onBatchComplete(handler): this
  withHandler(entity, config): this
  withConflictResolver(entity, resolver): this

  build(): SyncService<SyncRequestContext>
}
```

---

## Módulo Codecs (`src/codecs/`)

### FieldCodec Interface

```typescript
interface FieldCodec<TInput, TStored, TSync = TStored, TOutput = TInput> {
  kind: string;
  toStorage(value: TInput | TStored | null | undefined): TStored | null | undefined;
  fromStorage(value: TStored | null | undefined): TOutput | null | undefined;
  toSync?(value: TInput | TStored | null | undefined): TSync | null | undefined;
  fromSync?(value: TSync | null | undefined): TOutput | null | undefined;
  toPatch?(value: TInput | TStored | null | undefined): TStored | undefined;
  isNullable?: boolean;
  defaultValue?: TStored | null;
}
```

### Entity Serializer

```typescript
// Aplica FieldCodecMap a entity objects
serializeEntityInput(source, codecs)    // Entity → Storage
deserializeEntityRow(source, codecs)    // Storage → Entity
serializeSyncPayload(source, codecs)   // Entity → Sync payload
deserializeSyncPayload(source, codecs)   // Sync payload → Entity
```

### Codec Implementations

| Codec | Storage | Scale | Use Case |
|-------|---------|-------|----------|
| `decimalCodec(scale)` | string | configurable | Generic decimal |
| `currency()` | string | 2 | PEN soles |
| `weight()` | string | 3 | Kilograms |
| `dateOnly()` | string | - | ISO `YYYY-MM-DD` |
| `emptyStringToNull()` | string \| null | - | Optional text fields |

**Nota:** Todos los valores numéricos se almacenan como strings para evitar floating-point precision loss.

---

## Módulo React (`src/react/`)

### Provider Pattern

```typescript
// Acepta runtime o factory
<SyncProvider runtime={runtime}>
  <App />
</SyncProvider>

// Factory async para lazy initialization
<SyncProvider runtime={() => createRuntime()}>
  <App />
</SyncProvider>
```

### Hooks (16 hooks)

```typescript
// State
useSyncState(): SyncStateSnapshot
useSyncStatus(): { isSyncing, isOnline, isStuck, hasPending, hasFailed, hasConflicts, hasDeadLetter }
useSyncLogs(): SyncLogEntry[]
useSyncConflicts(): SyncConflictRecord[]

// Boolean checks
useHasPendingSync(): boolean
useHasFailedSync(): boolean
useIsSyncStuck(): boolean

// Engine access
useSyncEngine(): SyncClientEngine
useSyncOperations(): SyncClientOperations
useEngineService<T>(name): T
useServices<T>(): T

// Lifecycle
useSyncInit(engine, options?): {
  isReady, isLoading, error, schemaError, hasInitTimeout, progress, totalChanges
}
useSyncLifecycle(runtime)
useSyncEvent(eventType, handler)
```

### DevTools

```typescript
<SyncDevToolsProvider config={{ onClearStorage }}>
  <App />
</SyncDevToolsProvider>

<SyncDevTools enabled={import.meta.env.DEV} />
```

8 tabs: Status, Operations, DLQ, Tables, Database, Timeline, Metrics, Performance.

---

## Issues y Partes Incompletas

| Location | Issue | Impact |
|----------|-------|--------|
| `staged-pull-coordinator.ts:793-795` | `getStageCursor()` returns `null` | Cursor no persistido — usuario pierde progreso de sync inicial en restart |
| `queue-queue.ts:165-168` | `cleanupCompleted()` es no-op | Dead letter y completed ops crecen indefinidamente |
| `push-service.ts:137-139` | `processGroup()` es stub | Group-based sync no funciona |
| `types.ts:390` y `coalesce.ts:110` | `parsePayload` duplicado | Mantenimiento conflactante |
| `provider.tsx` | No `isInitializing` flag ni `LoadingComponent` prop | Provider renderiza `null` durante init sin feedback |
| `create-sync-runtime.ts` | `onEntityTypesChanged` no documentado | Cache invalidation de TanStack Query no claro |

---

## Flujo de Datos Completo

### Push (Upload)

```
App writes to PGlite
        │
        ▼
PgSyncQueue.enqueue()
        │
        ▼
SyncCoordinator.start() [auto] o triggerSync() [manual]
        │
        ▼
PushSyncService.processPending()
        │
        ├── Acquire mutex
        ▼
SyncBatchProcessor.processPending()
        │
        ├── fetchPendingOperations() [sorted by priority]
        ├── chunkOperations(50)
        ├── uploadPendingFiles() [extract CUID2 file IDs]
        │
        ▼
POST /sync/batch → Server
        │
        ▼
Server: SyncEngine.processEntries()
        ├── db.transaction()
        ├── For each entry: SAVEPOINT + processOperation()
        │   ├── idempotency check
        │   ├── conflict detection
        │   ├── GenericHandler.execute()
        │   └── updateStatus()
        │
        ▼
SyncBatchResult { results[], summary{} }
        │
        ▼
Client: Process results
        ├── markCompleted() / markFailed()
        ├── markConflict()
        └── moveToDeadLetter() [if max retries exceeded]
```

### Pull (Download)

```
triggerPull() o auto-interval
        │
        ▼
PullSyncService.pull()
        │
        ├── Acquire mutex
        ▼
GET /sync/changes?since={cursor}&limit=500
        │
        ▼
Server: SyncService.getChanges()
        │
        ▼
Change[] + nextCursor
        │
        ▼
Apply changes locally via ChangeApplier
        │
        ├── Insert/update/delete en PGlite
        └── Store cursor
```

### Initial Sync (Staged)

```
performInitialSync()
        │
        ├── STAGE 1: CRITICAL [blocking]
        │   ├── entities: customers, products, categories, business_users
        │   ├── lookbackDays: null (full)
        │   └── App usable después de completar
        │
        ├── STAGE 2: RECENT_SALES [blocking]
        │   ├── entities: sales, sale_items
        │   ├── lookbackDays: 7
        │   └── Recent transactions disponibles
        │
        └── STAGE 3: HISTORICAL [background]
            ├── entities: sales, sale_items
            ├── lookbackDays: null (full history)
            └── Non-blocking promise
```

---

## Recomendaciones

1. **Completar staged pull cursors** — Conectar `getStageCursor()` con persistencia para permitir resume después de app restart

2. **Implementar `cleanupCompleted()`** — Agregar cleanup de operaciones completadas y dead letter olderThan

3. **Implementar `processGroup()`** o eliminar — Stub actual no hace nada, confusion si se intenta usar

4. **Documentar `onEntityTypesChanged`** — Clarificar integración con TanStack Query para cache invalidation

5. **Dedup `parsePayload`** — Extraer a utility compartida, importar desde un lugar

6. **Agregar `isInitializing` a SyncProvider** — Para mostrar loading state durante inicialización
