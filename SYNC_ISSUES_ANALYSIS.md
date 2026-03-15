# Análisis de Problemas de Sincronización

## Problemas Críticos Encontrados

### 1. PROBLEMA CRÍTICO: `sale_items.business_id` es NULLABLE en backend pero requerido para sync

**Ubicación:** `packages/backend/src/db/schema/sales.ts:124-125`

```typescript
// PROBLEMA - business_id es nullable
businessId: uuid("business_id")
  .references(() => businesses.id),
```

**Impacto:**
- Electric SQL filtra por `business_id = '{businessId}'`
- Si `business_id` es NULL, el registro NUNCA se sincroniza al frontend
- Las ventas aparecen vacías porque sus items no llegan al cliente

**Solución:**
```typescript
businessId: uuid("business_id")
  .notNull()  // <-- AGREGAR
  .references(() => businesses.id),
```

**Migración necesaria:**
- Actualizar registros existentes que tengan business_id NULL
- Hacer el campo NOT NULL

---

### 2. PROBLEMA CRÍTICO: Tabla `tags` incompleta en backend

**Ubicación:** `packages/backend/src/db/schema/tags.ts`

**Problemas:**
1. Define `syncStatusEnum` localmente (línea 18) en lugar de usar el de `enums.ts`
2. No tiene columnas `sync_status` ni `sync_attempts` en el schema real
3. La tabla en backend solo tiene: `id`, `name`, `color`, `businessId`, `createdAt`, `updatedAt`
4. El frontend espera: `sync_status`, `sync_attempts` (ver `packages/shared/src/schema.ts:657-658`)

**Backend actual (INCOMPLETO):**
```typescript
export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 20 }).notNull().default("#f97316"),
    businessId: uuid("business_id").notNull().references(() => businesses.id),
    // FALTAN sync_status y sync_attempts
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
```

**Frontend espera:**
```typescript
export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 20 }).notNull().default("#f97316"),
    businessId: uuid("business_id").notNull(),
    syncStatus: text("sync_status").notNull().default(SyncStatus.PENDING),  // <-- FALTA
    syncAttempts: integer("sync_attempts").notNull().default(0),             // <-- FALTA
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
```

**Solución:**
1. Eliminar la definición local de `syncStatusEnum` (línea 18)
2. Importar desde `./enums`
3. Agregar columnas faltantes

---

### 3. PROBLEMA: Sync incorrecto en `sale-service.ts` - status "active" vs "confirmed"

**Ubicación:** `packages/app/app/lib/services/sale-service.ts:606-612`

```typescript
await this.queueSync(
  "update",
  id,
  {
    status: "active",  // <-- PROBLEMA: Frontend no tiene "active" en SaleStatus
  }
);
```

**Frontend SaleStatus:**
```typescript
export const SaleStatus = {
  DRAFT: "draft",
  CONFIRMED: "confirmed",
  ACTIVE: "active",      // <-- SÍ existe
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;
```

**Análisis:** El status "active" existe en el schema, pero para ventas `instant_sale` debería usarse "confirmed" según el flujo de trabajo:
- `instant_sale`: draft → **active**
- `pre_order`: draft → **confirmed** → delivered

El código `confirm()` es para `instant_sale`, por lo que "active" es correcto según el schema. No hay problema aquí.

---

### 4. PROBLEMA: `sale_items` en schema compartido también tiene `businessId` opcional

**Ubicación:** `packages/shared/src/schema.ts:204`

```typescript
export const saleItems = pgTable(
  "sale_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id"),  // <-- Opcional, debería ser .notNull()
```

Esto causa inconsistencia entre frontend y backend.

---

## Flujo del Problema de Ventas

1. Usuario crea venta → Se inserta en `sales` con `sync_status = 'pending'`
2. Se agregan items → Se insertan en `sale_items`
3. Si `sale_items.business_id` es NULL → Electric no los sincroniza
4. Usuario finaliza venta → Status cambia a "active"
5. Frontend lista ventas → Muestra venta con monto pero SIN items
6. Monto mostrado viene de `sales.total_amount` (sí se sincroniza)
7. Items vacíos porque `sale_items` con `business_id = NULL` no llegaron

## Pasos para Arreglar

### Paso 1: Arreglar `sale_items` en backend
**Archivo:** `packages/backend/src/db/schema/sales.ts`

```typescript
businessId: uuid("business_id")
  .notNull()  // <-- AGREGAR
  .references(() => businesses.id),
```

### Paso 2: Crear migración para datos existentes
```sql
-- Actualizar registros existentes
UPDATE sale_items
SET business_id = s.business_id
FROM sales s
WHERE sale_items.sale_id = s.id
  AND sale_items.business_id IS NULL;

-- Verificar que no quedan NULLs
SELECT COUNT(*) FROM sale_items WHERE business_id IS NULL;
```

### Paso 3: Arreglar tabla `tags` en backend
**Archivo:** `packages/backend/src/db/schema/tags.ts`

```typescript
import { syncStatusEnum } from "./enums";  // <-- IMPORTAR

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 20 }).notNull().default("#f97316"),
    businessId: uuid("business_id").notNull().references(() => businesses.id),
    syncStatus: syncStatusEnum("sync_status").notNull().default("synced"),  // <-- AGREGAR
    syncAttempts: integer("sync_attempts").notNull().default(0),             // <-- AGREGAR
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_tags_business_id").on(table.businessId),
    index("idx_tags_name").on(table.name),
    index("idx_tags_sync_status").on(table.syncStatus),  // <-- AGREGAR
  ]
);
```

### Paso 4: Sincronizar schema compartido
**Archivo:** `packages/shared/src/schema.ts`

Asegurar que `saleItems` tenga `businessId` como `.notNull()` si es necesario.

### Paso 5: Regenerar migraciones y aplicar
```bash
cd packages/backend
bun run db:generate
bun run db:migrate
```

### Paso 6: Resetear frontend
```javascript
// En consola del navegador
avileoDebug.forceResync()
```

## Verificación

Después de aplicar los fixes:

1. Crear nueva venta con items
2. Verificar que `sale_items.business_id` NO sea NULL
3. Finalizar venta
4. Verificar que items aparezcan en el listado
5. Verificar que el sync de tags funcione sin errores
