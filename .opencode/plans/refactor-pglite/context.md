# Context: Refactor PGlite Architecture with Engine Integration

## Objective

Refactorizar completamente el módulo `packages/drizzle-sync/src/pglite/` para:
1. Eliminar la dependencia directa de PGlite pasado como parámetro a cada servicio
2. Usar `SyncClientEngineContext` como fuente única de dependencias
3. Separar SQL de lógica de negocio mediante un SqlExecutor
4. Hacer el logging extensible mediante interfaces
5. Actualizar `SyncClientEngine` para usar las nuevas APIs

## Current Architecture

### Problema Principal
```typescript
// ❌ Cada servicio recibe PGlite y businessId directamente
new SyncService(pg, businessId, options);
new PullService(pg, db, options);
applyChange(pg, change, businessId, options);
```

- 19 archivos en `pglite/` con responsabilidades mezcladas
- SQL raw mezclado con lógica de negocio
- Logging hardcodeado usando `syncLogger` global
- No hay abstracción para testing (no se pueden usar mocks)

## Target Architecture

### Patrón Nuevo
```typescript
// ✅ Servicios reciben contexto del Engine
const context: SyncClientEngineContext = {
  pg, db, businessId, businessUserId, syncService
};

new ChangeApplier(context, options);
new PushSyncService(context, options);
new PullSyncService(context, options);
```

### Estructura Final
```
pglite/
├── index.ts                    # Public API exports
├── domain/
│   ├── change/                # Aplicación de cambios
│   │   ├── applier.ts
│   │   ├── strategies.ts
│   │   └── types.ts
│   ├── queue/
│   │   ├── queue.ts
│   │   ├── repository.ts
│   │   └── types.ts
│   ├── push/
│   │   ├── service.ts         # SyncService refactorizado
│   │   ├── batch-processor.ts
│   │   └── types.ts
│   └── pull/
│       ├── service.ts         # PullService refactorizado
│       ├── staged-coordinator.ts
│       └── types.ts
├── infra/
│   └── sql-executor.ts        # Wrapper SQL raw
├── config/
│   └── defaults.ts
└── types.ts                   # Tipos compartidos del módulo
```

## Interfaces Existentes a Reutilizar

| Interfaz | Ubicación | Uso en refactor |
|----------|-----------|-----------------|
| `ISyncHttpClient` | `core/interfaces.ts` | HTTP client para push/pull |
| `ISyncLogger` | `core/interfaces.ts` | Logger inyectable |
| `ISyncQueue` | `core/index.ts` | Queue de operaciones |
| `ISyncMutex` | `pglite/sync-mutex.ts` | Mutex para coordinación |
| `SyncClientEngineContext` | `client/types.ts` | Contexto principal |
| `ICursorStorage` | `pglite/pull-service.ts` | Storage de cursor |

## Breaking Changes

| API Antigua | API Nueva |
|-------------|-----------|
| `applyChange(pg, change, id, opts)` | `ChangeApplier.apply(change)` via context |
| `applyChangesBatch(pg, changes, id, opts)` | `ChangeApplier.applyBatch(changes)` via context |
| `new SyncService(pg, id, opts)` | `new SyncService(context, opts)` |
| `new PullService(pg, db, opts)` | `new PullService(context, opts)` |
| `syncLogger.info(...)` | `logger.info(...)` inyectado |

## Files to Delete After Migration

- `change-applier.ts` (lógica movida a domain/change/)
- `pull-service.ts` (lógica movida a domain/pull/)
- `sync-service.ts` (lógica movida a domain/push/)
- `pg-sync-queue.ts` (lógica movida a domain/queue/)
- `coordinator.ts` (actualizado a usar nuevas APIs)
- `staged-pull-coordinator.ts` (movido a domain/pull/)
- `sync-batch-processor.ts` (movido a domain/push/)
- `sync-operation-lifecycle-service.ts` (integrado en domain/push/)
- `sync-entity-status-updater.ts` (integrado en domain/push/)
- `sync-initialization-service.ts` (movido a infra/)
- `sync-auto-runner.ts` (movido a infra/ o eliminado)
- `sync-mutex.ts` (movido a infra/)
- `schema-mapper.ts` (movido a config/)
- `sync-logger.ts` (reemplazado por interfaz ISyncLogger)
- `types.ts` (consolidado en nuevos archivos)
- `sync-queue.ts` (stub, eliminar)

## Risks

1. **Breaking changes en app**: SyncClientEngine es usado por app
2. **Tests de integración**: Pueden fallar si no se actualizan
3. **Regresión de performance**: SQL raw debe mantener optimizaciones

## Definition of Done

- [ ] SqlExecutor abstraction funciona correctamente
- [ ] Todos los servicios usan SyncClientEngineContext
- [ ] SyncClientEngine actualizado a nuevas APIs
- [ ] Tests de integración pasan
- [ ] No hay archivos huérfanos en pglite/
- [ ] Public API exports funcionan (index.ts)
