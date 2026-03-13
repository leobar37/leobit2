# Plan de Acción: Completar Migración a PGlite

> **Fecha:** 12 de Marzo 2026  
> **Estado:** Arquitectura híbrida (TanStack DB + PGlite coexisten)  
> **Objetivo:** Completar migración a PGlite + Electric SQL

---

## Resumen Ejecutivo

**Backend:** 100% listo (31 migraciones, Electric SQL configurado)  
**Frontend:** 50% - Engine PGlite configurado pero no integrado  
**Datos:** Script de migración listo, pendiente ejecución

---

## Fase 1: Completar Schema PGlite (SQL Manual)

**Duración:** 1 día  
**Responsable:** Frontend Developer  
**Archivo:** `packages/app/app/engine/db.ts`

> **Nota de Arquitectura:** Mantenemos SQL manual para creación de tablas y Drizzle ORM para queries. Esto implica duplicación del schema (SQL en frontend vs Drizzle en backend), pero es una decisión consciente por simplicidad y desacoplamiento. El backend sigue siendo la fuente de verdad.

### Tablas Críticas Faltantes

Agregar las siguientes tablas a `createTables()` en `db.ts`:

#### 1.1 closings (Cierres Diarios)
```sql
CREATE TABLE IF NOT EXISTS closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  closing_date DATE NOT NULL,
  total_sales DECIMAL(12,2) NOT NULL DEFAULT '0',
  total_payments DECIMAL(12,2) NOT NULL DEFAULT '0',
  total_cash DECIMAL(12,2) NOT NULL DEFAULT '0',
  notes TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_closings_business ON closings(business_id);
CREATE INDEX IF NOT EXISTS idx_closings_date ON closings(closing_date);
CREATE INDEX IF NOT EXISTS idx_closings_sync ON closings(sync_status);
```

#### 1.2 tags + customer_tags
```sql
-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#f97316',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Customer Tags (junction)
CREATE TABLE IF NOT EXISTS customer_tags (
  customer_id UUID NOT NULL,
  tag_id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (customer_id, tag_id)
);
```

#### 1.3 sale_tokens
```sql
CREATE TABLE IF NOT EXISTS sale_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL,
  token VARCHAR(100) NOT NULL UNIQUE,
  expires_at TIMESTAMP,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sale_tokens_token ON sale_tokens(token);
CREATE INDEX IF NOT EXISTS idx_sale_tokens_sale ON sale_tokens(sale_id);
```

#### 1.4 sync_operations (Cola Interna)
```sql
CREATE TABLE IF NOT EXISTS sync_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity TEXT NOT NULL,
  operation TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  data JSONB,
  attempts INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sync_ops_status ON sync_operations(status);
CREATE INDEX IF NOT EXISTS idx_sync_ops_entity ON sync_operations(entity);
```

### Verificación

```bash
# Después de agregar tablas, verificar en navegador:
# 1. Abrir DevTools > Application > IndexedDB
# 2. Verificar que exista: /idb/avileo-pg
# 3. Verificar que todas las tablas aparezcan
```

---

## Fase 2: Implementar Electric Sync Shapes

**Duración:** 1-2 días  
**Responsable:** Frontend Developer  
**Archivo:** `packages/app/app/engine/electric.ts`

### 2.1 Reemplazar Placeholder

El archivo actual tiene un placeholder. Implementar sync real:

```typescript
import { PGlite } from "@electric-sql/pglite";
import { syncShapeToTable } from "@electric-sql/pglite-sync";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function startSync({
  pg,
  businessId,
  token,
}: {
  pg: PGlite;
  businessId: string;
  token: string;
}): Promise<() => void> {
  const subscriptions: Array<() => void> = [];

  // Sync customers
  const customersSync = await syncShapeToTable({
    pg,
    shape: {
      url: `${API_URL}/electric`,
      params: { table: "customers" },
      headers: {
        Authorization: `Bearer ${token}`,
        "x-business-id": businessId,
      },
    },
    table: "customers",
    primaryKey: ["id"],
    shapeKey: `customers-${businessId}`,
  });
  subscriptions.push(customersSync.unsubscribe);

  // Sync sales
  const salesSync = await syncShapeToTable({
    pg,
    shape: {
      url: `${API_URL}/electric`,
      params: { table: "sales" },
      headers: {
        Authorization: `Bearer ${token}`,
        "x-business-id": businessId,
      },
    },
    table: "sales",
    primaryKey: ["id"],
    shapeKey: `sales-${businessId}`,
  });
  subscriptions.push(salesSync.unsubscribe);

  // TODO: Agregar más tablas (products, suppliers, etc.)

  return () => {
    subscriptions.forEach(unsub => unsub());
  };
}
```

