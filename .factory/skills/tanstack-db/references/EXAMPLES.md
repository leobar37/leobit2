# TanStack DB - Reference: Examples

Complete code examples for common TanStack DB patterns.

---

## Example 1: Todo App with Query Collection

### Project Structure

```
src/
├── collections/
│   ├── index.ts
│   ├── todo.collection.ts
│   └── list.collection.ts
├── schemas/
│   ├── todo.schema.ts
│   └── index.ts
├── App.tsx
└── main.tsx
```

### Schema Definition

```typescript
// schemas/todo.schema.ts
import { z } from 'zod'

export const todoSchema = z.object({
  id: z.string(),
  text: z.string().min(1, 'Text is required'),
  completed: z.boolean().default(false),
  priority: z.number().min(0).max(5).default(0),
  listId: z.string().nullable(),
  createdAt: z.string().transform(s => new Date(s)),
  updatedAt: z.string().transform(s => new Date(s)),
})

export type Todo = z.infer<typeof todoSchema>
export type CreateTodoInput = z.input<typeof todoSchema>
export type TodoOutput = z.output<typeof todoSchema>
```

### Collection Definition

```typescript
// collections/todo.collection.ts
import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { todoSchema } from '../schemas/todo.schema'

const API_BASE = '/api/todos'

export const todoCollection = createCollection(
  queryCollectionOptions({
    id: 'todos',
    schema: todoSchema,
    queryKey: ['todos'],
    queryFn: async () => {
      const res = await fetch(API_BASE)
      if (!res.ok) throw new Error('Failed to fetch todos')
      return res.json()
    },
    getKey: (todo) => todo.id,

    // Persistence handlers
    onInsert: async ({ transaction }) => {
      const items = transaction.mutations.map(m => m.modified)
      await Promise.all(items.map(item => 
        fetch(API_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        })
      ))
    },

    onUpdate: async ({ transaction }) => {
      const { original, changes } = transaction.mutations[0]
      await fetch(`${API_BASE}/${original.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      })
    },

    onDelete: async ({ transaction }) => {
      const { original } = transaction.mutations[0]
      await fetch(`${API_BASE}/${original.id}`, {
        method: 'DELETE',
      })
    },
  })
)
```

### React Components

```tsx
// App.tsx
import { useLiveQuery, eq, or, and, not } from '@tanstack/react-db'
import { useState } from 'react'
import { todoCollection } from './collections/todo.collection'

function TodoList() {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  
  const { data: todos, state, isLoading, isError } = useLiveQuery((q) => {
    let query = q.from({ todo: todoCollection })
    
    if (filter === 'active') {
      query = query.where(({ todo }) => eq(todo.completed, false))
    } else if (filter === 'completed') {
      query = query.where(({ todo }) => eq(todo.completed, true))
    }
    
    return query.orderBy(({ todo }) => todo.createdAt, 'desc')
  }, [filter])

  if (isLoading) return <div>Loading...</div>
  if (isError) return <div>Error loading todos</div>

  return (
    <div>
      <FilterTabs filter={filter} onChange={setFilter} />
      <ul>
        {todos?.map(todo => (
          <TodoItem key={todo.id} todo={todo} />
        ))}
      </ul>
    </div>
  )
}

function TodoItem({ todo }: { todo: any }) {
  const toggleComplete = () => {
    todoCollection.update(todo.id, (draft) => {
      draft.completed = !draft.completed
    })
  }

  const deleteTodo = () => {
    todoCollection.delete(todo.id)
  }

  return (
    <li className={todo.completed ? 'completed' : ''}>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={toggleComplete}
      />
      <span>{todo.text}</span>
      <button onClick={deleteTodo}>Delete</button>
    </li>
  )
}

