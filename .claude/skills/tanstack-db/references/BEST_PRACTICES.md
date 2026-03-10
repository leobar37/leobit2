# TanStack DB - Best Practices & Anti-Patterns

> Guía de buenas prácticas y errores comunes a evitar en Avileo.

---

## ✅ Best Practices

### 1. Siempre usa operadores de query, NO JavaScript

```typescript
// ✅ GOOD - Query operators
const { data } = useLiveQuery(q =>
  q.from({ c: customerCollection })
    .where(({ c }) => eq(c.businessId, businessId))
    .orderBy(({ c }) => c.name, 'asc')
)

// ❌ BAD - JS filter (re-runs from scratch)
const { data } = useLiveQuery(q => {
  const all = q.from({ c: customerCollection })
  return all.filter(c => c.businessId === businessId)
})
```

### 2. Siempre usa eq() en condiciones de JOIN

```typescript
// ✅ GOOD - solo eq() funciona en joins
q.from({ o: orderCollection })
  .join({ c: customerCollection }, ({ o, c }) => eq(o.customerId, c.id))

// ❌ BAD - otros operadores no funcionan en joins
q.from({ o: orderCollection })
  .join({ c: customerCollection }, ({ o, c }) => gt(o.amount, 100))
```

### 3. Define handlers siempre para mutations

```typescript
// ✅ GOOD - todos los handlers definidos
const collection = createCollection(electricCollectionOptions({
  onInsert: async ({ transaction }) => { /* ... */ },
  onUpdate: async ({ transaction }) => { /* ... */ },
  onDelete: async ({ transaction }) => { /* ... */ },
}))

// ❌ BAD - sin handlers, las mutations fallarán
const collection = createCollection(electricCollectionOptions({
  // Faltan onInsert, onUpdate, onDelete
}))
```

### 4. Obtén txid DENTRO de la transacción

```typescript
// ✅ GOOD - txid dentro de la transacción
async function createCustomer(data: any) {
  const result = await db.transaction(async (tx) => {
    const txidResult = await tx.execute(
      sql`SELECT pg_current_xact_id()::xid::text as txid`
    )
    const txid = parseInt(txidResult[0].txid, 10)
    
    const [customer] = await tx.insert(customersTable).values(data).returning()
    return { customer, txid }
  })
  return result
}

// ❌ BAD - txid fuera de la transacción
async function createCustomer(data: any) {
  const txid = await generateTxId() // ¡Fuera de la transacción!
  await db.insert(customersTable).values(data)
  return { txid }
}
```

### 5. Usa dependency array para valores externos

```typescript
// ✅ GOOD - incluye dependencias
function CustomerList({ businessId }: { businessId: string }) {
  const { data } = useLiveQuery(
    q => q.from({ c: customerCollection })
      .where(({ c }) => eq(c.businessId, businessId)),
    [businessId]
  )
}

// ❌ BAD - sin dependencias, datos stale
function CustomerList({ businessId }: { businessId: string }) {
  const { data } = useLiveQuery(
    q => q.from({ c: customerCollection })
      .where(({ c }) => eq(c.businessId, businessId))
  )
}
```

### 6. orderBy antes de limit/offset

```typescript
// ✅ GOOD - orden determinístico
q.from({ c: customerCollection })
  .orderBy(({ c }) => c.createdAt, 'desc')
  .limit(20)
  .offset(page * 20)

// ❌ BAD - resultados no determinísticos
q.from({ c: customerCollection })
  .limit(20)
  .offset(page * 20)
```

### 7. select() antes de distinct()

```typescript
// ✅ GOOD
q.from({ c: customerCollection })
  .select(({ c }) => ({ status: c.status }))
  .distinct()

// ❌ BAD - distintct sin select
q.from({ c: customerCollection })
  .distinct()
```

### 8. groupBy antes de having()

```typescript
// ✅ GOOD
q.from({ o: orderCollection })
  .groupBy(({ o }) => o.status)
  .select(({ o }) => ({ status: o.status, count: o.count() }))
  .having(({ o }) => gte(o.count(), 5))

// ❌ BAD - having sin groupBy
q.from({ o: orderCollection })
  .having(({ o }) => gte(o.count(), 5))
```

---

## ❌ Anti-Patterns (NO HACER)

