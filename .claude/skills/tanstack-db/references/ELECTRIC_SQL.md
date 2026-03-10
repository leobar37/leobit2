# TanStack DB - Reference: ElectricSQL Integration

Complete guide for integrating TanStack DB with ElectricSQL for real-time PostgreSQL synchronization.

---

## Overview

ElectricSQL provides **real-time bidirectional sync** between PostgreSQL and client applications. When combined with TanStack DB, you get:

- ✅ **Real-time updates** - Changes in Postgres stream to clients instantly
- ✅ **Optimistic mutations** - Instant UI updates with automatic rollback
- ✅ **Sub-millisecond queries** - Differential dataflow (d2ts) for fast queries
- ✅ **Conflict resolution** - Last-write-wins with txid tracking

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PostgreSQL Database                        │
│                                                                 │
│  ┌─────────────┐   Electric Sync    ┌─────────────────────┐   │
│  │  Tables     │◄─────────────────►│  Electric Service    │   │
│  │  (todos,    │                    │  (Satellite)        │   │
│  │   users,    │                    └──────────┬──────────┘   │
│  │   orders)   │                                │               │
│  └─────────────┘                                │               │
│                                                │ HTTPS/WSS     │
└────────────────────────────────────────────────┼───────────────┘
                                                 │
                                                 ▼
┌────────────────────────────────────────────────────────────────┐
│                     Client Application                          │
│                                                                 │
│  ┌─────────────────────┐    ┌────────────────────────────┐   │
│  │  TanStack DB        │    │  TanStack Query           │   │
│  │  Collections        │◄───│  (Cache & Sync)           │   │
│  │  (Electric Adapter) │    └────────────────────────────┘   │
│  └──────────┬──────────┘                                      │
│             │                                                   │
│             ▼                                                   │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Live Queries (useLiveQuery) - React Components          │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

---

## Installation

### Backend (PostgreSQL + Electric)

```bash
# Install ElectricSQL
npm install electric-sql
```

### Frontend

```bash
# Install TanStack DB with Electric adapter
npm install @tanstack/react-db @tanstack/electric-db-collection
```

---

## Quick Start

### 1. Create Electric Collection

```typescript
// collections/todo.collection.ts
import { createCollection } from '@tanstack/react-db'
import { electricCollectionOptions } from '@tanstack/electric-db-collection'
import { z } from 'zod'

const todoSchema = z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean().default(false),
  created_at: z.string().transform(s => new Date(s)),
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
  })
)
```

### 2. Use in React Components

