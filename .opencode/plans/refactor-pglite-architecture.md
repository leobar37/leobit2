# Refactor PGlite Module - Plan Técnico

## Overview

Refactorización completa del módulo `packages/drizzle-sync/src/pglite/` para separar responsabilidades, eliminar código mezclado, y establecer una arquitectura extensible con logging como plugin.

**Decisión clave:** Mantener SQL raw (no Drizzle ORM), pero con arquitectura preparada para futura migración a Drizzle.

---

## Current State Analysis

### Archivos a Refactorizar (19 archivos)

| Archivo | Líneas | Responsabilidad Principal | Problema |
|---------|--------|---------------------------|----------|
| `change-applier.ts` | 466 | Aplicar cambios del servidor | SQL mezclado con lógica, logging hardcodeado |
| `pull-service.ts` | 984 | Fetch y aplicación de cambios | HTTP + lógica de aplicación mezclados |
| `sync-service.ts` | 543 | Push al servidor | Múltiples servicios acoplados |
| `pg-sync-queue.ts` | 611 | Cola de operaciones | SQL raw mezclado con coalescing |
| `coordinator.ts` | 422 | Orquestación push/pull | Logging directo a console |
| `staged-pull-coordinator.ts` | ~600 | Pull por etapas | Complejidad mezclada |
| `sync-batch-processor.ts` | ~350 | Procesamiento batch | Retry + HTTP + queue acoplados |
| `schema-mapper.ts` | 351 | Validación de columnas | Whitelist hardcodeada |
| Otros 11 archivos | - | Utilidades, lifecycle, etc. | Logging disperso |

### Problemas Arquitectónicos

1. **SQL mezclado con lógica de negocio** - No se puede testear sin PGlite real
2. **Logging hardcodeado** - Usa `syncLogger` directamente, no extensible
3. **Sin interfaces** - Todo es concreto, no hay mocks posibles
4. **Múltiples responsabilidades por archivo** - Violación de SRP

---

## Target Architecture

### Estructura de Carpetas

```
packages/drizzle-sync/src/pglite/
├── index.ts                    # Public API exports
├── domain/
│   ├── change/                # Aplicación de cambios (pull)
│   │   ├── applier.ts         # ChangeApplier principal
│   │   ├── strategies.ts      # Insert/Update/Delete strategies
│   │   ├── conflict-checker.ts
│   │   └── types.ts
│   ├── queue/                 # Cola de operaciones
│   │   ├── queue.ts           # PgSyncQueue
│   │   ├── repository.ts      # SQL operations para queue
│   │   ├── coalescer.ts       # Lógica de coalescing
│   │   └── types.ts
│   ├── push/                  # Push sync (client → server)
│   │   ├── service.ts         # SyncService
│   │   ├── batch-processor.ts
│   │   ├── lifecycle.ts       # Operation lifecycle management
│   │   ├── http-client.ts     # Interface + default impl
│   │   └── types.ts
│   ├── pull/                  # Pull sync (server → client)
│   │   ├── service.ts         # PullService
│   │   ├── staged-coordinator.ts
│   │   ├── cursor-storage.ts  # Interface + default impl
│   │   └── types.ts
│   └── coordination/          # Orquestación
│       ├── coordinator.ts     # SyncCoordinator
│       ├── mutex.ts           # ISyncMutex + implementations
│       └── auto-runner.ts     # SyncAutoRunner
├── infra/
│   ├── sql-gateway.ts         # Gateway para SQL raw
│   ├── logger/
│   │   ├── interface.ts       # SyncLogger interface
│   │   └── default.ts         # Default implementation (syncLogger actual)
│   └── initialization/
│       └── service.ts         # SyncInitializationService
└── config/
    └── defaults.ts            # REQUIRED_COLUMN_DEFAULTS, etc.
```

### Nuevas Interfaces (Capa de Abstracción)

