# Tarea 3: Servicios de Entidades (CRUD + Sync)

> **Dependencias:** Tarea 1, Tarea 2  
> **Duración:** 5-6 días  
> **Archivos:** `app/services/*.service.ts`

---

## Objetivo

Crear servicios para cada entidad que implementen CRUD completo con el framework de sync. Cada servicio:
- Escribe siempre a PGlite primero (local-first)
- Encola operaciones de sync automáticamente
- Maneja entidades relacionadas de forma atómica

---

## Estructura de Servicios

```
app/services/
├── base.service.ts           # Clase base con utilidades comunes
├── sync.service.ts           # Ya implementado en Tarea 2
├── customer.service.ts       # CRUD simple
├── sale.service.ts           # CRUD con relaciones (sale + items)
├── purchase.service.ts       # CRUD con relaciones
├── product.service.ts        # CRUD simple
├── distribucion.service.ts   # CRUD con relaciones
└── closing.service.ts        # CRUD simple
```

---

## 3.1 BaseService

```typescript
// app/services/base.service.ts

import type { PGliteDatabase } from "drizzle-orm/pglite";
import { SyncService } from "./sync.service";

export abstract class BaseService {
  protected db: PGliteDatabase;
  protected syncService: SyncService;

  constructor(db: PGliteDatabase, syncService: SyncService) {
    this.db = db;
    this.syncService = syncService;
  }

  // Utilidad para generar IDs
  protected generateId(): string {
    return crypto.randomUUID();
  }

  // Utilidad para timestamps
  protected now(): string {
    return new Date().toISOString();
  }

  // Generar sync_group_id para operaciones atómicas
  protected generateSyncGroup(): string {
    return crypto.randomUUID();
  }
}
```

---

## 3.2 CustomerService (CRUD Simple)

```typescript
// app/services/customer.service.ts

import { eq, and, desc } from "drizzle-orm";
import { BaseService } from "./base.service";
import { customers } from "~/engine/schema";

export interface CreateCustomerInput {
  businessId: string;
  name: string;
  dni?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface UpdateCustomerInput {
  name?: string;
  dni?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export class CustomerService extends BaseService {
  // ─── READ ─────────────────────────────────────────

  async findById(id: string): Promise<Customer | null> {
    const result = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);
    
    return result[0] || null;
  }

  async findByBusiness(businessId: string): Promise<Customer[]> {
    return this.db
      .select()
      .from(customers)
      .where(eq(customers.businessId, businessId))
      .orderBy(desc(customers.createdAt));
  }

  // ─── CREATE ────────────────────────────────────────

  async create(data: CreateCustomerInput): Promise<Customer> {
    const id = this.generateId();
    const now = this.now();
    const syncGroupId = this.generateSyncGroup();

    // 1. Guardar en PGlite
    await this.db.insert(customers).values({
      id,
      ...data,
      syncStatus: 'pending',
      syncVersion: 1,
      createdAt: now,
      updatedAt: now,
    });

    // 2. Encolar sync
    await this.syncService.enqueue({
      entityType: 'customer',
      entityId: id,
      syncGroupId,
      operation: 'create',
      payload: { ...data, id },
      version: 1,
    });

    return this.findById(id) as Promise<Customer>;
  }

  // ─── UPDATE ────────────────────────────────────────

  async update(id: string, data: UpdateCustomerInput): Promise<Customer> {
    const customer = await this.findById(id);
    if (!customer) throw new Error('Customer not found');

    const now = this.now();
    const newVersion = customer.syncVersion + 1;
    const syncGroupId = this.generateSyncGroup();

    // 1. Actualizar en PGlite
    await this.db
      .update(customers)
      .set({
        ...data,
        syncStatus: 'pending',
        syncVersion: newVersion,
        updatedAt: now,
      })
      .where(eq(customers.id, id));

    // 2. Encolar sync
    await this.syncService.enqueue({
      entityType: 'customer',
      entityId: id,
      syncGroupId,
      operation: 'update',
      payload: { ...customer, ...data, id },
      version: newVersion,
    });

    return this.findById(id) as Promise<Customer>;
  }

  // ─── DELETE ────────────────────────────────────────

  async delete(id: string): Promise<void> {
    const customer = await this.findById(id);
    if (!customer) throw new Error('Customer not found');

    const syncGroupId = this.generateSyncGroup();

    // 1. Marcar como deletado en PGlite (soft delete)
    await this.db
      .update(customers)
      .set({
        syncStatus: 'pending',
        // No eliminamos físicamente, esperamos confirmación del servidor
      })
      .where(eq(customers.id, id));

    // 2. Encolar sync
    await this.syncService.enqueue({
      entityType: 'customer',
      entityId: id,
      syncGroupId,
      operation: 'delete',
      payload: { id },
      version: customer.syncVersion + 1,
    });
  }
}
```