### 2.2 Variables de Entorno

Verificar en `.env`:

```bash
VITE_API_URL=http://localhost:3000
VITE_ELECTRIC_URL=http://localhost:3000/electric
```

### 2.3 Prueba de Sync

```typescript
// En algún componente temporal
import { count } from "drizzle-orm";
import { customers } from "~/engine/schema";

const { db } = useEngine();

useEffect(() => {
  async function test() {
    const result = await db.select({ count: count() }).from(customers);
    console.log('Customers en PGlite:', result[0].count);
  }
  test();
}, []);
```

---

## Fase 3: Crear Hooks PGlite (Drizzle ORM)

**Duración:** 2-3 días  
**Responsable:** Frontend Developer  
**Patrón:** Crear hooks paralelos a los existentes usando **Drizzle ORM únicamente**

> **Nota:** Todos los accesos a datos deben usar Drizzle ORM. No usar SQL directo (`pg.query`) para mantener type safety y consistencia con el backend.

### 3.1 Instalar Dependencias

```bash
cd packages/app
bun add @electric-sql/react
```

### 3.2 Hook de Ejemplo: useCustomersPGLite

**Importante:** Usar siempre Drizzle ORM para queries y mutations.

```typescript
// hooks/use-customers-pglite.ts
import { useLiveQuery } from "@electric-sql/react";
import { useEngine } from "~/engine/provider";
import { customers } from "~/engine/schema";
import { eq, and, desc } from "drizzle-orm";

export function useCustomersPGLite(businessId: string) {
  const { db } = useEngine();
  
  return useLiveQuery(
    db.select().from(customers).where(eq(customers.businessId, businessId)),
    [businessId]
  );
}

export function useCustomerPGLite(id: string) {
  const { db } = useEngine();
  
  return useLiveQuery(
    db.select().from(customers).where(eq(customers.id, id)),
    [id]
  );
}
```

### 3.3 Hook de Mutación: useCreateCustomerPGLite

```typescript
// hooks/use-create-customer-pglite.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEngine } from "~/engine/provider";
import { customers } from "~/engine/schema";
import { eq } from "drizzle-orm";
import { api } from "~/lib/api-client";
import { isOnline } from "~/lib/sync/utils";
import { generateId } from "~/lib/utils";

export function useCreateCustomerPGLite() {
  const { db, pg } = useEngine();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateCustomerInput) => {
      const id = generateId();
      const now = new Date().toISOString();
      
      // Insertar en PGlite local
      await db.insert(customers).values({
        id,
        ...input,
        syncStatus: "pending",
        syncAttempts: 0,
        createdAt: now,
        updatedAt: now,
      });
      
      // Si está online, enviar al servidor
      if (isOnline()) {
        try {
          await api.customers.post(input);
          // Marcar como sincronizado
          await db.update(customers)
            .set({ syncStatus: "synced" })
            .where(eq(customers.id, id));
        } catch (error) {
          // Queda en pending para retry
          console.error("Sync error:", error);
        }
      }
      
      return { id, ...input };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}
```

### 3.4 Lista de Hooks a Crear

| Hook Actual | Nuevo Hook PGlite | Prioridad |
|-------------|-------------------|-----------|
| `use-customers.ts` | `use-customers-pglite.ts` | Alta |
| `use-sales.ts` | `use-sales-pglite.ts` | Alta |
| `use-distribuciones.ts` | `use-distribuciones-pglite.ts` | Alta |
| `use-payments.ts` | `use-payments-pglite.ts` | Media |
| `use-products.ts` | `use-products-pglite.ts` | Media |
| `use-suppliers.ts` | `use-suppliers-pglite.ts` | Baja |

