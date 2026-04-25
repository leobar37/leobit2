# Generar Esquema Drizzle para Frontend - Contexto

## Overview

Actualmente `packages/shared/src/schema.ts` (803 líneas) es un **esquema Drizzle mantenido manualmente** que duplica el esquema del backend (`packages/backend/src/db/schema/`). Este esquema manual usa `text()` en lugar de `pgEnum()` para compatibilidad con PGlite (PostgreSQL en WASM del frontend).

El objetivo es **eliminar este archivo manual** y generarlo automáticamente desde `drizzle-sync`, igual como ya generamos SQL DDL (`init.sql`), Zod schemas, servicios y hooks.

## Background

- El backend tiene el esquema fuente de verdad con `pgEnum()`, FKs (`references()`), e índices completos
- `drizzle-sync` ya genera: SQL DDL, Zod schemas, BaseService subclasses, React Query hooks, types, table registry, query keys, engine factory
- **Falta:** Generador de esquema Drizzle ORM real (`pgTable`, `text()`, `uuid()`, etc.)
- El frontend importa tipos desde `@avileo/shared` (`Customer`, `Product`, `SyncStatus`, etc.)

## Goal

Tener un generador en `drizzle-sync` que produzca el esquema Drizzle PGlite-compatible automáticamente, eliminando la necesidad de mantener `packages/shared/src/schema.ts` manualmente.

## Key Decisions

1. **El esquema generado va al frontend** (`packages/app/app/lib/sync/generated/drizzle-schema.ts` o similar), no a `@avileo/shared`
2. **No generar relaciones Drizzle** (`relations()`) - el frontend no las usa actualmente (no hay `.with()` ni `relations()` en el código del frontend)
3. **Enums se extraen automáticamente** desde `sync.schema.json` y se generan como `const` objects con `as const`
4. **Tipos inferidos se generan automáticamente** (`$inferSelect`, `$inferInsert`)
5. **Tablas no-sync no se incluyen** - solo las 16 entidades definidas en `sync.config.ts`

## Scope Boundaries

- In scope:
  - Crear generador `drizzle-schema-generator.ts` en `drizzle-sync`
  - Integrar en pipeline de generación existente
  - Generar enums como const objects
  - Generar tipos inferidos
  - Actualizar exports del frontend
  - Eliminar/marcar como deprecated `packages/shared/src/schema.ts`
  
- Out of scope:
  - Modificar el esquema del backend (fuente de verdad)
  - Generar relaciones Drizzle (`relations()`)
  - Generar tablas no-sync (auth, sync infrastructure, etc.)
  - Cambiar la lógica de negocio del frontend
