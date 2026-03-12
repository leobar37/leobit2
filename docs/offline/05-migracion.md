# Guía de Migración

> Migración paso a paso desde TanStack DB a PGlite + Electric

## Pre-requisitos

- [ ] ElectricSQL configurado y funcionando
- [ ] Backend con PostgreSQL accesible
- [ ] Comprensión de arquitectura actual (TanStack DB)
- [ ] Plan de rollback si es necesario

---

## Fase 1: Preparación (1-2 días)

### 1.1 Auditar Entidades Actuales

Revisar `docs/offline/01-entidades.md` y confirmar:

```bash
# Lista de colecciones actuales
ls packages/app/app/lib/db/collections/*.collection.ts

# Verificar qué entidades tienen sync offline
grep -r "syncStatus" packages/backend/src/db/schema/
```

### 1.2 Diseñar Schema Drizzle

Convertir Zod schemas a Drizzle:

```typescript
// ANTES (TanStack + Zod)
const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  syncStatus: z.enum(['pending', 'synced', 'error'])
});

// DESPUÉS (Drizzle)
export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  syncStatus: text('sync_status').default('pending'),
});
```

**Checklist:**
- [ ] Todas las entidades offline mapeadas
- [ ] Relaciones definidas (foreign keys)
- [ ] Índices identificados
- [ ] Tipos exportados

### 1.3 Estructura de Carpetas

```
packages/
├── shared/                    # NUEVO
│   └── src/
│       └── schema.ts         # Schema compartido
├── app/
│   └── app/
│       └── engine/           # NUEVO
│           ├── db.ts         # PGlite init
│           ├── schema.ts     # Re-export de shared
│           └── electric.ts   # Config Electric
└── backend/
    └── src/
        └── db/
            └── schema.ts     # Re-export de shared
```

---

## Fase 2: Schema Compartido (1 día)

### 2.1 Crear Package Shared

```bash
cd packages
mkdir -p shared/src
```

### 2.2 Definir Schema Drizzle

```typescript
// packages/shared/src/schema.ts
import { pgTable, text, timestamp, decimal } from 'drizzle-orm/pg-core';

export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  businessId: text('business_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const sales = pgTable('sales', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull(),
  businessId: text('business_id').notNull(),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }),
  status: text('status').default('draft'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Exportar tipos
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;
```

### 2.3 Usar en Backend

```typescript
// packages/backend/src/db/schema.ts
export * from '@avileo/shared/schema';
```

### 2.4 Usar en Frontend

```typescript
// packages/app/app/engine/schema.ts
export * from '@avileo/shared/schema';
```

---

## Fase 3: PGlite Setup (1 día)

### 3.1 Instalar Dependencias

```bash
cd packages/app
npm install drizzle-orm @electric-sql/pglite @electric-sql/pglite-sync
```

### 3.2 Inicializar PGlite

```typescript
// packages/app/app/engine/db.ts
import { PGlite } from '@electric-sql/pglite';
import { electricSync } from '@electric-sql/pglite-sync';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from './schema';

let pg: PGlite | null = null;
let db: ReturnType<typeof drizzle> | null = null;

export async function initDatabase() {
  if (!pg) {
    pg = await PGlite.create({
      dataDir: 'idb://avileo-pg',
      extensions: { electric: electricSync() },
    });
    
    db = drizzle(pg, { schema });
    
    // Crear tablas
    await createTables(pg);
  }
  
  return { pg, db };
}

async function createTables(pg: PGlite) {
  await pg.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      business_id TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      total_amount DECIMAL(12,2),
      status TEXT DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
```

---

## Fase 4: Electric Shapes (1 día)

### 4.1 Configurar Sync

```typescript
// packages/app/app/engine/electric.ts
import { PGlite } from '@electric-sql/pglite';

const ELECTRIC_URL = import.meta.env.VITE_ELECTRIC_URL;

export async function startSync(pg: PGlite, businessId: string, token: string) {
  // Sync customers
  await pg.electric.syncShapeToTable({
    shape: {
      url: `${ELECTRIC_URL}/v1/shape`,
      params: {
        table: 'customers',
        where: `business_id = '${businessId}'`,
      },
      headers: { Authorization: `Bearer ${token}` },
    },
    table: 'customers',
    primaryKey: ['id'],
  });
  
  // Sync sales
  await pg.electric.syncShapeToTable({
    shape: {
      url: `${ELECTRIC_URL}/v1/shape`,
      params: {
        table: 'sales',
        where: `business_id = '${businessId}'`,
      },
      headers: { Authorization: `Bearer ${token}` },
    },
    table: 'sales',
    primaryKey: ['id'],
  });
}
```

### 4.2 Integrar en App

```typescript
// packages/app/app/root.tsx o _protected.tsx
import { initDatabase } from './engine/db';
import { startSync } from './engine/electric';

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request);
  const { pg, db } = await initDatabase();
  
  // Iniciar sync
  const cleanup = await startSync(pg, user.businessId, user.token);
  
  return { db, cleanup };
}
```

---

## Fase 5: Migrar Datos (1 día)

### 5.1 Exportar de TanStack DB