---

## 3.3 SaleService (CRUD con Relaciones)

```typescript
// app/services/sale.service.ts

import { eq, and } from "drizzle-orm";
import { BaseService } from "./base.service";
import { sales, saleItems } from "~/engine/schema";

export interface CreateSaleInput {
  businessId: string;
  customerId?: string;
  sellerId: string;
  totalAmount: number;
  type?: 'instant_sale' | 'pre_order';
  saleType?: 'contado' | 'credito';
}

export interface CreateSaleItemInput {
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface SaleWithItems extends Sale {
  items: SaleItem[];
}

export class SaleService extends BaseService {
  // ─── READ ─────────────────────────────────────────

  async findById(id: string): Promise<SaleWithItems | null> {
    const [sale] = await this.db
      .select()
      .from(sales)
      .where(eq(sales.id, id))
      .limit(1);

    if (!sale) return null;

    const items = await this.db
      .select()
      .from(saleItems)
      .where(eq(saleItems.saleId, id));

    return { ...sale, items };
  }

  async findByBusiness(businessId: string): Promise<SaleWithItems[]> {
    const saleList = await this.db
      .select()
      .from(sales)
      .where(eq(sales.businessId, businessId));

    // TODO: Optimizar con JOIN
    const result: SaleWithItems[] = [];
    for (const sale of saleList) {
      const items = await this.db
        .select()
        .from(saleItems)
        .where(eq(saleItems.saleId, sale.id));
      result.push({ ...sale, items });
    }

    return result;
  }

  // ─── CREATE (Atómico) ──────────────────────────────

  async createWithItems(
    saleData: CreateSaleInput,
    items: CreateSaleItemInput[]
  ): Promise<SaleWithItems> {
    const saleId = this.generateId();
    const now = this.now();
    const syncGroupId = this.generateSyncGroup();

    // Validación
    if (items.length === 0) {
      throw new Error('Sale must have at least one item');
    }

    // Calcular total
    const calculatedTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    if (Math.abs(calculatedTotal - saleData.totalAmount) > 0.01) {
      throw new Error('Total amount does not match items sum');
    }

    // 1. Crear venta en PGlite
    await this.db.insert(sales).values({
      id: saleId,
      ...saleData,
      totalAmount: calculatedTotal,
      syncStatus: 'pending',
      syncVersion: 1,
      createdAt: now,
      updatedAt: now,
    });

    // 2. Crear items en PGlite
    const itemIds: string[] = [];
    for (const item of items) {
      const itemId = this.generateId();
      itemIds.push(itemId);
      
      await this.db.insert(saleItems).values({
        id: itemId,
        saleId,
        ...item,
        syncStatus: 'pending',
        syncVersion: 1,
        createdAt: now,
      });
    }

    // 3. Encolar sync de venta
    await this.syncService.enqueue({
      entityType: 'sale',
      entityId: saleId,
      syncGroupId,
      operation: 'create',
      payload: { ...saleData, id: saleId, items },
      version: 1,
    });

    // 4. Encolar sync de items (mismo grupo)
    for (let i = 0; i < items.length; i++) {
      await this.syncService.enqueue({
        entityType: 'sale_item',
        entityId: itemIds[i],
        syncGroupId,  // ← Mismo grupo que la venta
        operation: 'create',
        payload: { ...items[i], id: itemIds[i], saleId },
        version: 1,
      });
    }

    return this.findById(saleId) as Promise<SaleWithItems>;
  }

  // ─── UPDATE (Atómico) ──────────────────────────────

  async updateWithItems(
    saleId: string,
    saleData: Partial<CreateSaleInput>,
    items?: CreateSaleItemInput[]  // Si se proporciona, reemplaza todos los items
  ): Promise<SaleWithItems> {
    const existing = await this.findById(saleId);
    if (!existing) throw new Error('Sale not found');

    const now = this.now();
    const newVersion = existing.syncVersion + 1;
    const syncGroupId = this.generateSyncGroup();

    // 1. Actualizar venta
    await this.db
      .update(sales)
      .set({
        ...saleData,
        syncStatus: 'pending',
        syncVersion: newVersion,
        updatedAt: now,
      })
      .where(eq(sales.id, saleId));

    await this.syncService.enqueue({
      entityType: 'sale',
      entityId: saleId,
      syncGroupId,
      operation: 'update',
      payload: { ...existing, ...saleData, id: saleId },
      version: newVersion,
    });

    // 2. Si hay nuevos items, reemplazar
    if (items) {
      // Marcar items antiguos como deleted
      for (const oldItem of existing.items) {
        await this.syncService.enqueue({
          entityType: 'sale_item',
          entityId: oldItem.id,
          syncGroupId,
          operation: 'delete',
          payload: { id: oldItem.id },
          version: oldItem.syncVersion + 1,
        });
      }

      // Crear nuevos items
      for (const item of items) {
        const itemId = this.generateId();
        
        await this.db.insert(saleItems).values({
          id: itemId,
          saleId,
          ...item,
          syncStatus: 'pending',
          syncVersion: 1,
          createdAt: now,
        });

        await this.syncService.enqueue({
          entityType: 'sale_item',
          entityId: itemId,
          syncGroupId,
          operation: 'create',
          payload: { ...item, id: itemId, saleId },
          version: 1,
        });
      }
    }

    return this.findById(saleId) as Promise<SaleWithItems>;
  }

  // ─── DELETE (Atómico) ──────────────────────────────

  async delete(saleId: string): Promise<void> {
    const existing = await this.findById(saleId);
    if (!existing) throw new Error('Sale not found');

    const syncGroupId = this.generateSyncGroup();

    // 1. Encolar delete de items primero (child)
    for (const item of existing.items) {
      await this.syncService.enqueue({
        entityType: 'sale_item',
        entityId: item.id,
        syncGroupId,
        operation: 'delete',
        payload: { id: item.id },
        version: item.syncVersion + 1,
      });
    }

    // 2. Encolar delete de venta (parent)
    await this.syncService.enqueue({
      entityType: 'sale',
      entityId: saleId,
      syncGroupId,
      operation: 'delete',
      payload: { id: saleId },
      version: existing.syncVersion + 1,
    });

    // 3. Marcar en PGlite (soft delete)
    await this.db
      .update(sales)
      .set({ syncStatus: 'pending' })
      .where(eq(sales.id, saleId));
  }
}
```

