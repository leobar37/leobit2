# TanStack DB + ElectricSQL - Quick Start para Avileo

> Tutorial práctico para migrar de sync custom a TanStack DB con ElectricSQL.

**Proyecto:** Avileo (PollosPro)  
**Stack:** React 19 + React Router v7 + ElectricSQL + PostgreSQL

---

## 1. Instalación

```bash
cd packages/app

# Instalar dependencias de TanStack DB + Electric
npm install @tanstack/react-db @tanstack/electric-db-collection electric-sql
```

**Dependencias ya instaladas:**
- ✅ `@tanstack/db` (ya en package.json)
- ✅ `@tanstack/react-query` (ya en package.json)
- ✅ `zod` (ya en package.json)

---

## 2. Estructura de Archivos

Crea esta estructura en el proyecto:

```
app/lib/db/
├── collections/              # NEW: TanStack DB collections
│   ├── index.ts            # Export all collections
│   ├── customer.collection.ts
│   ├── sale.collection.ts
│   ├── product.collection.ts
│   └── payment.collection.ts
├── schema.ts                # EXISTING: Zod schemas
└── electric-client.tsx      # NEW: Electric provider
```

---

## 3. Paso a Paso: Migrar una Entidad

Vamos a migrar **Customers** como ejemplo.

### 3.1. Existing Schema (ya existe)

```typescript
// app/lib/db/schema.ts - YA EXISTE
export const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  dni: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  notes: z.string().nullable(),
  businessId: z.string(),
  syncStatus: z.enum(["pending", "synced", "error"]).default("pending"),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Customer = z.infer<typeof customerSchema>;
```

### 3.2. Crear Collection

```typescript
// app/lib/db/collections/customer.collection.ts
import { createCollection } from '@tanstack/react-db'
import { electricCollectionOptions } from '@tanstack/electric-db-collection'
import { customerSchema } from '../schema'
import { api } from '~/lib/api-client'

export const customerCollection = createCollection(
  electricCollectionOptions({
    id: 'customers',
    schema: customerSchema,
    getKey: (customer) => customer.id,
    shapeOptions: {
      url: '/api/electric/shape',
      params: { table: 'customers' },
    },
    onInsert: async ({ transaction }) => {
      const newCustomer = transaction.mutations[0].modified
      const response = await api.customers.post(newCustomer)
      return { txid: response.data?.txid }
    },
    onUpdate: async ({ transaction }) => {
      const { original, changes } = transaction.mutations[0]
      const response = await api.customers({ id: original.id }).patch(changes)
      return { txid: response.data?.txid }
    },
    onDelete: async ({ transaction }) => {
      const { original } = transaction.mutations[0]
      await api.customers({ id: original.id }).delete()
    },
  })
)
```

### 3.3. Exportar Collection

```typescript
// app/lib/db/collections/index.ts
export { customerCollection } from './customer.collection'
export { saleCollection } from './sale.collection'
export { productCollection } from './product.collection'
export { paymentCollection } from './payment.collection'
```

---

## 4. Usar en Componentes

### 4.1. Reemplazar useQuery con useLiveQuery

**Antes (TanStack Query):**

```typescript
// app/hooks/use-customers.ts
import { useQuery } from '@tanstack/react-query'
import { api } from '~/lib/api-client'

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data } = await api.customers.get()
      return data as Customer[]
    },
  })
}
```

**Después (TanStack DB):**

```typescript
// app/components/customers/customer-list.tsx
import { useLiveQuery, eq } from '@tanstack/react-db'
import { customerCollection } from '~/lib/db/collections'

export function CustomerList({ businessId }: { businessId: string }) {
  const { data: customers } = useLiveQuery(
    (q) =>
      q
        .from({ customer: customerCollection })
        .where(({ customer }) => eq(customer.businessId, businessId))
        .orderBy(({ customer }) => customer.name, 'asc'),
    [businessId]
  )

  return (
    <ul>
      {customers?.map((customer) => (
        <li key={customer.id}>{customer.name}</li>
      ))}
    </ul>
  )
}
```

### 4.2. Mutations Optimistas

**Antes (manual):**

