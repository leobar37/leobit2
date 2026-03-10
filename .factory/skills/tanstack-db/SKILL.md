---
name: tanstack-db
description: TanStack DB con React y ElectricSQL. Usa esta skill para
  implementar sincronización tiempo real con PostgreSQL, live queries reactivas,
  y mutations optimistas en Avileo.
user-invocable: true
disable-model-invocation: false
---

# TanStack DB - Avileo Reference

> Sincronización tiempo real con PostgreSQL, live queries reactivas, y mutations optimistas instantáneas.

**Stack:** React + ElectricSQL + PostgreSQL

---

## Instalación

```bash
# Frontend - solo estos paquetes son necesarios:
npm install @tanstack/react-db @tanstack/electric-db-collection
npm install @electric-sql/pglite

# NOTA: No instalar @electric-sql/pg-proxy ni @electric-sql/pglite-sync
# Electric Cloud maneja el sync automáticamente
```

---

## Conceptos Clave

| Concepto | Descripción |
|----------|-------------|
| **Collection** | Typed set de datos sincronizados desde PostgreSQL |
| **Live Query** | Query reactiva que actualiza automáticamente cuando los datos cambian |
| **Optimistic Mutation** | Cambio instantáneo en UI mientras espera sync del servidor |

---

## ⚠️ NO HACER (Errores Críticos)

Estos errores son los más comunes - EVÍTALOS:

### 1. update() con objeto ❌

```typescript
// ❌ WRONG
collection.update(id, { name: 'Nuevo' })

// ✅ CORRECT - función (Immer)
collection.update(id, (draft) => {
  draft.name = 'Nuevo'
})
```

### 2. Usar === en where ❌

```typescript
// ❌ WRONG
.where(({ c }) => c.active === true)

// ✅ CORRECT
.where(({ c }) => eq(c.active, true))
```

### 3. txid fuera de transacción ❌

```typescript
// ❌ WRONG
const txid = await generateTxId() // Fuera!
await sql`INSERT...`

// ✅ CORRECT
await sql.begin(async (tx) => {
  const txid = await generateTxId(tx) // Dentro!
  await tx`INSERT...`
})
```

### 4. Filtering en JS ❌

```typescript
// ❌ WRONG - re-runs from scratch
.filter(c => c.active)

// ✅ CORRECT - solo delta
.where(({ c }) => eq(c.active, true))
```

### 5. Sin dependency array ❌

```typescript
// ❌ WRONG - datos stale
useLiveQuery(q => q.from(...).where(...))

// ✅ CORRECT
useLiveQuery(q => q.from(...).where(...), [businessId])
```

---

## Configuración con ElectricSQL

### 1. Crear Collection

```typescript
// app/lib/db/collections/todo.collection.ts
import { createCollection } from '@tanstack/react-db'
import { electricCollectionOptions } from '@tanstack/electric-db-collection'
import { z } from 'zod'

const todoSchema = z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean().default(false),
  createdAt: z.string().transform(s => new Date(s)),
})

export const todoCollection = createCollection(
  electricCollectionOptions({
    id: 'todos',
    schema: todoSchema,
    getKey: (todo) => todo.id,
    shapeOptions: {
      url: '/api/electric/shape',
      params: { table: 'todos' },
    },
    onInsert: async ({ transaction }) => {
      const newItem = transaction.mutations[0].modified
      const response = await api.todos.create(newItem)
      return { txid: response.txid }
    },
    onUpdate: async ({ transaction }) => {
      const { original, changes } = transaction.mutations[0]
      const response = await api.todos.update(original.id, changes)
      return { txid: response.txid }
    },
    onDelete: async ({ transaction }) => {
      const { original } = transaction.mutations[0]
      await api.todos.delete(original.id)
    },
  })
)
```

### 2. Conexión Directa a Electric Cloud (NO proxy backend)

**Nota:** No se necesita crear un endpoint `/api/electric/shape` en el backend. El frontend se conecta directamente a Electric Cloud.

```typescript
// Frontend - conexión directa a Electric Cloud:
shapeOptions: {
  url: import.meta.env.VITE_ELECTRIC_URL,  // https://api.electric-sql.cloud/v1/shape
  params: { table: 'sales' },
}
```