```typescript
// Script temporal de migración
export async function migrateFromTanstackDB() {
  // Obtener todas las colecciones
  const customers = await customerCollection.findMany();
  const sales = await saleCollection.findMany();
  
  // Insertar en PGlite
  const { db } = await initDatabase();
  
  for (const customer of customers) {
    await db.insert(customers).values({
      id: customer.id,
      name: customer.name,
      // ... mapear campos
    });
  }
  
  console.log(`Migrados ${customers.length} clientes`);
}
```

### 5.2 Validar Migración

- [ ] Conteo de registros coincide
- [ ] Relaciones mantenidas
- [ ] Datos sin corromper
- [ ] Performance aceptable

---

## Fase 6: Write Queue (2 días)

### 6.1 Implementar Queue

```typescript
// packages/app/app/engine/write-queue.ts

interface PendingWrite {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  body: unknown;
  attempts: number;
}

export async function queueWrite(
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body: unknown
) {
  if (navigator.onLine) {
    try {
      await executeWrite({ endpoint, method, body });
      return;
    } catch {
      // Fall through to queue
    }
  }
  
  // Guardar en IndexedDB
  await saveToIndexedDB({ id: crypto.randomUUID(), endpoint, method, body, attempts: 0 });
}
```

### 6.2 Migrar Mutaciones

**ANTES (TanStack):**
```typescript
const createCustomer = async (data) => {
  await customerCollection.insert(data);
};
```

**DESPUÉS (API + Queue):**
```typescript
const createCustomer = async (data) => {
  await queueWrite('/api/customers', 'POST', data);
};
```

---

## Fase 7: Actualizar Hooks (1-2 días)

### 7.1 Migrar useLiveQuery

**ANTES:**
```typescript
import { useLiveQuery } from '@tanstack/react-db';

function useCustomers() {
  return useLiveQuery(
    (q) => q.from({ customers: customerCollection })
  );
}
```

**DESPUÉS:**
```typescript
import { useLiveQuery } from '@electric-sql/react';
import { db } from '~/engine/db';
import { customers } from '~/engine/schema';

function useCustomers() {
  return useLiveQuery(db.select().from(customers));
}
```

### 7.2 Migrar Mutaciones

**ANTES:**
```typescript
const createSale = async (data) => {
  await saleCollection.insert(data);
};
```

**DESPUÉS:**
```typescript
const createSale = async (data) => {
  await queueWrite('/api/sales', 'POST', data);
};
```

---

## Fase 8: Testing (2-3 días)

### 8.1 Tests Unitarios

```typescript
// Test PGlite setup
describe('Database', () => {
  it('should initialize PGlite', async () => {
    const { db } = await initDatabase();
    expect(db).toBeDefined();
  });
});
```

### 8.2 Tests de Integración

- [ ] Sync inicial funciona
- [ ] Crear venta online
- [ ] Crear venta offline
- [ ] Queue procesa al volver online
- [ ] Live query actualiza automáticamente

### 8.3 Tests E2E

```typescript
// Playwright test
test('offline sale sync', async ({ page }) => {
  await page.goto('/sales');
  
  // Go offline
  await page.context().setOffline(true);
  
  // Create sale
  await page.click('[data-testid="create-sale"]');
  await page.fill('[name="customer"]', 'Test Customer');
  await page.click('[type="submit"]');
  
  // Verify pending state
  await expect(page.locator('.sale-status')).toContainText('Pendiente');
  
  // Go online
  await page.context().setOffline(false);
  
  // Verify sync
  await expect(page.locator('.sale-status')).toContainText('Sincronizado', { timeout: 10000 });
});
```

---

## Fase 9: Limpieza (1 día)

### 9.1 Eliminar Código Viejo

```bash
# Eliminar colecciones de TanStack
rm packages/app/app/lib/db/collections/*.collection.ts

# Eliminar hooks antiguos
rm packages/app/app/hooks/use-*-db.ts

# Eliminar dependencias
npm uninstall @tanstack/react-db @tanstack/electric-db-collection
```

### 9.2 Actualizar Documentación

- [ ] Actualizar README
- [ ] Actualizar AGENTS.md
- [ ] Documentar cambios en CHANGELOG

---

## Checklist Final

### Funcionalidad
- [ ] Todas las entidades migradas
- [ ] Sync funciona en tiempo real
- [ ] Offline mode funciona
- [ ] Queue procesa correctamente
- [ ] Conflictos resueltos apropiadamente

### Performance
- [ ] Sync inicial < 5 segundos
- [ ] Queries locales < 100ms
- [ ] Bundle size aceptable
- [ ] Memoria estable

### UX
- [ ] Estados de loading claros
- [ ] Indicadores de sync visibles
- [ ] Error messages útiles
- [ ] Transición offline/online suave

---

## Rollback Plan

Si algo sale mal:

1. **Revertir código:** `git revert` a commit anterior
2. **Limpiar IndexedDB:** Usuario debe limpiar datos del sitio
3. **Restaurar TanStack:** Reactivar colecciones viejas
4. **Notificar usuarios:** Comunicar problema y solución

---

## Recursos

- [Arquitectura](./02-arquitectura.md)
- [Flujos de sync](./03-flujo-sync.md)
- [Decisiones técnicas](./04-decisiones.md)
- [Troubleshooting](./06-troubleshooting.md)