```typescript
// infra/sql-gateway.ts
export interface SqlGateway {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (gw: SqlGateway) => Promise<T>): Promise<T>;
}

// infra/logger/interface.ts
export interface SyncLogger {
  debug(context: string, message: string, meta?: Record<string, unknown>): void;
  info(context: string, message: string, meta?: Record<string, unknown>): void;
  warn(context: string, message: string, meta?: Record<string, unknown>): void;
  error(context: string, message: string, meta?: Record<string, unknown>): void;
}

// domain/push/http-client.ts
export interface SyncHttpClient {
  postBatch(operations: SyncOperation[]): Promise<BatchResponse>;
  getConflicts(options?: ConflictQueryOptions): Promise<ConflictListResponse>;
  getConflict(id: string): Promise<ConflictResponse>;
  resolveConflict(id: string, resolution: string, data?: unknown): Promise<ConflictResponse>;
  abort(): void;
}

// domain/pull/cursor-storage.ts
export interface CursorStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

// domain/coordination/mutex.ts
export interface SyncMutex {
  acquire(type: 'push' | 'pull'): Promise<boolean>;
  release(): void;
}
```

---

## Implementation Plan

### Phase 1: Foundation Layer

#### T-001: Crear infraestructura base
- **Archivos:**
  - `infra/sql-gateway.ts` - Gateway para SQL raw con PGlite
  - `infra/logger/interface.ts` - Interfaz SyncLogger
  - `infra/logger/default.ts` - Implementación con syncLogger actual
- **Detalle:**
  - SqlGateway envuelve PGlite.query() y PGlite.exec()
  - Logger interface permite inyección de dependencias
- **Tests:** Verificar que SqlGateway ejecuta queries correctamente

#### T-002: Crear config/defaults.ts
- **Archivos:**
  - `config/defaults.ts` - Extraer REQUIRED_COLUMN_DEFAULTS de change-applier
- **Detalle:**
  - Mover constantes hardcodeadas a configuración centralizada

### Phase 2: Domain - Change Application (Pull)

#### T-003: Implementar ChangeApplier con SQL Gateway
- **Archivos:**
  - `domain/change/types.ts` - PullChange, ApplyResult, etc.
  - `domain/change/strategies.ts` - InsertStrategy, UpdateStrategy, DeleteStrategy
  - `domain/change/conflict-checker.ts` - Detección de conflictos
  - `domain/change/applier.ts` - ChangeApplier principal
- **API Nueva:**
  ```typescript
  export class ChangeApplier {
    constructor(
      private gateway: SqlGateway,
      private businessId: string,
      private logger: SyncLogger,
      private config: ApplierConfig
    ) {}

    async apply(change: PullChange): Promise<ApplyResult>;
    async applyBatch(changes: PullChange[]): Promise<BatchApplyResult>;
  }
  ```
- **Tests:** Tests de integración con gateway mockeado

### Phase 3: Domain - Queue Operations

#### T-004: Refactor PgSyncQueue
- **Archivos:**
  - `domain/queue/types.ts` - Queue interfaces
  - `domain/queue/repository.ts` - SQL para operaciones de cola
  - `domain/queue/coalescer.ts` - Lógica de coalescing extraída
  - `domain/queue/queue.ts` - PgSyncQueue implementación
- **Detalle:**
  - Separar SQL de lógica de negocio (coalescing)
  - Usar SqlGateway en lugar de PGlite directo

### Phase 4: Domain - Push Service

#### T-005: Refactor SyncService y componentes
- **Archivos:**
  - `domain/push/types.ts` - Tipos de push sync
  - `domain/push/http-client.ts` - Interface + default fetch implementation
  - `domain/push/lifecycle.ts` - SyncOperationLifecycleService refactorizado
  - `domain/push/batch-processor.ts` - SyncBatchProcessor refactorizado
  - `domain/push/service.ts` - SyncService principal
- **Detalle:**
  - Extraer HTTP client a interface
  - Usar logger inyectado en lugar de syncLogger global
  - Separar lifecycle del batch processor

### Phase 5: Domain - Pull Service

#### T-006: Refactor PullService
- **Archivos:**
  - `domain/pull/types.ts` - Tipos de pull sync
  - `domain/pull/cursor-storage.ts` - Interface + default (localStorage/memory)
  - `domain/pull/service.ts` - PullService refactorizado
