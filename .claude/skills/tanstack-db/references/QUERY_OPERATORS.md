# TanStack DB - Reference: Query Operators

Complete reference for all query operators available in TanStack DB live queries.

## Comparison Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `eq(a, b)` | Equal to | `eq(todo.completed, false)` |
| `ne(a, b)` | Not equal to | `ne(todo.status, 'archived')` |
| `gt(a, b)` | Greater than | `gt(todo.priority, 5)` |
| `gte(a, b)` | Greater than or equal | `gte(todo.score, 100)` |
| `lt(a, b)` | Less than | `lt(todo.price, 50)` |
| `lte(a, b)` | Less than or equal | `lte(todo.stock, 0)` |
| `like(a, pattern)` | LIKE pattern (case-sensitive) | `like(todo.name, '%urgent%')` |
| `ilike(a, pattern)` | ILIKE pattern (case-insensitive) | `ilike(todo.email, '%@gmail.com')` |
| `inArray(a, [...])` | In array | `inArray(todo.status, ['active', 'pending'])` |
| `isNull(a)` | Is null | `isNull(todo.deletedAt)` |
| `isUndefined(a)` | Is undefined | `isUndefined(todo.assigneeId)` |

## Logical Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `and(...conditions)` | AND all conditions | `and(eq(todo.active, true), gt(todo.priority, 0))` |
| `or(...conditions)` | OR all conditions | `or(eq(status, 'a'), eq(status, 'b'))` |
| `not(condition)` | NOT condition | `not(eq(todo.completed, true))` |

## Aggregate Functions

| Function | Description | Example |
|----------|-------------|---------|
| `count()` | Count of rows | `select({ total: todo.count() })` |
| `sum(column)` | Sum of column | `select({ revenue: order.sum('amount') })` |
| `avg(column)` | Average of column | `select({ avgScore: quiz.avg('score') })` |
| `min(column)` | Minimum value | `select({ minPrice: product.min('price') })` |
| `max(column)` | Maximum value | `select({ maxPriority: todo.max('priority') })` |

## String Functions

| Function | Description | Example |
|----------|-------------|---------|
| `upper(string)` | Uppercase | `upper(todo.name)` |
| `lower(string)` | Lowercase | `lower(todo.email)` |
| `length(string)` | String length | `length(todo.code)` |
| `concat(...strings)` | Concatenate | `concat(user.firstName, ' ', user.lastName)` |
| `coalesce(...values)` | First non-null | `coalesce(todo.alias, todo.name)` |

## Math Functions

| Function | Description | Example |
|----------|-------------|---------|
| `add(a, b)` | Addition | `add(item.price, item.tax)` |
| `subtract(a, b)` | Subtraction | `subtract(stock.initial, stock.sold)` |
| `multiply(a, b)` | Multiplication | `multiply(quantity, unitPrice)` |
| `divide(a, b)` | Division | `divide(total, count)` |

## Query Methods

| Method | Description |
|--------|-------------|
| `.from({ alias: collection })` | Source collection |
| `.where(condition)` | Filter rows |
| `.select(projection)` | Select/projection fields |
| `.join({ alias: collection }, condition, type)` | Join collections |
| `.groupBy(...columns)` | Group by columns |
| `.having(condition)` | Filter groups |
| `.orderBy(column, direction?)` | Sort (asc/desc) |
| `.limit(n)` | Limit results |
| `.offset(n)` | Offset results |
| `.distinct()` | Unique rows |
| `.findOne(condition)` | Single row |

## Join Types

| Type | Description |
|------|-------------|
| `'inner'` | Only matching rows |
| `'left'` | All left + matching right |
| `'right'` | All right + matching left |
| `'full'` | All rows from both |

## Usage Examples

### Basic Filtering

```typescript
const activeTodos = useLiveQuery((q) =>
  q
    .from({ todo: todoCollection })
    .where(({ todo }) => eq(todo.completed, false))
)
```

### Complex WHERE

```typescript
const importantPending = useLiveQuery((q) =>
  q
    .from({ todo: todoCollection })
    .where(({ todo }) =>
      and(
        eq(todo.completed, false),
        or(
          gt(todo.priority, 3),
          like(todo.title, '%urgent%')
        )
      )
    )
)
```

### Aggregation with Group By

```typescript
const statsByStatus = useLiveQuery((q) =>
  q
    .from({ todo: todoCollection })
    .groupBy(({ todo }) => todo.status)
    .select(({ todo }) => ({
      status: todo.status,
      count: todo.count(),
      avgPriority: todo.avg(todo.priority),
    }))
    .having(({ todo }) => gte(todo.count(), 5))
)
```

### Join Two Collections

```typescript
const todosWithLists = useLiveQuery((q) =>
  q
    .from({ todo: todoCollection })
    .join(
      { list: listCollection },
      ({ todo, list }) => eq(todo.listId, list.id),
      'inner'
    )
    .where(({ list }) => eq(list.active, true))
    .select(({ todo, list }) => ({
      id: todo.id,
      title: todo.title,
      listName: list.name,
    }))
)
```

### Pagination

```typescript
const paginatedTodos = useLiveQuery((q, page = 0) =>
  q
    .from({ todo: todoCollection })
    .orderBy(({ todo }) => todo.createdAt, 'desc')
    .limit(20)
    .offset(page * 20)
)
```

### Distinct Results

```typescript
const uniqueCategories = useLiveQuery((q) =>
  q
    .from({ product: productCollection })
    .select(({ product }) => ({ category: product.category }))
    .distinct()
)
```

### Find One

```typescript
const todo = useLiveQuery((q) =>
  q
    .from({ todo: todoCollection })
    .findOne(({ todo }) => eq(todo.id, todoId))
)
```

### String Operations

```typescript
const users = useLiveQuery((q) =>
  q
    .from({ user: userCollection })
    .where(({ user }) =>
      ilike(user.email, '%@company.com')
    )
    .select(({ user }) => ({
      id: user.id,
      name: concat(upper(user.lastName), ', ', user.firstName),
    }))
)
```

### Math Operations

```typescript
const orders = useLiveQuery((q) =>
  q
    .from({ order: orderCollection })
    .select(({ order }) => ({
      id: order.id,
      subtotal: order.amount,
      tax: multiply(order.amount, 0.18),
      total: add(order.amount, multiply(order.amount, 0.18)),
    }))
)
```

## Common Patterns

### Filter by Date Range

```typescript
const recentTodos = useLiveQuery((q) =>
  q
    .from({ todo: todoCollection })
    .where(({ todo }) =>
      and(
        gte(todo.createdAt, startDate),
        lte(todo.createdAt, endDate)
      )
    )
)
```

### Filter Null/Undefined

```typescript
const assignedTodos = useLiveQuery((q) =>
  q
    .from({ todo: todoCollection })
    .where(({ todo }) =>
      and(
        not(isUndefined(todo.assigneeId)),
        isNull(todo.completedAt)
      )
    )
)
```

### Search with Multiple Fields

```typescript
const searchResults = useLiveQuery((q, searchTerm) =>
  q
    .from({ todo: todoCollection })
    .where(({ todo }) =>
      or(
        ilike(todo.title, `%${searchTerm}%`),
        ilike(todo.description, `%${searchTerm}%`)
      )
    )
)
```

### Count with Condition

```typescript
const { data } = useLiveQuery((q) =>
  q
    .from({ todo: todoCollection })
    .select(({ todo }) => ({
      total: todo.count(),
      completed: todo.count(),
    }))
)
```

---

*Reference from TanStack DB docs: https://tanstack.com/db*