```tsx
import { useLiveQuery, eq } from '@tanstack/react-db'
import { todoCollection } from './collections/todo.collection'

function TodoList() {
  const { data: todos } = useLiveQuery((q) =>
    q
      .from({ todo: todoCollection })
      .where(({ todo }) => eq(todo.completed, false))
      .orderBy(({ todo }) => todo.created_at, 'desc')
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

---

## Advanced Configuration

### With Transaction ID (txid) Tracking

The recommended pattern uses PostgreSQL transaction IDs to prevent optimistic UI flash:

```typescript
const todoCollection = createCollection(
  electricCollectionOptions({
    id: 'todos',
    schema: todoSchema,
    getKey: (todo) => todo.id,
    shapeOptions: {
      url: '/api/electric/shape',
      params: { table: 'todos' },
    },

    // Persistence handlers
    onInsert: async ({ transaction }) => {
      const newItem = transaction.mutations[0].modified
      const response = await api.todos.create(newItem)
      return { txid: response.txid }  // Wait for this txid
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

### Backend: Returning txid

```typescript
// Backend API endpoint (ElysiaJS example)
import { sql } from 'drizzle-orm'

async function createTodo(data: any) {
  let txid!: number

  const result = await db.transaction(async (tx) => {
    // Get txid INSIDE the transaction (critical!)
    const txidResult = await tx.execute(
      sql`SELECT pg_current_xact_id()::xid::text as txid`
    )
    txid = parseInt(txidResult[0].txid, 10)

    // Insert the todo
    const [todo] = await tx.insert(todosTable).values(data).returning()
    return { todo, txid }
  })

  return result
}
```

### Using awaitMatch (Without txid)

For backends that can't return txid:

```typescript
import { isChangeMessage } from '@tanstack/electric-db-collection'

const todoCollection = createCollection(
  electricCollectionOptions({
    id: 'todos',
    getKey: (todo) => todo.id,
    shapeOptions: {
      url: '/api/electric/shape',
      params: { table: 'todos' },
    },

    onInsert: async ({ transaction, collection }) => {
      const newItem = transaction.mutations[0].modified
      await api.todos.create(newItem)

      // Wait for Electric to sync it back
      await collection.utils.awaitMatch(
        (msg) =>
          isChangeMessage(msg) &&
          msg.headers.operation === 'insert' &&
          msg.value.text === newItem.text,
        5000  // 5 second timeout
      )
    },
  })
)
```

---

## Proxy Setup

Electric typically runs behind a proxy to handle auth:

```typescript
// api/electric/shape.ts (TanStack Start example)
import { createServerFileRoute } from '@tanstack/react-start/server'
import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from 'electric-sql/client'

const ELECTRIC_URL = process.env.ELECTRIC_URL!

export const ServerRoute = createServerFileRoute('/api/electric/shape').methods({
  GET: async ({ request }) => {
    const url = new URL(request.url)
    const electricUrl = new URL(ELECTRIC_URL)

    // Forward Electric protocol params
    ELECTRIC_PROTOCOL_QUERY_PARAMS.forEach((key) => {
      if (url.searchParams.has(key)) {
        electricUrl.searchParams.set(key, url.searchParams.get(key)!)
      }
    })

    // Set table to sync
    electricUrl.searchParams.set('table', url.searchParams.get('table') || 'todos')

    // Add auth token
    electricUrl.searchParams.set('token', await getAuthToken(request))

    const response = await fetch(electricUrl)
    const headers = new Headers(response.headers)
    headers.delete('content-encoding')
    headers.delete('content-length')

    return new Response(response.body, {
      status: response.status,
      headers,
    })
  },
})
```

---

## Real-Time Dashboard Example

```tsx
import { useLiveQuery, eq, sum, count } from '@tanstack/react-db'
import { orderCollection } from './collections/order.collection'

function Dashboard() {
  // Real-time stats - updates instantly when database changes
  const { data: stats } = useLiveQuery((q) =>
    q
      .from({ order: orderCollection })
      .select(({ order }) => ({
        totalOrders: order.count(),
        totalRevenue: order.sum('amount'),
        avgOrder: order.avg('amount'),
      }))
  )

  // Real-time order list
  const { data: recentOrders } = useLiveQuery((q) =>
    q
      .from({ order: orderCollection })
      .orderBy(({ order }) => order.createdAt, 'desc')
      .limit(10)
  )

  return (
    <div className="dashboard">
      <StatsGrid stats={stats} />
      <OrderList orders={recentOrders} />
    </div>
  )
}
```

---

## Debugging

### Enable Debug Logging

```javascript
localStorage.debug = 'ts/db:electric'
```

This shows:
- When mutations wait for txid
- When txids arrive from Electric
- Sync errors

### Common Issue: txid Timeout

**Problem**: `awaitTxId` hangs forever even though data is in database.

**Cause**: txid queried outside the mutation transaction.

```typescript
// ❌ WRONG - txid in separate transaction
async function createTodo(data) {
  const txid = await generateTxId()  // Different transaction!
  await sql`INSERT INTO todos...`
  return { txid }
}

// ✅ CORRECT - txid in SAME transaction
async function createTodo(data) {
  const result = await sql.begin(async (tx) => {
    const txid = await generateTxId(tx)  // Same transaction!
    await tx`INSERT INTO todos...`
    return { txid }
  })
  return { txid: result.txid }
}
```

---

## Comparison: Custom Sync vs ElectricSQL

| Aspect | Custom Sync (Current) | ElectricSQL |
|--------|----------------------|-------------|
| **Latency** | 30 seconds | Real-time (<100ms) |
| **Updates** | Polling | Push via WebSocket |
| **Conflict Resolution** | Last-write-wins | Last-write-wins with txid |
| **Offline Support** | Full offline queue | Limited (depends on satellite) |
| **Backend** | Any REST API | PostgreSQL required |
| **Setup Complexity** | Medium | Higher |

---

## Migration from Current Implementation

### Current Pattern (Custom Sync)

```typescript
// lib/db/collections.ts
import { isOnline, syncClient } from '~/lib/sync'

export async function createCustomer(data) {
  if (!isOnline()) {
    await syncClient.enqueueOperation({
      entity: 'customers',
      operation: 'insert',
      entityId: createSyncId(),
      data,
    })
    return { ...data, syncStatus: 'pending' }
  }
  
  const response = await api.customers.post(data)
  return response.data
}
```

### New Pattern (ElectricSQL)

```typescript
// collections/customer.collection.ts
import { createCollection } from '@tanstack/react-db'
import { electricCollectionOptions } from '@tanstack/electric-db-collection'

export const customerCollection = createCollection(
  electricCollectionOptions({
    id: 'customers',
    getKey: (c) => c.id,
    shapeOptions: {
      url: '/api/electric/shape',
      params: { table: 'customers' },
    },
    onInsert: async ({ transaction }) => {
      const newCustomer = transaction.mutations[0].modified
      const response = await api.customers.create(newCustomer)
      return { txid: response.txid }
    },
  })
)

// In components - automatic real-time sync!
function CustomerList() {
  const { data: customers } = useLiveQuery((q) =>
    q.from({ customer: customerCollection })
  )
  // ...
}
```

---

## Benefits for Avileo

| Current Problem | ElectricSQL Solution |
|----------------|---------------------|
| 30s sync delay | Real-time updates |
| Manual invalidation | Automatic on DB change |
| Complex offline queue | Built-in offline support |
| Optimistic flash | txid prevents UI flicker |
| Limited conflict detection | Precise txid matching |

---

## When NOT to Use ElectricSQL

- PostgreSQL is not your primary database
- You need complex conflict resolution (beyond last-write-wins)
- Your backend is not under your control
- You need full offline-first with complex queue logic

---

*Reference from TanStack DB Electric Collection docs*
