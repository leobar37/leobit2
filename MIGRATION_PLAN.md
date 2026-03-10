# Plan de Migración Gradual - Avileo Offline-First

## Contexto: Por Qué Estamos Migrando

### Problemas del Sistema Viejo

**1. Arquitectura de Sync Manual (Código Legacy)**
- **Complejidad innecesaria**: 500+ líneas de código en `app/lib/sync/` para manejar offline
- **Polling ineficiente**: Sync cada 30 segundos en lugar de tiempo real
- **Estado duplicado**: Manteníamos estado en stores (Jotai/Zustand) + IndexedDB + TanStack Query
- **Código disperso**: Lógica de sync repetida en cada hook (`use-customers.ts`, `use-sales.ts`, etc.)
- **Manejo de errores inconsistente**: Cada hook manejaba errores de forma diferente

**2. Acoplamiento Excesivo**
- Hooks dependían de stores específicos (`stores/sale.store.ts`)
- Rutas importaban directamente de `lib/sync/client`
- Cambios en una feature rompían otras (efecto cascada)

**3. Problemas de UX**
- UI no se actualizaba en tiempo real (esperaba 30s)
- Estados "pending" manuales complicados
- Inconsistencias entre datos locales y servidor

### Por Qué TanStack DB + ElectricSQL

**1. Sincronización Automática y Tiempo Real**
- ElectricSQL sincroniza automáticamente cuando hay cambios en PostgreSQL
- Live queries: UI se actualiza instantáneamente cuando los datos cambian
- No más polling cada 30 segundos

**2. Offline-First Nativo**
- Las operaciones funcionan offline automáticamente
- ElectricSQL maneja la cola de operaciones pendientes
- Retry automático con backoff exponencial
- No necesitamos `isOnline()` checks manuales

**3. Arquitectura Más Simple**
- Una sola fuente de verdad: TanStack DB collections
- Sin stores duplicados
- Sin sync engine manual
- Menos código, menos bugs

**4. Mejor Performance**
- Live queries con differential dataflow (solo recalculan lo que cambió)
- Caché inteligente integrada
- Menos re-renders en React

---

## Decisión Arquitectónica: Enfoque Atómico

**TODAS las entidades deben ser offline-first y atómicas.**

### Principio de Atomicidad

Cada entidad del sistema debe poder operar de forma independiente offline:

```
✅ Customers - CRUD completo offline
✅ Sales (Header) - CRUD completo offline
✅ Sale Items - CRUD independiente offline
✅ Payments (Abonos) - CRUD completo offline
✅ Orders (Pedidos) - ✅ Ya implementado
✅ Order Items - ✅ Ya implementado
✅ Products - Lectura offline
✅ Distribuciones - CRUD completo offline
```

### ¿Qué significa "Atómico"?

**1. Entidades Independientes**
- Cada entidad tiene su propia collection
- Puede crearse, leerse, actualizarse o eliminarse sin depender de otras
- Ejemplo: Puedo crear un item de venta sin tener que crear la venta completa primero

**2. Items Separados (Patrón Crítico)**

**❌ INCORRECTO (Sistema Viejo)**
```typescript
// Todo anidado - no permite modificar items individualmente
saleCollection.insert({
  id: 'sale-1',
  clientId: 'client-1',
  items: [  // Anidado - problemático
    { productId: '1', quantity: 2 },
    { productId: '2', quantity: 3 }
  ]
})
```

**✅ CORRECTO (Enfoque Atómico)**
```typescript
// Header de la venta
saleCollection.insert({
  id: 'sale-1',
  clientId: 'client-1',
  totalAmount: 150.00
})

// Items independientes - cada uno es atómico
saleItemCollection.insert({ id: 'item-1', saleId: 'sale-1', productId: '1', quantity: 2 })
saleItemCollection.insert({ id: 'item-2', saleId: 'sale-1', productId: '2', quantity: 3 })
```

**Ventajas del enfoque atómico:**
- ✅ Agregar/quitar items sin modificar la venta completa
- ✅ Sincronización granular (solo cambia el item modificado)
- ✅ Mejor manejo de conflictos
- ✅ UX más fluida (guardado automático por item)

### Estructura de Collections Atómicas

```
lib/db/collections/
├── customer.collection.ts          # Clientes
├── sale.collection.ts              # Ventas (header)
├── sale-item.collection.ts         # Items de venta (ATÓMICO)
├── payment.collection.ts           # Pagos/Abonos (ATÓMICO)
├── order.collection.ts             # Pedidos (header) ✅ Ya existe
├── order-item.collection.ts        # Items de pedido (ATÓMICO) ✅ Ya existe
├── product.collection.ts           # Productos (lectura)
├── distribucion.collection.ts      # Distribuciones
└── index.ts                        # Exports
```