**Configuración en PostgreSQL (solo esto en backend):**
```sql
-- Habilitar REPLICA IDENTITY para Electric
ALTER TABLE sales REPLICA IDENTITY FULL;
ALTER TABLE customers REPLICA IDENTITY FULL;
```

### 3. Retornar txid en API

```typescript
// Backend (ElysiaJS + Drizzle)
import { db } from './db'
import { sql } from 'drizzle-orm'

async function createTodo(data: any) {
  const result = await db.transaction(async (tx) => {
    const txidResult = await tx.execute(
      sql`SELECT pg_current_xact_id()::xid::text as txid`
    )
    const txid = parseInt(txidResult[0].txid, 10)

    const [todo] = await tx.insert(todosTable).values(data).returning()
    return { todo, txid }
  })

  return result
}
```

---

## Usar en Componentes

### Live Query Básico

```typescript
import { useLiveQuery, eq } from '@tanstack/react-db'
import { todoCollection } from '~/lib/db/collections/todo.collection'

function TodoList() {
  const { data: todos } = useLiveQuery((q) =>
    q
      .from({ todo: todoCollection })
      .where(({ todo }) => eq(todo.completed, false))
      .orderBy(({ todo }) => todo.createdAt, 'desc')
  )

  return (
    <ul>
      {todos?.map(todo => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  )
}
```

### Live Query con Join

```typescript
const { data: ordersWithCustomers } = useLiveQuery((q) =>
  q
    .from({ order: orderCollection })
    .join(
      { customer: customerCollection },
      ({ order, customer }) => eq(order.customerId, customer.id),
      'inner'
    )
    .where(({ customer }) => eq(customer.businessId, currentBusinessId))
    .select(({ order, customer }) => ({
      id: order.id,
      total: order.total,
      customerName: customer.name,
    }))
)
```

### Agregaciones

```typescript
const { data: stats } = useLiveQuery((q) =>
  q
    .from({ sale: saleCollection })
    .select(({ sale }) => ({
      totalSales: sale.count(),
      revenue: sale.sum('amount'),
      avgSale: sale.avg('amount'),
    }))
)
```

### Mutations Optimistas

```typescript
// Insert
todoCollection.insert({
  id: crypto.randomUUID(),
  text: 'Nueva tarea',
  completed: false,
})

// Update (Immer-style - CRÍTICO)
todoCollection.update(todoId, (draft) => {
  draft.completed = true
})

// Delete
todoCollection.delete(todoId)
```

---

## Integración con useMutation (TanStack Query)

> **IMPORTANTE:** TanStack DB y TanStack Query NO son alternativos - son complementarios.

### La Relación Real

| Capa | Función |
|------|---------|
| **TanStack DB** (Colecciones) | Motor de datos: lectura/escritura a PGlite + sync |
| **TanStack Query** (useMutation) | Wrapper para estados de carga y errores |

**No necesitas elegir uno u otro.** Puedes usar ambos juntos.

### ¿Por qué usar useMutation con TanStack DB?

1. **Estados de carga automáticos** - `isPending`, `isError`, `isSuccess` sin useState
2. **Manejo de errores integrado** - Error boundaries, reintentos
3. **Sin boilerplate** - No necesitas crear useState para cada operación

### ⚠️ CRÍTICO: NO usar invalidateQueries

Con `useLiveQuery`, los datos se actualizan **automáticamente** cuando cambia la colección. El `invalidateQueries` es **innecesario y contraproducente**:

```typescript
// ❌ WRONG - useLiveQuery ya se actualiza solo
export function useCreateTodo() {
  return useMutation({
    mutationFn: async (input) => {
      await todoCollection.insert(input);
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] }); // INNECESARIO
    },
  });
}

// ✅ CORRECTO - Sin invalidateQueries
export function useCreateTodo() {
  return useMutation({
    mutationFn: async (input) => {
      await todoCollection.insert(input);
      return input;
    },
    // No necesitas onSuccess - useLiveQuery se actualiza automáticamente
  });
}
```