function AddTodo() {
  const [text, setText] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return

    todoCollection.insert({
      id: crypto.randomUUID(),
      text: text.trim(),
      completed: false,
      priority: 0,
      listId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    setText('')
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What needs to be done?"
      />
      <button type="submit">Add</button>
    </form>
  )
}
```

---

## Example 2: Real-time Dashboard with ElectricSQL

### Collection Setup

```typescript
// collections/order.collection.ts
import { createCollection } from '@tanstack/react-db'
import { electricCollectionOptions } from '@tanstack/electric-db-collection'
import { orderSchema } from '../schemas/order.schema'

export const orderCollection = createCollection(
  electricCollectionOptions({
    id: 'orders',
    schema: orderSchema,
    getKey: (order) => order.id,
    
    shapeOptions: {
      url: '/api/electric/shape',
      params: { table: 'orders' },
    },

    // Wait for txid to prevent optimistic flash
    onInsert: async ({ transaction }) => {
      const newOrder = transaction.mutations[0].modified
      const response = await api.orders.create(newOrder)
      return { txid: response.txid }
    },

    onUpdate: async ({ transaction }) => {
      const { original, changes } = transaction.mutations[0]
      const response = await api.orders.update(original.id, changes)
      return { txid: response.txid }
    },

    onDelete: async ({ transaction }) => {
      const { original } = transaction.mutations[0]
      await api.orders.delete(original.id)
    },
  })
)
```

### Real-time Dashboard

```tsx
// Dashboard.tsx
import { useLiveQuery, eq, sum, count } from '@tanstack/react-db'
import { orderCollection } from '../collections/order.collection'

function Dashboard() {
  return (
    <div className="dashboard">
      <StatsCards />
      <RecentOrders />
      <OrdersByStatus />
    </div>
  )
}

function StatsCards() {
  const { data: stats } = useLiveQuery((q) =>
    q
      .from({ order: orderCollection })
      .select(({ order }) => ({
        totalOrders: order.count(),
        totalRevenue: order.sum('amount'),
        avgOrderValue: order.avg('amount'),
      }))
  )

  return (
    <div className="stats-grid">
      <StatCard title="Total Orders" value={stats?.totalOrders ?? 0} />
      <StatCard title="Revenue" value={`$${stats?.totalRevenue ?? 0}`} />
      <StatCard title="Avg Order" value={`$${stats?.avgOrderValue ?? 0}`} />
    </div>
  )
}

function OrdersByStatus() {
  const { data: byStatus } = useLiveQuery((q) =>
    q
      .from({ order: orderCollection })
      .groupBy(({ order }) => order.status)
      .select(({ order }) => ({
        status: order.status,
        count: order.count(),
        total: order.sum('amount'),
      }))
      .orderBy(({ count }, 'desc')
  )

  return (
    <div className="chart">
      <h3>Orders by Status</h3>
      {byStatus?.map(({ status, count, total }) => (
        <div key={status} className="bar">
          <span>{status}</span>
          <div style={{ width: `${(count / (byStatus[0]?.count || 1)) * 100}%` }} />
          <span>{count}</span>
        </div>
      ))}
    </div>
  )
}
```

---

## Example 3: Complex Mutations with Transaction

```typescript
// actions/order.actions.ts
import { createOptimisticAction, createTransaction } from '@tanstack/react-db'
import { orderCollection } from '../collections/order.collection'
import { orderItemCollection } from '../collections/order-item.collection'

// Custom action for complex multi-collection mutation
export const createOrderAction = createOptimisticAction({
  onMutate: ({ items, customerId, paymentMethod }) => {
    const orderId = crypto.randomUUID()
    const now = new Date().toISOString()

    // Create order
    orderCollection.insert({
      id: orderId,
      customerId,
      status: 'pending',
      paymentMethod,
      total: items.reduce((sum, item) => sum + item.price * item.qty, 0),
      createdAt: now,
      updatedAt: now,
    })

    // Create order items
    items.forEach(item => {
      orderItemCollection.insert({
        id: crypto.randomUUID(),
        orderId,
        productId: item.productId,
        quantity: item.qty,
        unitPrice: item.price,
        createdAt: now,
      })
    })

    return { orderId }
  },

  mutationFn: async ({ items, customerId, paymentMethod }) => {
    const response = await api.orders.create({
      customerId,
      paymentMethod,
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.qty,
        unitPrice: item.price,
      })),
    })
    return response
  },

  onError: ({ orderId }) => {
    // Rollback: delete the optimistically created order
    orderCollection.delete(orderId)
  },
})

// Manual transaction for batch operations
export async function cancelOrder(orderId: string, reason: string) {
  const txn = createTransaction()

  try {
    // Get order items to restore inventory
    const items = orderItemCollection
      .getAll()
      .filter(item => item.orderId === orderId)

    // Update order status
    orderCollection.update(
      orderId,
      { metadata: { reason } },
      (draft) => {
        draft.status = 'cancelled'
        draft.cancelledAt = new Date().toISOString()
      },
      { transaction: txn }
    )

    // Restore inventory for each item
    items.forEach(item => {
      // inventoryCollection.update(...)
    })

    await txn.commit()
  } catch (error) {
    await txn.rollback()
    throw error
  }
}
```

---

## Example 4: Offline-First with Queue

```typescript
// lib/offline.ts
import { startOfflineExecutor, IndexedDBAdapter, WebOnlineDetector } from '@tanstack/offline-transactions'
import { todoCollection } from '../collections/todo.collection'

const executor = startOfflineExecutor({
  collections: { todos: todoCollection },
  
  mutationFns: {
    createTodo: async (input: { text: string }) => {
      const res = await fetch('/api/todos', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      return res.json()
    },

    updateTodo: async (input: { id: string; changes: any }) => {
      const res = await fetch(`/api/todos/${input.id}`, {
        method: 'PATCH',
        body: JSON.stringify(input.changes),
      })
      return res.json()
    },

    deleteTodo: async (id: string) => {
      await fetch(`/api/todos/${id}`, { method: 'DELETE' })
    },
  },

  storage: new IndexedDBAdapter(),
  onlineDetector: new WebOnlineDetector(),
  maxConcurrency: 1,
})

// Usage in component
function AddTodoOffline() {
  const handleAdd = async (text: string) => {
    try {
      // Works offline - queued and executed when online
      await executor.execute('createTodo', { text })
    } catch (error) {
      console.error('Failed to add todo:', error)
    }
  }

  return <button onClick={() => handleAdd('New todo')}>Add</button>
}
```

---

## Example 5: Schema with Type Transformation

```typescript
// schemas/user.schema.ts
import { z } from 'zod'

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  createdAt: z.string().transform(s => new Date(s)),      // string → Date
  updatedAt: z.string().transform(s => new Date(s)),      // string → Date
  settings: z.string().transform(s => JSON.parse(s)),     // JSON string → object
  roles: z.array(z.string()).default([]),                  // with default
  isActive: z.boolean().default(true),                    // with default
})