### 1. NO uses update() con objeto

```typescript
// ❌ WRONG
customerCollection.update(id, { name: 'Nuevo' })

// ✅ CORRECT - Immer-style
customerCollection.update(id, (draft) => {
  draft.name = 'Nuevo'
})
```

### 2. NO uses === en where

```typescript
// ❌ WRONG - JavaScript === no funciona
.where(({ c }) => c.active === true)

// ✅ CORRECT - usa operador
.where(({ c }) => eq(c.active, true))
```

### 3. NO crees nuevas instancias de collection en loaders

```typescript
// ❌ WRONG - nueva instancia en cada navegación
loader: async () => {
  const collection = createCollection(queryCollectionOptions({ ... }))
  await collection.preload()
  return collection
}

// ✅ CORRECT - reuse existente
// collections/customer.ts
export const customerCollection = createCollection(...)

// loader
loader: async () => {
  await customerCollection.preload()
}
```

### 4. NO olvides ssr: false en rutas

```typescript
// ❌ WRONG - SSR intentará acceder a browser APIs
export const Route = createFileRoute('/customers')({
  component: CustomerList,
})

// ✅ CORRECT
export const Route = createFileRoute('/customers')({
  component: CustomerList,
  ssr: false,  // Collections son client-side
})
```

### 5. NO uses async schema validation

```typescript
// ❌ WRONG - async validation no funciona
const schema = z.object({
  email: z.string().refine(async (val) => {
    const exists = await checkEmail(val) // ¡No funciona!
    return !exists
  })
})

// ✅ CORRECT - solo sync validation
const schema = z.object({
  email: z.string().email()
})
```

### 6. NO retornes datos parciales en queryFn

```typescript
// ❌ WRONG - retorna solo activos, borra los demás
queryFn: async () => {
  const all = await fetchAll()
  return all.filter(a => a.active) // ¡Borra los inactivos!
}

// ✅ CORRECT - retorna todo, filtra en query
queryFn: async () => fetchAll()
```

### 7. NO modifiques primary key

```typescript
// ❌ WRONG - no se puede cambiar PK
collection.update(id, (draft) => {
  draft.id = 'nuevo-id'
})

// ✅ CORRECT - delete + insert
collection.delete(id)
collection.insert({ id: 'nuevo-id', ... })
```

### 8. NO insertes duplicados

```typescript
// ❌ WRONG - puede fallar si ya existe
collection.insert({ id: 'existing-id', name: 'Nuevo' })

// ✅ CORRECT - check primero
const existing = collection.get(id)
if (existing) {
  collection.update(id, (d) => { d.name = 'Nuevo' })
} else {
  collection.insert({ id, name: 'Nuevo' })
}
```

### 9. NO hagas mutate después de commit

```typescript
// ❌ WRONG - transacción ya committed
const txn = createTransaction()
collection.insert({ id: '1' }, { transaction: txn })
await txn.commit()
collection.insert({ id: '2' }, { transaction: txn }) // ¡Error!

// ✅ CORRECT - nueva transacción
const txn = createTransaction()
collection.insert({ id: '1' }, { transaction: txn })
await txn.commit()
```

### 10. NO almacenes API keys en client

```typescript
// ❌ WRONG - expuesta al cliente
shapeOptions: {
  url: 'https://api.electric.sql?api_key=secret'
}

// ✅ CORRECT - usa proxy server
shapeOptions: {
  url: '/api/electric/shape' // Tu proxy con auth
}
```

---

## 📋 Checklist antes de commit

- [ ] ¿Uso operadores de query (eq, gt, etc.) en lugar de JS?
- [ ] ¿Uso eq() en condiciones de JOIN?
- [ ] ¿txid se obtiene DENTRO de la transacción?
- [ ] ¿Todos los handlers (onInsert, onUpdate, onDelete) están definidos?
- [ ] ¿Dependency array incluye valores externos?
- [ ] ¿Uso orderBy antes de limit/offset?
- [ ] ¿No uso update() con objeto (solo función)?
- [ ] ¿No uso === en where (solo eq)?
- [ ] ¿ssr: false en rutas con collections?
- [ ] ¿No hay async en schema validation?

---

*Errores comunes basados en failure modes de TanStack DB.*