### Patrón 1: Función Simple (sin useMutation)

```typescript
// Más simple, sin estados de carga automáticos
export function useCreateTodo() {
  return async (input: CreateTodoInput) => {
    await todoCollection.insert({
      id: crypto.randomUUID(),
      ...input,
      completed: false,
      createdAt: new Date(),
    });
  };
}

// En componente:
const createTodo = useCreateTodo();

const handleSubmit = async () => {
  try {
    await createTodo({ text: 'Nueva tarea' });
    // useLiveQuery ya actualizó los datos automáticamente
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Patrón 2: useMutation (con estados de carga)

```typescript
// Mantiene estados automáticos de loading/error
export function useCreateTodo() {
  return useMutation({
    mutationFn: async (input: CreateTodoInput) => {
      await todoCollection.insert({
        id: crypto.randomUUID(),
        ...input,
        completed: false,
        createdAt: new Date(),
      });
      return input;
    },
    // NO agregar onSuccess con invalidateQueries
  });
}

// En componente:
const createTodo = useCreateTodo();

return (
  <button 
    onClick={() => createTodo.mutate({ text: 'Nueva tarea' })}
    disabled={createTodo.isPending}
  >
    {createTodo.isPending ? 'Creando...' : 'Crear'}
  </button>
);
```

### Ejemplo Completo: useUpdateTodo

```typescript
// ❌ CON useMutation pero SIN invalidateQueries
export function useUpdateTodo() {
  return useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: Partial<Todo> }) => {
      await todoCollection.update(id, (draft) => {
        if (changes.text !== undefined) draft.text = changes.text;
        if (changes.completed !== undefined) draft.completed = changes.completed;
      });
      return { id, ...changes };
    },
    // onSuccess NO es necesario - useLiveQuery detecta el cambio
  });
}

// Uso en componente:
const updateTodo = useUpdateTodo();

<button 
  onClick={() => updateTodo.mutate({ id: '123', changes: { completed: true } })}
  disabled={updateTodo.isPending}
>
  {updateTodo.isPending ? 'Actualizando...' : 'Completar'}
</button>

// ERROR: No hacer esto:
/*
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['todos'] });
}
*/
```

### Resumen: ¿Cuál patrón usar?

| Aspecto | Función Simple | useMutation |
|---------|---------------|-------------|
| Estados de carga | Manual (useState) | Automático (isPending) |
| Errores | try/catch manual | Automático |
| Código | Más líneas | Menos líneas |
| Control | Total | Limitado |

**Recomendación:** Usar `useMutation` para consistencia con el resto del codebase y menos boilerplate.

---

## Operadores de Query

| Operador | Uso |
|----------|-----|
| `eq(a, b)` | Igual a |
| `ne(a, b)` | Diferente de |
| `gt(a, b)`, `gte(a, b)` | Mayor que |
| `lt(a, b)`, `lte(a, b)` | Menor que |
| `like(a, pattern)` | LIKE pattern |
| `ilike(a, pattern)` | LIKE case-insensitive |
| `inArray(a, [...])` | En array |
| `and(...)`, `or(...)`, `not(...)` | Lógicos |
| `count()`, `sum()`, `avg()`, `min()`, `max()` | Agregaciones |

---

## Errores Comunes (CRÍTICO)

### 1. update() con objeto en lugar de función

```typescript
// ❌ WRONG
todoCollection.update(id, { completed: true })

// ✅ CORRECT - Immer-style
todoCollection.update(id, (draft) => {
  draft.completed = true
})
```

### 2. txid fuera de la transacción

```typescript
// ❌ WRONG
async function createTodo(data) {
  const txid = await generateTxId()  // Fuera!
  await sql`INSERT...`
}

// ✅ CORRECT
async function createTodo(data) {
  const result = await sql.begin(async (tx) => {
    const txid = await generateTxId(tx)  // Dentro!
    await tx`INSERT...`
    return { txid }
  })
}
```

### 3. Usar === en lugar de eq()

```typescript
// ❌ WRONG
.where(({ todo }) => todo.completed === false)

