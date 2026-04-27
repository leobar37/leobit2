# Plan Corregido: Uso de SQL en drizzle-sync y App

> **Objetivo:** Reducir acoplamiento y SQL directo mal ubicado sin eliminar SQL necesario. El SQL parametrizado es válido cuando se ejecuta a través del engine/adapter del framework y cuando Drizzle no expresa bien el caso.

**Fecha:** 2026-04-27  
**Scope:** `packages/drizzle-sync/` + `packages/app/`

---

## Corrección de Premisa

El plan anterior asumía que la meta era eliminar todo SQL crudo y reemplazarlo por Drizzle ORM. Esa premisa es incorrecta.

La regla correcta es:

- En `packages/drizzle-sync/`, SQL parametrizado es aceptable si pasa por `DatabaseAdapter` o `SqlExecutor`.
- En `packages/app/`, evitar acceso directo a `PGlite` mediante `engine.getPg()` o `this.pg.query()`.
- En servicios de app, usar Drizzle para condiciones simples cuando ya existe un operador claro.
- Mantener `sql` de Drizzle para casos complejos: `COALESCE`, `CAST`, `DATE()`, `EXISTS`, agregaciones, `HAVING`, subqueries o SQL dinámico difícil de expresar con operadores nativos.
- No crear helpers públicos como `dateGte`, `notIn`, `anyArray` o `castNumeric` en `@avileo/drizzle-sync` salvo que haya repetición real y valor comprobado.

---

## Estado Actual Relevante

### Framework `packages/drizzle-sync`

El framework ya tiene una abstracción correcta para SQL:

```ts
export interface DatabaseAdapter {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(sql: string, params?: unknown[]): Promise<void>;
  getDb(): unknown;
}
```

Y `SqlExecutor` delega en el adapter:

```ts
export function createSqlExecutor(context: SyncClientEngineContext): SqlExecutor {
  return {
    query: <T>(sql: string, params?: unknown[]) => context.adapter.query<T>(sql, params),
    exec: (sql: string, params?: unknown[]) => context.adapter.exec(sql, params),
  };
}
```

Esto significa que SQL dentro del engine no es un problema por sí mismo. El problema sería SQL fuera de las abstracciones o SQL no parametrizado con inputs dinámicos.

### App `packages/app`

El punto más importante está en `BaseService`:

- `updateSyncStatus()` usa `this.pg.query()`.
- `incrementSyncVersion()` usa `this.pg.query()`.
- `this.pg` depende de `engine.getPg()`, que es legacy y no funciona en adapter mode.

Ese sí es un acoplamiento que conviene corregir.

---

## Principios de Decisión

### SQL Permitido

SQL está permitido cuando:

- Pasa por `DatabaseAdapter.query()` o `DatabaseAdapter.exec()`.
- Pasa por `SqlExecutor` creado por el engine.
- Usa parámetros (`$1`, `$2`, etc.) para valores externos.
- Usa nombres dinámicos solo después de validación por allowlist.
- Resuelve un caso donde Drizzle genera más complejidad que claridad.

### SQL a Evitar

SQL se debe evitar cuando:

- Se llama directamente a `pg.query()` desde servicios de app.
- Duplica una operación simple que Drizzle ya expresa claramente.
- Introduce helpers públicos genéricos sin una necesidad fuerte.
- Bypassea la cola de sync para escrituras de entidades sincronizables.

### Drizzle Preferido

Usar Drizzle nativo para casos simples:

```ts
gte(this.tables.sales.saleDate, query.startDate)
lte(this.tables.sales.saleDate, query.endDate)
ne(this.tables.purchases.status, "draft")
isNotNull(this.tables.sales.customerId)
inArray(this.tables.sales.customerId, customerIds)
not(inArray(this.tables.sales.status, ["draft", "cancelled"]))
```

Mantener `sql` para casos complejos:

```ts
sql`CAST(${this.tables.sales.balanceDue} AS NUMERIC) > 0`
sql`DATE(${this.tables.sales.saleDate})`
sql`count(distinct ${this.tables.customerTags.tagId}) = ${tagIds.length}`
sql`COALESCE(${this.tables.customers.phone}, '')`
```

---

## Cambios que NO se Deben Hacer

### No Crear Helpers Públicos de SQL

No agregar esto:

```ts
import { dateGte } from "@avileo/drizzle-sync";
dateGte(this.tables.sales.saleDate, query.startDate);
```

Usar directamente:

```ts
import { gte } from "drizzle-orm";
gte(this.tables.sales.saleDate, query.startDate);
```

Tampoco crear helpers públicos como:

- `dateGte`
- `dateLte`
- `notIn`
- `anyArray`
- `coalesceLike`
- `castNumeric`

Estos helpers agregan API surface al framework sin aportar suficiente valor. Además, ocultan SQL en vez de hacerlo más claro.

### No Agregar `getSyncSchema()` al Adapter

No modificar `DatabaseAdapter` así:

```ts
export interface DatabaseAdapter {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(sql: string, params?: unknown[]): Promise<void>;
  getDb(): unknown;
  getSyncSchema(): SyncSchema;
}
```

Esto acopla el adapter a tablas internas específicas y rompe la abstracción actual. El adapter debe ejecutar SQL y exponer el Drizzle instance genérico; no debe conocer schemas concretos del framework.

### No Migrar Masivamente el Framework a Drizzle

No migrar por defecto estos archivos solo por tener SQL:

- `packages/drizzle-sync/src/pglite/queue-repository.ts`
- `packages/drizzle-sync/src/pglite/operation-lifecycle.ts`
- `packages/drizzle-sync/src/pglite/batch-processor.ts`
- `packages/drizzle-sync/src/pglite/entity-status-updater.ts`
- `packages/drizzle-sync/src/pglite/change-strategies.ts`

Razones:

- Usan `tenantColumn` dinámico.
- Operan con tablas dinámicas validadas por allowlist.
- Ejecutan infraestructura genérica del sync engine.
- Ya pasan por `DatabaseAdapter` o `SqlExecutor`.
- Drizzle podría aumentar complejidad sin mejorar seguridad ni mantenibilidad.

---

## Plan de Implementación

## Fase 1: Ajustar Contrato de App hacia Engine Adapter

### 1.1 Exponer adapter en el tipo usado por servicios

Archivo:

```txt
packages/app/app/lib/services/base-service.ts
```

Actualizar `SyncClientEngineLike` para incluir:

```ts
getAdapter(): DatabaseAdapter;
```

Importar el tipo desde `@avileo/drizzle-sync` o el subpath correcto ya usado por la app.

### 1.2 Agregar getter protegido en `BaseService`

```ts
protected get adapter(): DatabaseAdapter {
  return this.engine.getAdapter();
}
```

### 1.3 Reemplazar SQL directo a PGlite

Cambiar `updateSyncStatus()` de:

```ts
await this.pg.query(
  `UPDATE ${validatedTableName} SET sync_status = $1, updated_at = $2 WHERE id = $3`,
  [status, now, id]
);
```

A:

```ts
await this.adapter.exec(
  `UPDATE ${validatedTableName} SET sync_status = $1, updated_at = $2 WHERE id = $3`,
  [status, now, id]
);
```

Cambiar `incrementSyncVersion()` de `this.pg.query()` a `this.adapter.query()` / `this.adapter.exec()`.

Mantener `validateTableName()` porque el table name sigue siendo dinámico.

## Fase 2: Limpiar Condiciones Simples en Servicios de App

### 2.1 `PurchaseService`

Archivo:

```txt
packages/app/app/lib/services/purchase-service.ts
```

Reemplazar:

```ts
sql`${this.tables.purchases.status} != 'draft'`
```

Por:

```ts
ne(this.tables.purchases.status, "draft")
```

### 2.2 `SaleService`

Archivo:

```txt
packages/app/app/lib/services/sale-service.ts
```

Reemplazar condiciones simples:

```ts
sql`${this.tables.sales.saleDate} >= ${query.startDate}`
sql`${this.tables.sales.saleDate} <= ${query.endDate}`
```

Por:

```ts
gte(this.tables.sales.saleDate, query.startDate)
lte(this.tables.sales.saleDate, query.endDate)
```

Mantener estos casos con `sql`:

```ts
sql`CAST(${this.tables.sales.balanceDue} AS NUMERIC) > 0`
sql`DATE(${this.tables.sales.saleDate})`
sql`EXISTS (...)`
```

### 2.3 `PaymentService`

Archivo:

```txt
packages/app/app/lib/services/payment-service.ts
```

Evaluar reemplazos simples si tipan bien:

```ts
not(inArray(this.tables.sales.status, ["draft", "cancelled"]))
isNotNull(this.tables.sales.customerId)
inArray(this.tables.sales.customerId, customerIds)
inArray(this.tables.abonos.customerId, customerIds)
```

Mantener `COALESCE` con `sql` si evita complicar el query:

```ts
like(sql`COALESCE(${this.tables.customers.phone}, '')`, searchPattern)
```

### 2.4 `CustomerService`

Mantener:

```ts
.having(sql`count(distinct ${this.tables.customerTags.tagId}) = ${tagIds.length}`)
```

Es un caso de agregación que no justifica crear un helper del framework.

## Fase 3: Documentar Regla en el Código del Framework

Agregar comentarios breves donde sea útil, no en todos lados.

Archivos candidatos:

```txt
packages/drizzle-sync/src/core/database-adapter.ts
packages/drizzle-sync/src/pglite/sql-executor.ts
packages/drizzle-sync/src/pglite/change-strategies.ts
```

Mensaje recomendado:

```ts
// SQL is intentionally routed through the adapter so the engine remains backend-agnostic.
```

No sobre-documentar cada query.

## Fase 4: Validación

Ejecutar checks mínimos:

```bash
bun run build
```

Si se toca app:

```bash
cd packages/app && bun run typecheck
```

Si se toca framework:

```bash
cd packages/drizzle-sync && bun test
```

---

## Fuera de Scope

Estos cambios no deben mezclarse con este plan:

- Eliminar `ConflictResolver` duplicado en backend.
- Mover test factories de handlers.
- Refactors grandes de handlers backend.
- Crear schemas Drizzle para `sync_operations` y `sync_dead_letter`.
- Rediseñar la cola de sync.

Pueden ser tareas separadas si hay una razón concreta.

---

## Resultado Esperado

Después de este plan:

- La app deja de depender directamente de `PGlite` para helpers base.
- El framework conserva SQL parametrizado a través del adapter.
- No se infla la API pública de `@avileo/drizzle-sync` con helpers innecesarios.
- Las consultas simples usan operadores nativos de Drizzle.
- Las consultas complejas siguen usando `sql` de forma explícita y localizada.

---

## Resumen de Decisión

La meta no es “cero SQL”.

La meta es:

```txt
SQL necesario sí, pero a través del engine/adapter, parametrizado, validado y ubicado en la capa correcta.
```