### 3.5 Helpers de Drizzle (Importar siempre)

```typescript
// Queries
import { eq, and, or, inArray, isNull, isNotNull } from "drizzle-orm";

// Ordering
import { desc, asc } from "drizzle-orm";

// Aggregations
import { count, sum, avg, max, min } from "drizzle-orm";

// Ejemplos de uso:
// WHERE con AND
.where(and(eq(customers.businessId, id), eq(customers.syncStatus, "pending")))

// ORDER BY desc
.orderBy(desc(sales.createdAt))

// COUNT
.select({ count: count() }).from(customers)

// SUM
.select({ total: sum(sales.totalAmount) }).from(sales)
```

---

## Fase 4: Migrar Datos Existentes

**Duración:** 1 día  
**Responsable:** DevOps / Frontend Lead  
**Pre-requisito:** Backup de datos TanStack DB

### 4.1 Verificar Backup Existe

```bash
ls -la packages/app/backups/
# Debería existir: pre-migration-*.json
```

### 4.2 Ejecutar Migración

```bash
cd packages/app

# Opción A: Usar backup existente
bun scripts/migrate-to-pglite.ts ./backups/pre-migration-2026-03-12.json

# Opción B: Backup primero, luego migrar
bun scripts/backup-tanstack-db.ts
bun scripts/migrate-to-pglite.ts
```

### 4.3 Verificar Migración

El script genera un reporte en `reports/migration-report.json`:

```json
{
  "summary": {
    "totalTables": 12,
    "totalRecords": 1500,
    "migratedRecords": 1500,
    "errors": 0,
    "passed": true
  }
}
```

### 4.4 Verificación Manual

```bash
# Abrir DevTools > Application > IndexedDB > /idb/avileo-pg
# Verificar que los datos aparezcan en las tablas
```

---

## Fase 5: Integración Gradual en Rutas

**Duración:** 3-5 días  
**Responsable:** Frontend Developer  
**Estrategia:** Una ruta a la vez

### 5.1 Proceso por Ruta

1. **Crear versión paralela** de la ruta (ej: `clientes-pglite.tsx`)
2. **Probar** en desarrollo con datos reales
3. **Comparar** comportamiento con versión actual
4. **Reemplazar** la ruta original
5. **Deploy** y monitorear

### 5.2 Orden de Migración

| Ruta | Complejidad | Justificación |
|------|-------------|---------------|
| `/clientes` | Baja | Datos simples, solo CRUD |
| `/ventas/nueva` | Media | POS, requiere products + customers |
| `/distribucion` | Media | Sync bidireccional importante |
| `/ventas` | Alta | Listado, filtros, pagos |
| `/proveedores` | Baja | Pocos datos, offline no crítico |

### 5.3 Feature Flag (Opcional)

```typescript
// lib/feature-flags.ts
export const USE_PGLITE = import.meta.env.VITE_USE_PGLITE === 'true';

// En ruta
import { useCustomers } from '~/hooks/use-customers';
import { useCustomersPGLite } from '~/hooks/use-customers-pglite';

export default function ClientesPage() {
  const { data: customers } = USE_PGLITE 
    ? useCustomersPGLite(businessId)
    : useCustomers();
  // ...
}
```

---

## Fase 6: Cleanup y Limpieza

**Duración:** 1 día  
**Responsable:** Frontend Developer  
**Nota:** Solo después de confirmar que todo funciona

### 6.1 Eliminar Dependencias

```bash
cd packages/app
bun remove @tanstack/react-db @tanstack/electric-db-collection
```

### 6.2 Eliminar Código Obsoleto

```bash
# Eliminar carpetas:
rm -rf app/lib/db/collections/
rm -rf app/lib/db/electric-client.tsx
rm -rf app/lib/db/backup-tanstack-db.ts

# Eliminar hooks antiguos:
rm app/hooks/use-customers.ts
rm app/hooks/use-sales.ts
# etc.
```

### 6.3 Renombrar Hooks Nuevos

```bash
# Quitar sufijo -pglite
mv use-customers-pglite.ts use-customers.ts
mv use-sales-pglite.ts use-sales.ts
```

---

## Variables de Entorno Requeridas

### Backend (`.env`)