---

## Estado Actual (Post-Limpieza)

### ✅ Sistema Nuevo Implementado

**Orders (Pedidos)** - COMPLETO ✅
- `order.collection.ts` - Header de pedidos con ElectricSQL
- `order-item.collection.ts` - Items atómicos con ElectricSQL
- `use-orders.ts` - Hooks con useLiveQuery
- Rutas de pedidos actualizadas al nuevo patrón

**Utilitarios Base** ✅
- `id-generator.ts` - Generación centralizada de UUIDs
- `error-handler.ts` - Manejo consistente de errores de collections

### ⚠️ Sistema Viejo Eliminado

**Eliminado completamente:**
- `app/lib/sync/` - Todo el engine de sync manual (524 líneas)
- Hooks con sync manual: `use-customers.ts`, `use-sales.ts`, etc.
- Stores: `sale.store.ts`, `order.store.ts`, `purchase.store.ts`
- `collections.ts` viejo con funciones imperativas

### ❌ Features Pendientes de Migración (Enfoque Atómico)

#### 1. Customers (Clientes) - PRIORIDAD ALTA
**Estado**: Roto, usa hooks del sistema viejo
**Rutas afectadas**:
- `_protected.clientes._index.tsx`
- `_protected.clientes.$id._index.tsx`
- `_protected.clientes.nuevo.tsx`
- `_protected.clientes.$id.edit.tsx`

**Migración requerida**:
- [ ] Crear `customer.collection.ts` (entidad atómica)
- [ ] Crear `use-customers.ts` (nuevo con useLiveQuery)
- [ ] Actualizar 4 rutas de clientes

#### 2. Sales (Ventas) - PRIORIDAD ALTA
**Estado**: Parcialmente roto
- `use-sales-db.ts` - Parece compatible (verificar)
- `stores/sale.store.ts` - Usado en creación de ventas (debe eliminarse)

**Rutas afectadas**:
- `_protected.ventas.nueva._index.tsx` - Usa store viejo ❌
- `_protected.ventas._index.tsx` - Usa `use-sales-db.ts` ✅
- `_protected.ventas.$id._index.tsx` - Usa hooks viejos ❌

**Migración requerida** (Enfoque Atómico):
- [ ] Crear `sale.collection.ts` (header de ventas)
- [ ] Crear `sale-item.collection.ts` (items atómicos - CRÍTICO)
- [ ] Crear `use-sales.ts` (nuevo con useLiveQuery)
- [ ] Eliminar `stores/sale.store.ts`
- [ ] Actualizar rutas de ventas

#### 3. Payments (Pagos/Abonos) - PRIORIDAD MEDIA
**Estado**: Roto
**Rutas afectadas**:
- `_protected.cobros.nuevo.tsx`
- `_protected.clientes.$id._index.tsx` (muestra pagos del cliente)

**Migración requerida** (Enfoque Atómico):
- [ ] Crear `payment.collection.ts` (pagos atómicos)
- [ ] Crear `use-payments.ts` (nuevo con useLiveQuery)
- [ ] Actualizar rutas de cobros

#### 4. Distribuciones - PRIORIDAD MEDIA
**Estado**: Roto
**Rutas afectadas**:
- `_protected.distribuciones.tsx`
- `_protected.distribuciones.nueva._index.tsx`
- `_protected.distribuciones.$id.editar._index.tsx`
- `_protected.mi-distribucion.tsx`

**Migración requerida**:
- [ ] Analizar si distribuciones también necesitan items atómicos
- [ ] Crear collections y hooks necesarios

#### 5. Otras Features - PRIORIDAD BAJA
- File Upload (`_protected.activos.tsx`)
- Compras (`_protected.compras.*.tsx`)
- Dashboard y Cierre

---

## Hooks Existentes (Verificar Estado)

La siguiente lista de hooks existe pero **debe verificarse** si ya usan TanStack DB o necesitan migración:

- ⚠️ `use-live-customers.ts` - ¿Ya usa TanStack DB o API tradicional?
- ⚠️ `use-sales-db.ts` - ¿Qué sistema usa exactamente?
- ✅ `use-orders.ts` - NUEVO, ya migrado
- ⚠️ `use-products.ts` - ¿Estado?
- ⚠️ `use-purchases.ts` - ¿Estado?
- ⚠️ `use-inventory.ts` - ¿Estado?
- ✅ `use-auth.ts` - Auth de Better Auth (no necesita migración)
- ⚠️ Otros hooks de negocio

