# drizzle-sync Configurable Core - Requirements

## Objective

Transformar `packages/drizzle-sync` en una librería genérica de sincronización offline-first donde la configuración de entidades se define en tiempo de inicialización mediante una API declarativa, eliminando todo hardcodeo específico de Avileo.

## Scope

### In Scope
- Diseño e implementación del sistema de configuración (`EntityConfig`, `SyncEngineConfig`)
- Refactorización de tipos genéricos (`SyncEngine<TEntity>`)
- Schema mapper dinámico basado en configuración
- Handler registry genérico
- Conflict resolver registry genérico
- Factory `createSyncEngine()`
- Helper `defineEntity()`
- Preset de Avileo para retrocompatibilidad
- Validación de configuración en tiempo de build

### Out of Scope
- Cambios en `packages/backend` (usa el sistema actual)
- Cambios en `packages/app` (usa re-exports actuales)
- Refactorización de handlers complejos (SaleSyncHandler, etc.)
- Documentación de uso para proyectos externos
- Tests de integración con otros proyectos

## Functional Requirements

### Configuración

- `FR-001` - La librería debe exponer una función `createSyncEngine(config)` que acepte configuración de entidades
- `FR-002` - La configuración debe incluir: nombre de tabla, campos, prioridad, relaciones padre/hijo, resolvers de conflicto, hooks
- `FR-003` - Debe existir un helper `defineEntity(config)` que retorne un objeto tipado `EntityConfig`
- `FR-004` - El sistema debe validar la configuración en tiempo de inicialización (campos requeridos, consistencia de prioridades)
- `FR-005` - Las entidades deben soportar configuración de `syncStatus` (campo opcional para trackear estado)
- `FR-006` - Las entidades deben soportar `selfHeal` (boolean, default false)
- `FR-007` - Las entidades deben declarar `parentFields` para validación de integridad referencial
- `FR-008` - Las entidades pueden declarar `childEntities` para establecer dependencias de procesamiento

### Tipos Genéricos

- `FR-009` - `SyncEngine` debe ser genérico: `SyncEngine<TEntity extends string>`
- `FR-010` - `ISyncHandler` debe ser genérico: `ISyncHandler<TEntity, TContext, TTransaction>`
- `FR-011` - `HandlerRegistry` debe usar `Map<string, HandlerFactory>` en lugar de `Map<SyncEntity, ...>`
- `FR-012` - Todas las funciones de prioridad deben aceptar `EntityConfig[]` como parámetro

### Schema Mapper

- `FR-013` - Eliminar `VALID_TABLES` hardcodeado, usar configuración dinámica
- `FR-014` - Eliminar `TABLE_COLUMNS` hardcodeado, usar `fields` de configuración
- `FR-015` - Crear `createSchemaValidator(config)` que retorne funciones de validación
- `FR-016` - Mantener función `isValidTableName()` pero implementada dinámicamente
- `FR-017` - Mantener función `filterValidColumns()` pero basada en config

### Retrocompatibilidad

- `FR-018` - Crear preset `avileo.ts` que exporte la configuración actual de Avileo
- `FR-019` - Los exports actuales deben seguir funcionando (usando preset por defecto)
- `FR-020` - Documentar claramente qué es legacy y qué es la nueva API

## Non-Functional Requirements

- `NFR-001` - Type safety: No usar `any`, mantener inferencia de tipos
- `NFR-002` - Performance: Validación de config en build time, no runtime
- `NFR-003` - Bundle size: No aumentar significativamente el tamaño del paquete
- `NFR-004` - Tests: Cobertura mínima 80% para nuevo código
- `NFR-005` - Documentación: Cada función pública debe tener JSDoc

## Acceptance Criteria

- [ ] Se puede crear un sync engine con configuración personalizada
- [ ] `defineEntity` retorna tipos correctamente inferidos
- [ ] El schema mapper funciona con configuración dinámica
- [ ] El preset de Avileo exporta configuración equivalente a la actual
- [ ] Tests existentes siguen pasando (o se migran al nuevo sistema)
- [ ] Nuevo código tiene cobertura de tests > 80%
- [ ] No hay referencias hardcodeadas a entidades de Avileo en el core

## Constraints

- Mantener compatibilidad con Drizzle ORM
- No romper la API pública existente (solo deprecar gradualmente)
- Usar TypeScript 5.x features (genéricos, const type parameters)
- No agregar dependencias pesadas (zod está permitido para validación)

## Open Questions

1. ¿Deberíamos usar Zod para validación runtime de la configuración o solo types en build time?
2. ¿El preset de Avileo debe vivir en `drizzle-sync` o en `@avileo/shared`?
3. ¿Cómo manejamos la migración gradual de `SyncEntity` (union type) a `string` genérico?