```bash
# Ya configurado
ELECTRIC_URL=https://api.electric-sql.cloud/v1/shape
VITE_ELECTRIC_SOURCE_ID=tu-source-id
VITE_ELECTRIC_TOKEN=tu-token
```

### Frontend (`.env`)

```bash
VITE_API_URL=http://localhost:3000
VITE_ELECTRIC_URL=http://localhost:3000/electric
# Opcional para testing:
# VITE_USE_PGLITE=true
```

---

## Checklist de Verificación

### Por Fase

- [ ] **Fase 1:** Todas las tablas creadas en PGlite
- [ ] **Fase 2:** Electric sync funcionando (datos llegan del servidor)
- [ ] **Fase 3:** Hooks creados y testeados
- [ ] **Fase 4:** Datos migrados sin errores
- [ ] **Fase 5:** Al menos 3 rutas migradas y funcionando
- [ ] **Fase 6:** Código limpio, sin dependencias de TanStack

### Testing Checklist

- [ ] App funciona offline (modo avión)
- [ ] Datos se sincronizan al volver online
- [ ] No hay pérdida de datos entre sesiones
- [ ] Performance similar o mejor que TanStack
- [ ] No hay errores en consola

---

## Troubleshooting Común

### Error: "Database not initialized"

**Causa:** Llamando a `useEngine()` antes de que PGlite esté listo  
**Solución:** Usar `useEngineReady()` o esperar `isInitialized`

### Error: "Sync failed: must-refetch"

**Causa:** Electric SQL detectó cambios en el schema  
**Solución:** Limpiar IndexedDB y recargar

### Error: "Table not found"

**Causa:** Tabla no creada en `createTables()`  
**Solución:** Agregar tabla a `db.ts` y limpiar IndexedDB

### Datos no aparecen

**Verificar:**
1. Backend tiene datos
2. Electric proxy está funcionando (`/electric`)
3. Headers de auth correctos
4. Tablas tienen `replica identity full` (en PostgreSQL)

---

## Recursos

- [Documentación PGlite](https://pglite.dev/docs/)
- [Electric SQL Sync](https://electric-sql.com/docs/usage/data-access/shapes)
- [Skill de Migración](../../.claude/skills/pglite-sync-migration.md)
- [Guía Original](./05-migracion.md)

---

## Decisiones Arquitectónicas

### Duplicación del Schema (Aceptada)

**Situación:** El schema se define en dos lugares:
- **Backend:** Drizzle ORM (`packages/backend/src/db/schema/`)
- **Frontend:** SQL manual (`packages/app/app/engine/db.ts`)

**Justificación:**
- ✅ **Simplicidad:** No requiere build steps complejos ni generación automática
- ✅ **Desacoplamiento:** Frontend no depende del backend para compilarse
- ✅ **Control:** SQL manual permite optimizaciones específicas para PGlite
- ✅ **Offline-first:** Todo el schema está embebido, no requiere conexión

**Gestión de cambios:**
Cuando se agrega una tabla/columna en el backend:
1. Actualizar schema en `packages/backend/src/db/schema/`
2. Generar migración: `bun run db:generate`
3. Aplicar en PostgreSQL: `bun run db:migrate`
4. **Manualmente:** Actualizar SQL en `packages/app/app/engine/db.ts`
5. **Verificar:** Tipos coincidan entre backend y frontend

**Alternativas consideradas y descartadas:**
- ❌ Migraciones JSON exportadas: Añade complejidad al build
- ❌ Introspección automática: Requiere backend disponible en build time
- ❌ Generador de SQL desde schema: Demasiado tooling para el beneficio

---

## Notas Finales

1. **No eliminar TanStack hasta confirmar PGlite funciona 100%**
2. **Hacer backups antes de cada fase**
3. **Probar en dispositivo móvil real**
4. **Monitorear errores en producción**
5. **Documentar problemas encontrados**

**Tiempo estimado total:** 8-12 días de trabajo  
**Riesgo:** Medio (fallback a TanStack disponible)  
**Beneficio:** Queries SQL, mejor performance, arquitectura más limpia

---

*Documento creado: 12 de Marzo 2026*  
*Última actualización: 12 de Marzo 2026*