---

## 3.4 Otros Servicios

### PurchaseService
Similar a SaleService (parent + items).

### ProductService
Similar a CustomerService (CRUD simple).

### DistribucionService
Similar a SaleService (parent + items).

### ClosingService
Similar a CustomerService (CRUD simple).

---

## Reglas para Servicios

### 1. Siempre Local-First
```typescript
// ✅ CORRECTO
await db.insert(customers).values(data);  // Local primero
await syncService.enqueue({...});          // Luego encolar

// ❌ INCORRECTO
await api.customers.post(data);  // Nunca llamar API directo
```

### 2. Entidades Relacionadas = Mismo Sync Group
```typescript
const syncGroupId = this.generateSyncGroup();

// Venta e items tienen el mismo syncGroupId
await syncService.enqueue({ entityType: 'sale', syncGroupId, ... });
await syncService.enqueue({ entityType: 'sale_item', syncGroupId, ... });
```

### 3. Versionado Incremental
```typescript
const newVersion = existing.syncVersion + 1;  // Siempre incrementar
```

### 4. Soft Delete
```typescript
// No eliminar físicamente, esperar confirmación del servidor
await db.update(table).set({ syncStatus: 'pending' });
await syncService.enqueue({ operation: 'delete', ... });
```

---

## Checklist

- [ ] BaseService con utilidades comunes
- [ ] CustomerService (CRUD completo)
- [ ] SaleService (create/update/delete con items)
- [ ] PurchaseService (similar a SaleService)
- [ ] ProductService (CRUD simple)
- [ ] DistribucionService (CRUD con items)
- [ ] ClosingService (CRUD simple)
- [ ] Todos usan syncService.enqueue()
- [ ] Todos manejan syncVersion correctamente
- [ ] Tests unitarios para cada servicio

---

## Dependencias

- Tarea 1 (tablas creadas)
- Tarea 2 (SyncService implementado)

## Bloquea

- Tarea 4 (hooks usan estos servicios)

---

*Complejidad: ALTA*  
*Patrón crítico: Local-first + Sync*