// Input: simpler types (from API)
type UserInput = z.input<typeof userSchema>
// {
//   id: string
//   email: string
//   name: string
//   createdAt: string
//   updatedAt: string
//   settings: string
//   roles?: string[]
//   isActive?: boolean
// }

// Output: richer types (in app)
type UserOutput = z.output<typeof userSchema>
// {
//   id: string
//   email: string
//   name: string
//   createdAt: Date
//   updatedAt: Date
//   settings: object
//   roles: string[]
//   isActive: boolean
// }
```

### Usage

```typescript
// Collection uses output type
const userCollection = createCollection(
  queryCollectionOptions({
    schema: userSchema,
    // ...
  })
)

// Insert accepts input type (simpler)
userCollection.insert({
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  settings: '{"theme":"dark"}',
  // roles defaults to []
  // isActive defaults to true
})

// Get returns output type (rich)
const user = userCollection.get('1')
console.log(user.createdAt.getFullYear())  // Date methods available!
console.log(user.settings.theme)           // Object access!
```

---

## Example 6: Multi-Collection Join Query

```typescript
// collections/index.ts
export const userCollection = createCollection(...)
export const postCollection = createCollection(...)
export const commentCollection = createCollection(...)
export const likeCollection = createCollection(...)

// Component with complex joins
function UserActivityFeed({ userId }: { userId: string }) {
  const { data: feed } = useLiveQuery((q) =>
    q
      // Start from user's posts
      .from({ post: postCollection })
      .where(({ post }) => eq(post.userId, userId))
      
      // Join with comment counts
      .join(
        { comment: commentCollection },
        ({ post, comment }) => eq(post.id, comment.postId),
        'left'
      )
      
      // Join with like counts
      .join(
        { like: likeCollection },
        ({ post, like }) => eq(post.id, like.postId),
        'left'
      )
      
      // Group by post
      .groupBy(({ post }) => post.id)
      
      // Select with aggregations
      .select(({ post, comment, like }) => ({
        id: post.id,
        title: post.title,
        commentCount: comment.count(),
        likeCount: like.count(),
        latestCommentAt: comment.max('createdAt'),
      }))
      
      // Filter posts with engagement
      .having(({ comment, like }) =>
        or(
          gte(comment.count(), 1),
          gte(like.count(), 1)
        )
      )
      
      // Sort by engagement
      .orderBy(({ commentCount, likeCount }, 'desc')
  )

  return (
    <div>
      {feed?.map(item => (
        <PostCard
          key={item.id}
          title={item.title}
          comments={item.commentCount}
          likes={item.likeCount}
        />
      ))}
    </div>
  )
}
```

---

## Example 7: Infinite Scroll Pagination

```typescript
function InfiniteTodoList() {
  const [page, setPage] = useState(0)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useLiveInfiniteQuery((q, pageParam = 0) =>
    q
      .from({ todo: todoCollection })
      .orderBy(({ todo }) => todo.createdAt, 'desc')
      .limit(20)
      .offset(pageParam * 20)
  )

  const allTodos = data?.pages.flatMap(page => page) ?? []

  return (
    <div>
      <ul>
        {allTodos.map(todo => (
          <TodoItem key={todo.id} todo={todo} />
        ))}
      </ul>
      
      {hasNextPage && (
        <button
          onClick={() => {
            setPage(p => p + 1)
            fetchNextPage()
          }}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  )
}
```

---

## Example 8: React Suspense Pattern

```tsx
// Error Boundary
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }
  
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  
  render() {
    if (this.state.hasError) {
      return <div>Something went wrong</div>
    }
    return this.props.children
  }
}

// Todos with Suspense
function TodosPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Skeleton />}>
        <Todos />
      </Suspense>
    </ErrorBoundary>
  )
}

function Todos() {
  // Always defined - suspends until ready
  const { data } = useLiveSuspenseQuery((q) =>
    q.from({ todo: todoCollection })
  )

  return (
    <ul>
      {data.map(todo => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  )
}

function Skeleton() {
  return (
    <div className="skeleton">
      <div className="skeleton-line" />
      <div className="skeleton-line" />
      <div className="skeleton-line" />
    </div>
  )
}
```

---

*Examples adapted from TanStack DB documentation and examples*
