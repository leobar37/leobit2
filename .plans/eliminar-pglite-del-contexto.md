# Plan: Eliminar PGlite del Contexto y Completar la Abstracción

## Objetivo

Eliminar **completamente** `pg` y `db` de `SyncClientEngineContext`. El contexto solo expone `adapter: DatabaseAdapter` como la única forma de acceso al DB. En legacy mode (pg+db), el engine crea un `PgLiteAdapter` internamente y lo pone en el contexto. Nada de opcional, nada de deprecated — eliminación directa.

## Contexto

### Problema Actual

`SyncClientEngineContext` declara `pg: PGlite` como **requerido** (non-nullable):

```typescript
export interface SyncClientEngineContext {
  pg: PGlite;        // ← requerido, pero en adapter mode es null
  db: ReturnType<typeof drizzle>;
  adapter?: DatabaseAdapter;
  // ...
}
```

Esto fuerza al engine a hacer un cast peligroso:

```typescript
const context: SyncClientEngineContext = {
  pg: this.pg ?? (null as unknown as PGlite),  // ← type-safe lie
  // ...
};
```

### Nueva Arquitectura

```
┌─────────────────────────────┐
│   SyncClientEngine          │
│   - almacena pg/db interno  │  ← solo para backward compat externo
│   - crea PgLiteAdapter      │
│   - expone adapter en ctx   │
└─────────────┬───────────────┘
              │
┌─────────────▼───────────────┐
│   SyncClientEngineContext   │
│   - adapter: DatabaseAdapter│  ← único campo de DB
│   - tenantId, userId, etc   │
└─────────────┬───────────────┘
              │
   ┌──────────┼──────────┐
   │          │          │
┌──▼──┐   ┌──▼──┐   ┌──▼──┐
│Batch │   │Lifecycle│  │Queue  │
│Proc  │   │Service  │  │       │
└──────┘   └──────┘   └──────┘
```

## Alcance

### Dentro del alcance
- Eliminar `pg` y `db` de `SyncClientEngineContext` por completo
- Eliminar el cast `null as unknown as PGlite` del engine
- En legacy mode, auto-crear `PgLiteAdapter` y ponerlo en `context.adapter`
- Migrar `SyncBatchProcessor` a aceptar `DatabaseAdapter`
- Actualizar `PushSyncService` para pasar `context.adapter` a batch processor
- Exportar `PgLiteAdapter` desde `pglite/index.ts`
- Actualizar tests rotos
- Validar que el build pasa

### Fuera del alcance
- Cambios en `packages/app` — eso viene después
- Eliminar `getPg()` del engine — se mantiene para backward compat externo
- Migrar `SqlExecutor` a `DatabaseAdapter` — coexisten por ahora
- Cambios en `database-init.ts` — sigue siendo específico de PGlite
- Crear `SQLiteAdapter` — trabajo futuro

## Tareas

### T-001: Eliminar pg/db del contexto y auto-crear PgLiteAdapter en legacy mode

**Archivos:**
- `packages/drizzle-sync/src/client/types.ts`
- `packages/drizzle-sync/src/client/sync-client-engine.ts`

**En `types.ts`:**

Eliminar `pg` y `db` del contexto:

```typescript
export interface SyncClientEngineContext {
  /** Database adapter — única interfaz de acceso al DB */
  adapter: DatabaseAdapter;
  /** Business/tenant ID for multi-tenancy */
  tenantId: string;
  /** Tenant partition column for scoped entities */
  tenantColumn: string;
  /** Business user ID for audit trails */
  userId: string;
  /** Sync service for enqueuing operations */
  syncService: SyncWritePort;
}
```

**En `sync-client-engine.ts`:**

1. En `doInitialize()`, cuando se usa legacy mode (pg+db o databaseConfig), crear `PgLiteAdapter`:

```typescript
private async doInitialize(): Promise<void> {
  if (this.config.adapter) {
    this.pg = null;
    this.db = this.config.adapter.getDb() as ReturnType<typeof drizzle>;
    this.adapter = this.config.adapter;
  } else if (this.config.databaseConfig) {
    const result = await initPgliteDatabase({ ... });
    this.pg = result.pg;
    this.db = result.db;
    this.adapter = new PgLiteAdapter(result.pg, result.db);
  } else if (this.config.pg && this.config.db) {
    this.pg = this.config.pg;
    this.db = this.config.db;
    this.adapter = new PgLiteAdapter(this.config.pg, this.config.db);
  } else {
    throw new Error("SyncClientEngine requires 'adapter', 'databaseConfig', or both 'pg' and 'db'.");
  }
}
```

2. Agregar campo privado `adapter: DatabaseAdapter | null = null;`

3. En ambos lugares donde se crea el contexto, usar:

```typescript
const context: SyncClientEngineContext = {
  adapter: this.adapter!,
  tenantId,
  tenantColumn: tenantColumn ?? "tenant_id",
  userId,
  syncService: this.syncService!,
};
```

### T-002: Migrar SyncBatchProcessor a DatabaseAdapter

**Archivo:** `packages/drizzle-sync/src/pglite/batch-processor.ts`

**Cambios:**

1. Cambiar import de `PGlite` a `DatabaseAdapter`
2. Cambiar constructor:

```typescript
constructor(
  private adapter: DatabaseAdapter,
  private tenantId: string,
  private httpClient: ISyncHttpClient,
  private lifecycle: SyncOperationLifecycleService,
  private autoRunner: SyncAutoRunner,
  options: BatchProcessorOptions = {}
)
```

3. Cambiar `this.pg.query(...)` a `this.adapter.query(...)` en `fetchPendingOperations()`

### T-003: Actualizar PushSyncService

**Archivo:** `packages/drizzle-sync/src/pglite/push-service.ts`

**Cambios:**

1. Eliminar la creación de adapter fallback en el constructor (ya no es necesaria — `context.adapter` siempre existe)
2. En `processPending()`, pasar `this.context.adapter` a `SyncBatchProcessor`:

```typescript
const batchProcessor = new SyncBatchProcessor(
  this.context.adapter,
  this.context.tenantId,
  this.httpClient,
  this.lifecycleService!,
  this.autoRunner,
  {
    tenantColumn: this.context.tenantColumn,
  }
);
```

### T-004: Exportar PgLiteAdapter desde pglite/index.ts

**Archivo:** `packages/drizzle-sync/src/pglite/index.ts`

```typescript
export { PgLiteAdapter } from "./pglite-adapter";
```

### T-005: Actualizar tests

**Archivos:**
- `packages/drizzle-sync/src/pglite/__tests__/entity-status-updater.test.ts`
- `packages/drizzle-sync/src/pglite/__tests__/operation-lifecycle.test.ts`
- `packages/drizzle-sync/src/pglite/__tests__/batch-processor.test.ts`

**Cambios:**

En todos los tests, eliminar mocks de `PGlite` y usar mocks de `DatabaseAdapter`:

```typescript
function createMockAdapter() {
  return {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    exec: vi.fn().mockResolvedValue(undefined),
    getDb: vi.fn(),
  };
}

// Uso:
const adapter = createMockAdapter();
const updater = new SyncEntityStatusUpdater(adapter, "tenant-1", ...);
```

### T-006: Validar build y typecheck

```bash
cd packages/drizzle-sync && bun run build
cd packages/app && bun run typecheck
```

## Orden de Ejecución

```
T-001 ──→ T-002 ──→ T-003 ──→ T-004 ──→ T-005 ──→ T-006
```

## Notas Importantes

- **`getPg()` se mantiene** en `SyncClientEngine` para backward compat con `packages/app`. Retorna `PGlite` en legacy mode, lanza error en adapter mode.
- **`pg` y `db` desaparecen del contexto** — los servicios internos nunca los ven.
- **En legacy mode**, el engine crea `PgLiteAdapter` automáticamente y lo expone en `context.adapter`. Los servicios internos no saben si están hablando con PGlite real o con otro backend.
- **El app (`packages/app`) no se toca** — seguirá usando `getPg()` por ahora. Se adaptará en trabajo futuro.