**Verificación necesaria**: Revisar cada hook para determinar:
1. ¿Usa TanStack Query tradicional (fetch -> cache)?
2. ¿Usa TanStack DB (live queries)?
3. ¿Aún importa de `sync/client` o stores viejos?

---

## Estrategia de Migración Gradual

### Principios Fundamentales

1. **Una entidad atómica a la vez**: Migrar completamente una entidad antes de pasar a la siguiente
2. **Mantener funcionalidad**: La UI debe seguir funcionando durante la migración
3. **Testing incremental**: Cada entidad migrada debe probarse exhaustivamente
4. **Enfoque atómico estricto**: TODAS las entidades deben seguir el patrón de items separados

### Orden de Migración (Basado en Dependencias)

```
Fase 1: Foundation ✅
   └── Orders completamente migrado
   └── Utilitarios base creados

Fase 2: Customers (PRIORIDAD ALTA)
   └── Muchas features dependen de customers
   └── Bloqueante para Sales y Payments
   
Fase 3: Sales (PRIORIDAD ALTA)
   └── Core del negocio
   └── Depende de Customers
   └── CRÍTICO: Debe usar items atómicos (sale-item.collection.ts)
   
Fase 4: Payments (PRIORIDAD MEDIA)
   └── Depende de Customers y Sales
   └── Entidad atómica independiente
   
Fase 5: Distribuciones (PRIORIDAD MEDIA)
   └── Verificar si necesita items atómicos
   
Fase 6: Otras Features (PRIORIDAD BAJA)
   └── File Upload, Compras, Dashboard, Cierre
```

---

## Patrón de Migración Atómica

### Paso 1: Crear Schema Zod

```typescript
// lib/db/schemas/[entity].ts
import { z } from "zod";

// Schema para el header (entidad principal)
export const saleSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  saleType: z.enum(["contado", "credito"]),
  totalAmount: z.number(),
  status: z.enum(["pending", "completed", "cancelled"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Schema para items atómicos (entidad separada)
export const saleItemSchema = z.object({
  id: z.string(),
  saleId: z.string(),  // Referencia al header
  productId: z.string(),
  variantId: z.string(),
  productName: z.string(),
  variantName: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  subtotal: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Sale = z.infer<typeof saleSchema>;
export type SaleItem = z.infer<typeof saleItemSchema>;
```

### Paso 2: Crear Collections Atómicas

```typescript
// lib/db/collections/sale.collection.ts
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { saleSchema } from "../schemas/sale";
import { api } from "~/lib/api-client";

export const saleCollection = createCollection(
  electricCollectionOptions({
    id: "sales",
    schema: saleSchema,
    getKey: (sale) => sale.id,
    shapeOptions: {
      url: import.meta.env.VITE_ELECTRIC_URL || "",
      params: { table: "sales" },
    },
    onInsert: async ({ transaction }) => {
      const newSale = transaction.mutations[0].modified;
      const response = await api.sales.post(newSale);
      if (response.error) throw new Error(String(response.error.value));
      return { txid: response.data?.txid };
    },
    onUpdate: async ({ transaction }) => {
      const { original, changes } = transaction.mutations[0];
      const response = await api.sales({ id: original.id }).put(changes);
      if (response.error) throw new Error(String(response.error.value));
      return { txid: response.data?.txid };
    },
    onDelete: async ({ transaction }) => {
      const { original } = transaction.mutations[0];
      await api.sales({ id: original.id }).delete();
    },
  })
);
```

```typescript
// lib/db/collections/sale-item.collection.ts
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { saleItemSchema } from "../schemas/sale";
import { api } from "~/lib/api-client";

export const saleItemCollection = createCollection(
  electricCollectionOptions({
    id: "sale_items",
    schema: saleItemSchema,
    getKey: (item) => item.id,
    shapeOptions: {
      url: import.meta.env.VITE_ELECTRIC_URL || "",
      params: { table: "sale_items" },
    },
    onInsert: async ({ transaction }) => {
      const newItem = transaction.mutations[0].modified;
      // Llamada a API para agregar item a la venta
      const response = await api
        .sales({ id: newItem.saleId })
        .items.post(newItem);
      if (response.error) throw new Error(String(response.error.value));
      return { txid: response.data?.txid };
    },
    onUpdate: async ({ transaction }) => {
      const { original, changes } = transaction.mutations[0];
      const response = await api
        .sales({ id: original.saleId })
        .items({ itemId: original.id })
        .patch(changes);
      if (response.error) throw new Error(String(response.error.value));
      return { txid: response.data?.txid };
    },
    onDelete: async ({ transaction }) => {
      const { original } = transaction.mutations[0];
      await api
        .sales({ id: original.saleId })
        .items({ itemId: original.id })
        .delete();
    },
  })
);
```

