# Generar Esquema Drizzle para Frontend - Requisitos

## Objective

Implementar un generador en `drizzle-sync` que produzca automáticamente un esquema Drizzle ORM compatible con PGlite (frontend) a partir del esquema del backend (PostgreSQL), eliminando la necesidad de mantener `packages/shared/src/schema.ts` manualmente.

## Scope

- In scope:
  - Generador de esquema Drizzle para entidades sync (16 entidades)
  - Generación automática de enums como `const` objects
  - Generación automática de tipos inferidos (`$inferSelect`, `$inferInsert`)
  - Integración en pipeline de generación existente (`generateAll`)
  - Migración de imports del frontend al nuevo esquema generado
  - Eliminación del schema.ts manual
  
- Out of scope:
  - Modificar esquema del backend
  - Generar relaciones Drizzle (`relations()`)
  - Tablas no-sync (auth, sync infrastructure)
  - Cambios en lógica de negocio

## Functional Requirements

- `FR-001` - El generador debe leer `sync.schema.json` y producir código TypeScript válido con definiciones `pgTable`
- `FR-002` - Debe transformar automáticamente `pgEnum` → `text()` + `const` objects (ej: `sync_status` text con `SyncStatus = { PENDING: "pending", ... }`)
- `FR-003` - Debe omitir `.references()` en columnas FK (PGlite no enforcea FKs)
- `FR-004` - Debe preservar defaults como `defaultRandom()`, `defaultNow()`, valores literales
- `FR-005` - Debe generar índices mínimos necesarios (sync_status, business_id, FKs)
- `FR-006` - Debe generar tipos inferidos: `export type Customer = typeof customers.$inferSelect`
- `FR-007` - Debe integrarse en `generateAll()` y producir output en `packages/app/app/lib/sync/generated/`
- `FR-008` - Los enums deben ser exportables y usables en el frontend como `SyncStatus.PENDING`
- `FR-009` - El schema generado debe ser funcionalmente equivalente al schema.ts manual actual

## Non-Functional Requirements

- `NFR-001` - El generador debe usar `CodeBuilder` existente para consistencia
- `NFR-002` - El código generado debe pasar typecheck de TypeScript sin errores
- `NFR-003` - El tiempo de generación no debe aumentar significativamente (>500ms adicional)
- `NFR-004` - Debe ser mantenible: mapeo de tipos centralizado, fácil de extender

## Acceptance Criteria

- [ ] Ejecutar `bun run sync:generate` produce un archivo `drizzle-schema.ts` válido en `packages/app/app/lib/sync/generated/`
- [ ] El archivo generado contiene definiciones `pgTable` para las 16 entidades sync
- [ ] Los enums se generan como `const` objects con `as const` exportados
- [ ] Los tipos `$inferSelect` y `$inferInsert` se generan para cada entidad
- [ ] El frontend compila sin errores usando el esquema generado
- [ ] `packages/shared/src/schema.ts` puede eliminarse o marcarse como deprecated
- [ ] No hay diferencias funcionales entre el esquema manual y el generado

## Constraints

- Usar `drizzle-orm/pg-core` (no `/pglite`) para imports, igual que el schema.ts manual
- Preservar compatibilidad con PGlite (no usar features que PGlite no soporte)
- No romper el pipeline de generación existente

## Open Questions

- [ ] ¿Dónde exactamente debe ir el archivo generado? `packages/app/app/lib/sync/generated/drizzle-schema.ts` o `packages/shared/src/generated/schema.ts`?
- [ ] ¿Cómo manejar enums que no están en tablas sync pero se usan en el frontend (ej: `UserRole`, `BusinessUserRole`)?
