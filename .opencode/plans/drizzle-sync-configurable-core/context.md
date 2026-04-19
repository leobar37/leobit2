# drizzle-sync Configurable Core - Context

## Overview

Transformar `packages/drizzle-sync` de un paquete específico de Avileo (con entidades hardcodeadas como `abonos`, `distribuciones`, `visitas`) en una **librería genérica de sincronización offline-first** donde la configuración de entidades se define en tiempo de inicialización mediante una API declarativa.

La nueva API debe permitir:

```typescript
const sync = createSyncEngine({
  entities: {
    customers: defineEntity({
      tableName: 'customers',
      fields: ['id', 'name', 'email'],
      priority: 1,
      conflictResolver: 'last-write-wins',
      hooks: { afterSync: async (e) => {...} }
    })
  }
})
```

## Background

Actualmente `drizzle-sync` tiene múltiples puntos de acoplamiento con Avileo:

1. **Entidades hardcodeadas** en `src/shared/constants.ts` (`SYNCABLE_ENTITIES`)
2. **Campos de tablas hardcodeados** en `src/pglite/schema-mapper.ts` (`TABLE_COLUMNS`)
3. **Tipos específicos** importados de `@avileo/shared` (`SyncEntity` como union type)
4. **Nombres de campos en español** (`cantidad_asignada`, `motivo_no_compra`)
5. **Prioridades hardcodeadas** en `@avileo/shared`

Esto hace imposible reutilizar la librería para otros proyectos sin modificar el código fuente.

## Goal

Crear un sistema de sincronización genérico donde:

- **Configuración declarativa**: Las entidades se definen en un objeto de configuración
- **Genéricos TypeScript**: Mantener type safety sin hardcodear nombres de entidades
- **Retrocompatibilidad**: Proporcionar un preset de Avileo para migración gradual
- **Zero breaking changes** (opcional): El código existente debe seguir funcionando

## Key Decisions

1. **API de Configuración**: Usar `defineEntity()` + `createSyncEngine()` para declarar entidades
2. **Genéricos vs Strings**: Usar `SyncEngine<TEntity extends string>` para mantener type safety
3. **Registro de Handlers**: Mantener patrón de registro dinámico pero con tipos genéricos
4. **Schema Mapper Dinámico**: Eliminar `VALID_TABLES`/`TABLE_COLUMNS` hardcodeados, usar configuración
5. **Retrocompatibilidad**: Crear preset `avileo.ts` que exporte configuración actual

## Scope Boundaries

### In Scope
- Core del sistema de sync (interfaces, tipos genéricos)
- Sistema de configuración de entidades (`defineEntity`)
- Factory `createSyncEngine`
- Schema mapper dinámico
- Handler registry genérico
- Conflict resolver registry genérico
- Preset de Avileo para retrocompatibilidad

### Out of Scope (para esta fase)
- Cambios en el backend (`packages/backend`)
- Cambios en la app (`packages/app`)
- Migración completa de handlers complejos (SaleSyncHandler)
- Documentación de uso general
- Tests de integración con proyectos externos

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  packages/drizzle-sync/src/                              │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  config/                                          │  │
│  │  - types.ts          (EntityConfig, SyncConfig)    │  │
│  │  - entity-definition.ts (defineEntity helper)   │  │
│  │  - validator.ts      (validación de config)      │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  create-sync-engine.ts                            │  │
│  │  - createSyncEngine()                              │  │
│  │  - validateConfig()                                │  │
│  │  - initializeRegistries()                        │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  core/                                            │  │
│  │  - types.ts          (genéricos, sin SyncEntity)  │  │
│  │  - interfaces.ts     (ISyncHandler<TEntity>)      │  │
│  │  - priority.ts       (funciones con config)       │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  server/                                          │  │
│  │  - handler-registry.ts (Map<string, ...>)         │  │
│  │  - sync-engine.ts      (SyncEngine<TEntity>)      │  │
│  │  - types.ts            (genéricos)                │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  pglite/                                          │  │
│  │  - schema-mapper.ts    (dinámico, con config)     │  │
│  │  - pg-sync-queue.ts    (usa config)               │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  presets/                                         │  │
│  │  - avileo.ts         (config actual de Avileo)    │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Dependencies

- `@avileo/shared` (desacoplar gradualmente)
- `drizzle-orm` (mantener)
- `zod` (para validación de configuración)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking changes | Crear preset de Avileo, mantener exports existentes |
| Performance | Cargar config en inicialización, no en runtime |
| Type safety loss | Usar genéricos `<TEntity extends string>` |
| Complejidad incremental | Documentar claramente, proporcionar ejemplos |

## Related Files

- `packages/drizzle-sync/src/shared/constants.ts` (a modificar)
- `packages/drizzle-sync/src/pglite/schema-mapper.ts` (a modificar)
- `packages/drizzle-sync/src/server/types.ts` (a modificar)
- `packages/drizzle-sync/src/server/handler-registry.ts` (a modificar)
- `packages/shared/src/sync-config.ts` (referencia)