// ✅ CORRECT
.where(({ todo }) => eq(todo.completed, false))
```

### 4. Filtering en JS en lugar de operadores

```typescript
// ❌ WRONG - re-runs todo desde cero
const { data } = useLiveQuery(q => {
  const all = q.from({ todo: todoCollection })
  return all.filter(t => !t.completed)  // JS filter!
})

// ✅ CORRECT - solo recalcula delta
const { data } = useLiveQuery(q =>
  q.from({ todo: todoCollection })
    .where(({ todo }) => eq(todo.completed, false))
)
```

### 5. Missing dependency array

```typescript
// ❌ WRONG
const { data } = useLiveQuery(q =>
  q.from({ todo: todoCollection }).where(({ todo }) => eq(todo.userId, userId))
)

// ✅ CORRECT
const { data } = useLiveQuery(q =>
  q.from({ todo: todoCollection }).where(({ todo }) => eq(todo.userId, userId)),
  [userId]
)
```

---

## 🚨 Errores Comunes de Implementación

Basado en implementaciones reales en Avileo, estos errores son comunes al migrar a TanStack DB + ElectricSQL:

### 1. Instalar paquetes innecesarios

**❌ Error:** Instalar `@electric-sql/pg-proxy` o `@electric-sql/pglite-sync`

```bash
# NO instalar estos:
npm install @electric-sql/pg-proxy      # No necesario con Electric Cloud
npm install @electric-sql/pglite-sync   # No necesario con TanStack DB
```

**✅ Correcto:**
```bash
# Solo estos son necesarios:
npm install @tanstack/react-db @tanstack/electric-db-collection
npm install @electric-sql/pglite        # Solo para DB local
```

**Por qué:** Electric Cloud maneja el sync automáticamente. TanStack DB se conecta directamente a Electric Cloud, no necesitas proxy propio ni extensiones de PGlite.

---

### 2. Crear endpoint /api/electric/shape en backend

**❌ Error:** Crear un proxy en el backend para forward a Electric.

**✅ Correcto:** No crear ningún endpoint. El frontend se conecta directamente a Electric Cloud:

```typescript
// Frontend - conexión directa:
shapeOptions: {
  url: 'https://api.electric-sql.cloud/v1/shape',
  params: { table: 'sales' },
}
```

**Por qué:** Electric Cloud es un servicio externo. Tu backend no necesita intermediar.

---

### 3. Intentar usar pg.electric.syncShapeToTable()

**❌ Error:**
```typescript
import { electricSync } from '@electric-sql/pglite-sync'

const pg = await PGlite.create({
  extensions: { electric: electricSync() }
})

await pg.electric.syncShapeToTable({...})  // No necesario
```

**✅ Correcto:** Simplificar el provider:

```typescript
// electric-client.tsx
const pg = await PGlite.create({
  dataDir: 'idb://avileo-pg'
  // Sin extensiones - el sync lo maneja TanStack DB
})
```

**Por qué:** `@tanstack/electric-db-collection` maneja el sync internamente.

---

### 4. Problemas de tipos con electricCollectionOptions

**❌ Error:** Dejar que TypeScript infiera tipos o usar tipos genéricos.

**✅ Correcto:** Usar `@ts-ignore` con tipos explícitos:

```typescript
// @ts-ignore - electricCollectionOptions types are not fully aligned
export const saleCollection = createCollection(
  electricCollectionOptions({
    id: 'sales',
    schema: saleSchema,
    getKey: (sale: Sale) => sale.id,
    onInsert: async ({ transaction }: { 
      transaction: { mutations: Array<{ modified: Sale }> } 
    }) => {
      const newSale = transaction.mutations[0].modified
      // ...
    },
  })
)
```

**Por qué:** La versión 0.2.39 tiene tipos estrictos que no coinciden con el uso real.

---

### 5. Intentar usar agregaciones

**❌ Error:**
```typescript
.select(({ sale }) => ({
  count: sale.count(),      // No disponible
  total: sale.sum('amount') // No disponible
}))
```

**✅ Correcto:** Calcular en JavaScript:

```typescript
const { data: sales } = useLiveQuery(...)