### Paso 3: Crear Hooks con Enfoque Atómico

```typescript
// hooks/use-sales.ts
import { useLiveQuery, eq } from "@tanstack/react-db";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saleCollection, saleItemCollection } from "~/lib/db/collections";
import { generateId } from "~/lib/utils";
import { handleCollectionError } from "~/lib/db/error-handler";

// Hook para listar ventas
export function useSales() {
  return useLiveQuery((q) =>
    q.from({ s: saleCollection }).orderBy(({ s }) => s.createdAt, "desc")
  );
}

// Hook para una venta específica
export function useSale(id: string) {
  return useLiveQuery(
    (q) => q.from({ s: saleCollection }).where(({ s }) => eq(s.id, id)),
    [id]
  );
}

// Hook para items de una venta (ATÓMICO)
export function useSaleItems(saleId: string) {
  return useLiveQuery(
    (q) =>
      q
        .from({ i: saleItemCollection })
        .where(({ i }) => eq(i.saleId, saleId))
        .orderBy(({ i }) => i.createdAt, "asc"),
    [saleId]
  );
}

// Hook para crear venta (header)
export function useCreateSale() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateSaleInput) => {
      try {
        const newSale: Sale = {
          id: generateId(),
          ...input,
          totalAmount: 0, // Se calcula después
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        saleCollection.insert(newSale);
        return newSale;
      } catch (error) {
        const handled = handleCollectionError(error);
        throw new Error(handled.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });
}

// Hook para agregar item a venta (ATÓMICO)
export function useAddSaleItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      saleId,
      item,
    }: {
      saleId: string;
      item: Omit<SaleItem, "id" | "saleId" | "createdAt" | "updatedAt">;
    }) => {
      try {
        const newItem: SaleItem = {
          id: generateId(),
          saleId,
          ...item,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        saleItemCollection.insert(newItem);
        
        // Recalcular total de la venta
        const { data: items } = useSaleItems(saleId);
        const total = (items || []).reduce(
          (sum, i) => sum + i.quantity * i.unitPrice,
          0
        );
        
        saleCollection.update(saleId, (draft) => {
          draft.totalAmount = total;
          draft.updatedAt = new Date().toISOString();
        });
        
        return newItem;
      } catch (error) {
        const handled = handleCollectionError(error);
        throw new Error(handled.message);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["sales", variables.saleId, "items"],
      });
    },
  });
}

// Hook para eliminar item de venta (ATÓMICO)
export function useRemoveSaleItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      saleId,
      itemId,
    }: {
      saleId: string;
      itemId: string;
    }) => {
      try {
        saleItemCollection.delete(itemId);
        
        // Recalcular total
        const { data: items } = useSaleItems(saleId);
        const total = (items || []).reduce(
          (sum, i) => sum + i.quantity * i.unitPrice,
          0
        );
        
        saleCollection.update(saleId, (draft) => {
          draft.totalAmount = total;
          draft.updatedAt = new Date().toISOString();
        });
        
        return { saleId, itemId };
      } catch (error) {
        const handled = handleCollectionError(error);
        throw new Error(handled.message);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["sales", variables.saleId, "items"],
      });
    },
  });
}
```

### Paso 4: Actualizar Rutas

Reemplazar imports del sistema viejo al nuevo:

```typescript
// ❌ Antes (Sistema Viejo)
import { useSales } from "~/hooks/use-sales"; // Hook viejo con sync manual
import { useSaleStore } from "~/stores/sale.store"; // Store viejo

// ✅ Después (Enfoque Atómico)
import {
  useSales,
  useSale,
  useSaleItems,
  useCreateSale,
  useAddSaleItem,
  useRemoveSaleItem,
} from "~/hooks/use-sales"; // Nuevo hook atómico
```

### Paso 5: Testing del Enfoque Atómico

**Test 1: Creación Offline**
1. Desconectar internet
2. Crear venta (solo header)
3. Agregar 3 items a la venta
4. Verificar que todo funciona sin conexión
5. Reconectar internet
6. Verificar que todo se sincroniza automáticamente