```typescript
// app/lib/db/collections.ts
import { isOnline, syncClient } from '~/lib/sync'

export async function createCustomer(data: CreateCustomerInput) {
  if (!isOnline()) {
    const tempId = createSyncId()
    await syncClient.enqueueOperation({
      entity: 'customers',
      operation: 'insert',
      entityId: tempId,
      data,
    })
    return { ...data, id: tempId, syncStatus: 'pending' }
  }
  // Online path...
}
```

**Después (automático):**

```typescript
// El collection ya tiene onInsert configurado
// Solo llamas:
customerCollection.insert({
  id: crypto.randomUUID(),
  name: 'Nuevo Cliente',
  businessId: '...',
})
// ✅ Instantáneo - se muestra inmediatamente
// ✅ Se sincroniza cuando hay conexión
// ✅ Rollback automático si falla
```

---

## 5. Configuración del Backend

### 5.1. API Endpoint para Electric Shapes

```typescript
// packages/backend/src/api/electric.ts
import { sql } from 'drizzle-orm'
import { db } from '../db'

export const electricShapeRoutes = {
  // GET /api/electric/shape?table=customers
  getShape: async (request: Request) => {
    const url = new URL(request.url)
    const table = url.searchParams.get('table')
    
    // Tu lógica de autenticación
    const auth = await authenticate(request)
    if (!auth) return new Response('Unauthorized', { status: 401 })

    // Proxy a Electric
    const electricUrl = `${process.env.ELECTRIC_URL}/v1/shape?table=${table}`
    const response = await fetch(electricUrl, {
      headers: { 'Authorization': `Bearer ${auth.token}` },
    })

    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        // ... otros headers
      },
    })
  },

  // POST /api/customers (tu API existente)
  createCustomer: async (data: any) => {
    let txid!: number
    
    const result = await db.transaction(async (tx) => {
      // 🔑 CRÍTICO: obtener txid DENTRO de la transacción
      const txidResult = await tx.execute(
        sql`SELECT pg_current_xact_id()::xid::text as txid`
      )
      txid = parseInt(txidResult[0].txid, 10)

      const [customer] = await tx
        .insert(customersTable)
        .values(data)
        .returning()

      return { customer, txid }
    })

    return result
  },
}
```

---

## 6. Comparación: Antes vs Después

| Aspecto | Antes (Custom) | Después (TanStack DB) |
|---------|----------------|----------------------|
| Sync | 30 segundos | Tiempo real |
| Queries | useQuery + filter JS | useLiveQuery |
| Updates | Manual optimistic | Automático |
| Rollback | Manual | Automático |
| Código | ~200 líneas | ~50 líneas |
| Joins | En componente | En query |

---

## 7. Migración Entidad por Entidad

| Entidad | Estado | Notas |
|---------|--------|-------|
| Customers | 🟡 Pendiente | Migrar primero |
| Products | 🟡 Pendiente | Solo lectura |
| Sales | 🟡 Pendiente | Complex (items) |
| Payments | 🟡 Pendiente | |
| Distributions | 🟡 Pendiente | |

---

## 8. Errores Comunes (EVITAR)

### ❌ NO hagas esto:

```typescript
// WRONG: update con objeto
customerCollection.update(id, { name: 'Nuevo' })

// RIGHT: update con función (Immer)
customerCollection.update(id, (draft) => {
  draft.name = 'Nuevo'
})

// WRONG: === en where
.where(({ c }) => c.name === 'Juan')

// RIGHT: eq() en where
.where(({ c }) => eq(c.name, 'Juan'))
```

---

## 9. Siguientes Pasos

1. ✅ Instalar dependencias
2. ⬜ Crear collections para Customers
3. ⬜ Configurar backend (txid)
4. ⬜ Probar en desarrollo
5. ⬜ Migrar Sales
6. ⬜ Migrar Payments
7. ⬜ Eliminar código custom sync

---

## 10. Referencia Rápida

```typescript
// Queries
useLiveQuery(q => q.from({ c: collection }).where(...))

// Mutations
collection.insert({ ... })
collection.update(id, (d) => { d.field = value })
collection.delete(id)

// Joins
q.from({ a: collA }).join({ b: collB }, eq(a.field, b.field))
```

---

*Basado en la documentación de TanStack DB y estructura de Avileo.*