const stats = sales?.reduce((acc, sale) => ({
  count: acc.count + 1,
  total: acc.total + Number(sale.totalAmount)
}), { count: 0, total: 0 })
```

**Por qué:** Las agregaciones no están implementadas en la versión actual de TanStack DB.

---

### 6. Obtener businessId del hook equivocado

**❌ Error:**
```typescript
const { businessId } = useAuth()  // No existe
```

**✅ Correcto:**
```typescript
const { data: business } = useBusiness()
const businessId = business?.id
```

**Por qué:** `useAuth()` no retorna `businessId`, usar `useBusiness()`.

---

### 7. Olvidar REPLICA IDENTITY en PostgreSQL

**❌ Error:** No configurar las tablas para Electric.

**✅ Correcto:** Crear migración SQL:

```sql
-- drizzle/XXXX_add_replica_identity.sql
ALTER TABLE sales REPLICA IDENTITY FULL;
ALTER TABLE sale_items REPLICA IDENTITY FULL;
ALTER TABLE customers REPLICA IDENTITY FULL;
```

**Por qué:** Electric necesita `REPLICA IDENTITY FULL` para capturar todos los cambios.

---

### 8. Escribir directo a Electric en lugar de la API

**❌ Error:** Intentar escribir directo a ElectricSQL.

**✅ Correcto:** Siempre escribir via tu API:

```typescript
onInsert: async ({ transaction }) => {
  const newSale = transaction.mutations[0].modified
  
  // Escribir via API:
  const response = await api.sales.post(newSale)
  
  // Electric detecta el cambio en PostgreSQL automáticamente
  return { txid: response.data?.id }
}
```

**Por qué:** Las escrituras deben pasar por tu backend para validación, auth, lógica de negocio.

---

## Checklist Pre-Implementación

Antes de empezar, verificar:

- [ ] Electric Cloud está configurado y las shapes existen en el dashboard
- [ ] Variables de entorno `VITE_ELECTRIC_URL` configuradas
- [ ] Migración SQL con `REPLICA IDENTITY FULL` aplicada
- [ ] Solo instalar dependencias necesarias (sin pg-proxy ni pglite-sync)
- [ ] Tener claro que el backend NO necesita cambios (solo PostgreSQL)

---

## Comparación con Implementación Actual

| Aspecto | Actual (Custom) | TanStack DB + ElectricSQL |
|---------|------------------|--------------------------|
| Sync | 30 segundos | Tiempo real (<100ms) |
| Updates | Polling | Push via WebSocket |
| Queries | Filter en JS | Live queries con d2ts |
| Mutations | Manual optimistic | Automático con rollback |
| Código | ~500 líneas sync | ~100 líneas |

---

## Migración Paso a Paso

1. **Instalar dependencias** en frontend
2. **Configurar ElectricSQL** en PostgreSQL
3. **Crear collections** para cada entidad
4. **Reemplazar hooks** de TanStack Query con useLiveQuery
5. **Migrar mutations** a colección.update/insert/delete
   - **Opción A:** Funciones async simples (más control, sin estados automáticos)
   - **Opción B:** useMutation wrapper (menos boilerplate, estados automáticos)
   - **Importante:** NO usar invalidateQueries con useLiveQuery

---

## Estructura de Archivos

```
app/lib/db/
├── collections/
│   ├── index.ts           # Export all collections
│   ├── customer.collection.ts
│   ├── sale.collection.ts
│   ├── product.collection.ts
│   └── payment.collection.ts
└── electric-client.tsx   # Provider
```

---

## Referencias

- **[QUICK_START.md](references/QUICK_START.md)** - Tutorial paso a paso para migrar Avileo
- **[BEST_PRACTICES.md](references/BEST_PRACTICES.md)** - Buenas prácticas y errores a evitar
- **[ELECTRIC_SQL.md](references/ELECTRIC_SQL.md)** - Configuración completa de ElectricSQL
- **[QUERY_OPERATORS.md](references/QUERY_OPERATORS.md)** - Todos los operadores de query
- **[EXAMPLES.md](references/EXAMPLES.md)** - Ejemplos completos

---

*Para docs completas: tanstack.com/db*