**Test 2: Modificación Atómica**
1. Abrir venta existente
2. Agregar un item nuevo (offline)
3. Eliminar otro item (offline)
4. Volver online
5. Verificar que solo esos items específicos se sincronizan

**Test 3: Live Queries**
1. Abrir lista de ventas en 2 dispositivos/pestañas
2. Crear venta en dispositivo A
3. Verificar que aparece automáticamente en dispositivo B (sin refresh)

---

## Decisiones Arquitectónicas Clave

### 1. Todas las Entidades son Atómicas

**Regla**: Si una entidad puede tener "items" o "líneas", estos deben ser colecciones separadas.

**Aplica a**:
- ✅ Sales → Sale Items
- ✅ Orders → Order Items ✅ Ya implementado
- ⚠️ Distribuciones → Verificar si tiene items
- ❌ Payments → No tiene items (es atómico por naturaleza)

### 2. IDs Generados en Cliente

Todos los IDs se generan en el cliente con `generateId()` (UUID v4):
- Permite creación offline sin esperar al servidor
- Evita duplicados cuando vuelve la conexión
- Backend debe aceptar IDs generados por cliente

### 3. Sin Stores de Estado Global

**❌ No usar**: Zustand/Jotai stores para estado de negocio
**✅ Usar**: TanStack DB collections (ya son el estado)

**Excepciones** (UI state only):
- Modales abiertos/cerrados
- Filtros seleccionados
- Estado de forms (temporal)

### 4. Esquemas Zod = Contrato

Los schemas Zod definen el contrato entre frontend y backend:
- Deben coincidir con tablas PostgreSQL
- Deben coincidir con tipos del backend
- Validación automática de datos

### 5. Error Handling Centralizado

Usar `handleCollectionError()` para todos los errores:
- Mensajes consistentes para el usuario
- Clasificación automática (offline, validation, conflict)
- UX predecible

---

## Timeline Estimado (Enfoque Atómico)

| Fase | Entidad Atómica | Tiempo Est. | Complejidad |
|------|-----------------|-------------|-------------|
| 1 | Foundation (Orders) | ✅ Listo | - |
| 2 | Customers | 2 días | Media |
| 3 | Sales + Sale Items | 4 días | Alta (patrón atómico) |
| 4 | Payments | 2 días | Media |
| 5 | Distribuciones | 2-3 días | Media-Alta |
| 6 | Otras features | 3-5 días | Variable |

**Total estimado**: 2-3 semanas de trabajo enfocado

**Nota**: El enfoque atómico requiere más tiempo inicial pero resulta en:
- Menos bugs de sincronización
- Mejor UX (guardado incremental)
- Código más mantenible

---

## Próximos Pasos Inmediatos

### 1. Verificar Hooks Existentes
Antes de empezar a migrar, verificar estado de:
- `use-live-customers.ts`
- `use-sales-db.ts`
- `use-products.ts`
- Otros hooks de negocio

Determinar: ¿Ya usan TanStack DB o API tradicional?

### 2. Confirmar Prioridad
Decidir si el orden de migración es correcto:
- ¿Customers realmente es bloqueante para todo?
- ¿Podemos empezar con Sales si `use-sales-db.ts` ya funciona?

### 3. Preparar Backend
Verificar que backend acepte:
- IDs generados por cliente (UUID v4)
- Endpoints para items atómicos (POST /sales/:id/items, etc.)
- txid en respuestas para sync

### 4. Empezar con la Siguiente Entidad
Una vez decidida la prioridad, crear:
1. Schema Zod
2. Collection(s) - header + items si aplica
3. Hooks atómicos
4. Tests offline/online

---

## Referencias

### Implementación de Referencia (Orders)
- **Schema**: `lib/db/schemas/order.ts`
- **Collections**: `lib/db/collections/order.collection.ts`, `order-item.collection.ts`
- **Hooks**: `hooks/use-orders.ts`
- **Rutas**: `routes/_protected.pedidos.*.tsx`

### Documentación
- TanStack DB: https://tanstack.com/db/latest
- ElectricSQL: https://electric-sql.com/docs
- Patrón atómico: Ver implementación de Orders

### Decisiones Documentadas
- ✅ Enfoque atómico estricto
- ✅ Todas las entidades offline-first
- ✅ Items separados para Sales/Orders
- ✅ IDs generados en cliente
- ✅ Sin stores de estado global

---

**Documento preparado para guía de migración completa.**

¿Procedemos con la verificación de hooks existentes o preferirías empezar directamente con la siguiente entidad prioritaria?