- **Detalle:**
  - Extraer cursor storage a interface
  - Usar ChangeApplier inyectado
  - Usar logger inyectado

#### T-007: Refactor StagedPullCoordinator
- **Archivos:**
  - `domain/pull/staged-coordinator.ts` - Mover desde raíz
- **Detalle:**
  - Integrar con nuevo PullService
  - Usar interfaces inyectadas

### Phase 6: Coordination Layer

#### T-008: Refactor SyncCoordinator
- **Archivos:**
  - `domain/coordination/mutex.ts` - ISyncMutex + implementations
  - `domain/coordination/auto-runner.ts` - SyncAutoRunner
  - `domain/coordination/coordinator.ts` - SyncCoordinator refactorizado
- **Detalle:**
  - Usar logger inyectado
  - Extraer mutex a interface

### Phase 7: Infrastructure & Initialization

#### T-009: Refactor Initialization
- **Archivos:**
  - `infra/initialization/service.ts` - SyncInitializationService
- **Detalle:**
  - Usar SqlGateway en lugar de PGlite directo

### Phase 8: Public API & Cleanup

#### T-010: Crear nuevo index.ts
- **Archivos:**
  - `index.ts` - Nuevos exports
- **API Breaking Changes:**
  - `applyChange()` → `ChangeApplier.apply()`
  - `applyChangesBatch()` → `ChangeApplier.applyBatch()`
  - `SyncService` ahora requiere `SqlGateway` y `SyncLogger` inyectados
  - `PullService` ahora requiere interfaces inyectadas
- **Detalle:**
  - Documentar todos los breaking changes
  - Exportar interfaces para testing

#### T-011: Eliminar archivos viejos
- **Eliminar:**
  - `change-applier.ts`
  - `sync-queue.ts` (si existe - parece ser un stub)
  - Todos los archivos raíz que fueron movidos a domain/

---

## API Changes Summary

### Antigua API

```typescript
// change-applier.ts
export async function applyChange(
  pg: PGlite,
  change: PullChange,
  businessId: string,
  options?: ApplyChangeOptions
): Promise<ChangeApplicationResult>;

export async function applyChangesBatch(
  pg: PGlite,
  changes: PullChange[],
  businessId: string,
  options?: { checkConflicts?: boolean; useTransaction?: boolean; maxRetries?: number }
): Promise<ApplyChangesBatchResult>;

// sync-service.ts
export class SyncService {
  constructor(pg: PGlite, businessId: string, options?: SyncServiceOptions);
}

// pull-service.ts
export class PullService {
  constructor(pg: PGlite, drizzle: DrizzleClient | null, options: PullServiceOptions);
}
```

### Nueva API

```typescript
// domain/change/applier.ts
export class ChangeApplier {
  constructor(
    gateway: SqlGateway,
    businessId: string,
    logger?: SyncLogger,
    config?: ApplierConfig
  );
  apply(change: PullChange): Promise<ApplyResult>;
  applyBatch(changes: PullChange[]): Promise<BatchApplyResult>;
}

// domain/push/service.ts
export class PushSyncService {
  constructor(
    gateway: SqlGateway,
    httpClient: SyncHttpClient,
    queue: SyncQueue,
    mutex: SyncMutex,
    logger: SyncLogger,
    options: PushServiceOptions
  );
}

// domain/pull/service.ts
export class PullSyncService {
  constructor(
    gateway: SqlGateway,
    httpClient: PullHttpClient,
    applier: ChangeApplier,
    cursorStorage: CursorStorage,
    mutex: SyncMutex,
    logger: SyncLogger,
    options: PullServiceOptions
  );
}

// domain/coordination/coordinator.ts
export class SyncCoordinator {
  constructor(
    pushService: PushSyncService,
    pullService: PullSyncService,
    options?: CoordinatorOptions
  );
}

// infra/sql-gateway.ts
export interface SqlGateway {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (gw: SqlGateway) => Promise<T>): Promise<T>;
}

// infra/logger/interface.ts
export interface SyncLogger {
  debug(context: string, message: string, meta?: Record<string, unknown>): void;
  info(context: string, message: string, meta?: Record<string, unknown>): void;
  warn(context: string, message: string, meta?: Record<string, unknown>): void;
  error(context: string, message: string, meta?: Record<string, unknown>): void;
}
```

---

## Testing Strategy

### Tests de Integración

```typescript
// Ejemplo de test con mocks
import { describe, it, expect, beforeEach } from 'bun:test';
import { ChangeApplier } from './domain/change/applier';
import { InMemorySqlGateway } from './test-utils/in-memory-gateway';
import { NoOpLogger } from './test-utils/no-op-logger';

describe('ChangeApplier', () => {
  let gateway: InMemorySqlGateway;
  let applier: ChangeApplier;

  beforeEach(() => {
    gateway = new InMemorySqlGateway();
    applier = new ChangeApplier(gateway, 'business-123', new NoOpLogger());
  });

  it('should apply insert change', async () => {
    const change: PullChange = {
      entityType: 'customers',
      operation: 'create',
      entityId: 'cust-1',
      payload: { name: 'John', dni: '12345678' },
      // ...
    };

    const result = await applier.apply(change);

    expect(result.success).toBe(true);
    expect(gateway.getTable('customers')).toHaveLength(1);
  });
});
```

### Test Utilities a Crear

- `InMemorySqlGateway` - Gateway en memoria para tests unitarios
- `NoOpLogger` - Logger que no hace nada
- `SpyLogger` - Logger que captura logs para assertions

---

## Files to Create/Modify/Delete

### Create (New Files)

```
infra/sql-gateway.ts
infra/logger/interface.ts
infra/logger/default.ts
infra/initialization/service.ts
config/defaults.ts
domain/change/types.ts
domain/change/strategies.ts
domain/change/conflict-checker.ts
domain/change/applier.ts
domain/queue/types.ts
domain/queue/repository.ts
domain/queue/coalescer.ts
domain/queue/queue.ts
domain/push/types.ts
domain/push/http-client.ts
domain/push/lifecycle.ts
domain/push/batch-processor.ts
domain/push/service.ts
domain/pull/types.ts
domain/pull/cursor-storage.ts
domain/pull/service.ts
domain/pull/staged-coordinator.ts
domain/coordination/mutex.ts
domain/coordination/auto-runner.ts
domain/coordination/coordinator.ts
index.ts
```

### Modify (Content Update)

```
(No files modified in-place - all moved to new structure)
```

### Delete (After Migration)

```
change-applier.ts
pull-service.ts
sync-service.ts
pg-sync-queue.ts
coordinator.ts
staged-pull-coordinator.ts
sync-batch-processor.ts
sync-operation-lifecycle-service.ts
sync-entity-status-updater.ts
sync-initialization-service.ts
sync-auto-runner.ts
sync-mutex.ts
schema-mapper.ts
sync-logger.ts
types.ts
sync-queue.ts (stub)
```

---

## Open Questions

1. **Transaction support en PGlite:** ¿Debe mantenerse el código de transacciones aunque PGlite tenga soporte limitado?
2. **Retry logic:** ¿Debe estar en cada strategy o en el gateway nivel?
3. **Schema-mapper:** ¿Mantener como está o también refactorizar con mejor separación?

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking changes en app | High | High | Documentar migración, crear adapters temporales si es necesario |
| Performance regression | Medium | Medium | Benchmark antes/después, mantener SQL optimizado |
| Tests fallan | Medium | Medium | Tests de integración robustos antes de eliminar código viejo |
| PGlite transactions no funcionan | Low | Low | Mantener fallback a non-transactional mode |

## Definition of Done

- [ ] Todos los archivos nuevos creados en estructura domain/
- [ ] Todos los archivos viejos eliminados
- [ ] Tests de integración pasan
- [ ] Nuevo index.ts exporta todas las APIs necesarias
- [ ] Documentación de breaking changes completa
- [ ] Logger funciona como plugin inyectable
- [ ] SqlGateway abstraction funciona correctamente
