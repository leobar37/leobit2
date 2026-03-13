# PGlite + Electric + Drizzle Examples

> **Data flows, decision trees, and architectural examples**

## Example 1: Creating a Sale (Online Mode)

### User Story
User creates a sale with 3 items and makes a partial payment while online.

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  TIMELINE                                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  T+0ms   User clicks "Create Sale"                             │
│          ↓                                                      │
│          POST /api/sales {                                      │
│            customerId: "cust-123",                              │
│            items: [...],                                        │
│            total: 150.00                                        │
│          }                                                      │
│                                                                 │
│  T+50ms  Backend receives request                               │
│          ↓                                                      │
│          Transaction BEGIN                                       │
│            INSERT INTO sales (...)                              │
│            INSERT INTO sale_items (3 rows)                      │
│            INSERT INTO payments (...)                           │
│          Transaction COMMIT                                     │
│          ↓                                                      │
│          Response: { id: "sale-456", ... }                      │
│                                                                 │
│  T+100ms Backend returns 200 OK                                 │
│          UI shows success message                               │
│                                                                 │
│  T+150ms Electric detects change in Postgres                    │
│          (via logical replication)                              │
│          ↓                                                      │
│          Electric publishes change to subscribers               │
│                                                                 │
│  T+200ms Client receives update via WebSocket                   │
│          ↓                                                      │
│          PGlite applies INSERT to local sales table             │
│          PGlite applies INSERTs to sale_items                   │
│          PGlite applies INSERT to payments                      │
│          ↓                                                      │
│          useLiveQuery re-runs automatically                     │
│          ↓                                                      │
│          UI updates with new sale (already visible)             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Points
- Write goes through API (validation, business logic)
- Read sync is automatic via Electric
- UI shows optimistic update or waits for confirmation
- Local PGlite always has latest data

---

## Example 2: Creating a Sale (Offline Mode)

### User Story
User creates a sale while on the road with no connection.

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  TIMELINE                                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  T+0s    User clicks "Create Sale"                             │
│          ↓                                                      │
│          Check: navigator.onLine?                               │
│          Result: false (offline)                                │
│          ↓                                                      │
│          Show "Creating..." state                               │
│          ↓                                                      │
│          POST /api/sales { ... }                               │
│          ↓                                                      │
│          fetch() fails with "Network Error"                     │
│          ↓                                                      │
│          Save to IndexedDB:                                     │
│          {                                                      │
│            id: "pending-789",                                   │
│            endpoint: "/api/sales",                              │
│            method: "POST",                                      │
│            body: { customerId, items, total },                  │
│            attempts: 0,                                         │
│            createdAt: Date.now()                                │
│          }                                                      │
│          ↓                                                      │
│          UI shows "Pending - Will sync when online"             │
│          Sale appears in list with "pending" badge              │
│                                                                 │
│  +5min   Connection restored (user enters wifi zone)            │
│          ↓                                                      │
│          window 'online' event fires                            │
│          ↓                                                      │
│          Process queue:                                         │
│          - Read pending writes from IndexedDB                   │
│          - POST /api/sales (retry)                              │
│          - Success! Remove from IndexedDB                       │
│          ↓                                                      │
│          Electric detects change in Postgres                    │
│          ↓                                                      │
│          Syncs to client, UI updates                            │
│          Badge changes from "pending" to synced                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Decision Tree

```
User Action (Create/Update/Delete)
    ↓
Is Online?
    ↓ Yes                    ↓ No
    ↓                        ↓
Call API                   Queue in IndexedDB
    ↓                        ↓
Success?                   Show "Pending" UI
    ↓                        ↓
Yes → Done                 Wait for connection
    ↓                        ↓
No → Queue it              On 'online' event:
    ↓                        Process queue
Show retry UI              ↓
                           Sync via Electric
                           ↓
                           UI updates
```

---

## Example 3: Conflict Resolution

### Scenario
Two users (A and B) edit the same customer simultaneously.

### Timeline

```
┌─────────────────────────────────────────────────────────────────┐
│  CONFLICT SCENARIO                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User A (Offline)          │  User B (Online)                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                            │                                     │
│  1. Changes customer       │  1. Changes same customer          │
│     phone number           │     address                        │
│     (offline)              │     (online)                       │
│                            │                                     │
│  2. Saves locally          │  2. POST /api/customers/123        │
│                            │     → Success                      │
│                            │                                     │
│  3. Queue write            │  3. Electric syncs to all          │
│                            │     clients                        │
│                            │                                     │
│  4. Comes online           │  4. User A receives update         │
│                            │     (different field)              │
│  5. Queue processes        │                                     │
│     POST /api/customers    │                                     │
│     → Success              │                                     │
│                            │                                     │
│  Result: Both changes saved (different fields)                  │
│  Last-write-wins on timestamp                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Conflict Types

| Scenario | Resolution |
|----------|-----------|
| Different fields | ✅ Both changes saved |
| Same field (A before B) | ✅ B wins (last write) |
| Same field (A offline, B online) | ✅ A wins if newer timestamp |
| Delete vs Update | ⚠️ Depends on business logic |

---

## Example 4: Multi-Table Transaction

### User Story
Create a sale with items and update inventory atomically.

### Flow

```
User: "Create Sale"
    ↓
Frontend Validation
    ↓
POST /api/sales/commit
    ↓
Backend Transaction BEGIN
    ↓
┌─────────────────────────────┐
│ INSERT INTO sales (...)     │
│                             │
│ INSERT INTO sale_items      │
│   (item 1)                  │
│   (item 2)                  │
│   (item 3)                  │
│                             │
│ UPDATE inventory            │
│   SET quantity = quantity - 3│
│   WHERE product_id = 'X'    │
│                             │
│ INSERT INTO payments (...)  │
└─────────────────────────────┘
    ↓
COMMIT (all succeed or all fail)
    ↓
Response: { saleId: "sale-789", ... }
    ↓
Electric detects 4 changes:
  - 1 sales row
  - 3 sale_items rows
  - 1 inventory row
  - 1 payments row
    ↓
Syncs to client as atomic batch
    ↓
UI updates with complete sale
```

### Why This Pattern?
- Atomicity: All or nothing
- Consistency: Inventory matches sales
- Electric syncs as single transaction
- Client sees consistent state

---

## Example 5: Shape Configuration

### Scenario
App needs to sync only this business's data.

### Shape Definition

```
Business: "Pollos El Buen Sabor"
Business ID: "biz-abc-123"

Shapes to Sync:
├── customers
│   └── WHERE business_id = 'biz-abc-123'
│
├── sales
│   └── WHERE business_id = 'biz-abc-123'
│
├── sale_items (via sale join)
│   └── WHERE sale.business_id = 'biz-abc-123'
│
├── products (read-only)
│   └── WHERE business_id = 'biz-abc-123'
│
├── payments
│   └── WHERE business_id = 'biz-abc-123'
│
└── suppliers
    └── WHERE business_id = 'biz-abc-123'

NOT Synced:
├── users (auth handled separately)
├── audit_logs (server-only)
├── other_businesses' data
└── admin_settings (unless relevant)
```

### Performance Considerations

| Table | Rows | Sync Strategy |
|-------|------|---------------|
| customers | ~500 | Full sync |
| sales (last 30 days) | ~1000 | Time-filtered |
| sale_items | ~3000 | Via parent |
| products | ~50 | Full sync |
| payments | ~1000 | Time-filtered |

---

## Example 6: Offline-First UX States

### UI States for Pending Actions

```
┌──────────────────────────────────────────────────────────────┐
│  Sale List Item                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  🟢 Synced (online, synced)                                  │
│  ┌────────────────────────────────────────┐                  │
│  │ Sale #123                    S/. 150.00│                  │
│  │ Client: Juan Perez                     │                  │
│  └────────────────────────────────────────┘                  │
│                                                              │
│  🟡 Pending (offline, queued)                                │
│  ┌────────────────────────────────────────┐                  │
│  │ Sale #124 (Pendiente)        S/. 200.00│                  │
│  │ Client: Maria Garcia                   │                  │
│  │ ⏳ Se sincronizará cuando haya conexión│                  │
│  └────────────────────────────────────────┘                  │
│                                                              │
│  🔴 Error (failed after retries)                             │
│  ┌────────────────────────────────────────┐                  │
│  │ Sale #125 (Error)            S/. 175.00│                  │
│  │ Client: Pedro Lopez                    │                  │
│  │ ❌ Error: Cliente no existe            │                  │
│  │ [Reintentar]  [Cancelar]               │                  │
│  └────────────────────────────────────────┘                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Global Sync Status

```
┌──────────────────────────────────┐
│  Sync Status Bar                 │
├──────────────────────────────────┤
│                                  │
│  🟢 Sincronizado                 │
│  última vez: hace 2 minutos      │
│                                  │
│  ─────────────────────────────   │
│                                  │
│  🟡 Sincronizando...             │
│  3 cambios pendientes            │
│                                  │
│  ─────────────────────────────   │
│                                  │
│  🔴 Sin conexión                 │
│  5 cambios pendientes            │
│  Se sincronizará automáticamente │
│                                  │
└──────────────────────────────────┘
```

---

## Example 7: Data Migration Strategy

### From TanStack DB to PGlite + Electric

```
Phase 1: Preparation
├── Export existing IndexedDB data
├── Transform to match new schema
└── Validate data integrity

Phase 2: PGlite Setup
├── Initialize PGlite instance
├── Create Drizzle schema
├── Import historical data
└── Mark all as "synced"

Phase 3: Electric Sync
├── Start Electric shapes
├── Initial sync from server
├── Resolve any conflicts
└── Verify data consistency

Phase 4: Cutover
├── Switch reads to PGlite
├── Switch writes to API
├── Monitor for issues
└── Remove TanStack DB

Phase 5: Cleanup
├── Remove old code
├── Update tests
└── Document new patterns
```

---

## Decision Flowcharts

### When to Use This Architecture?

```
Building offline-first app?
    ↓ Yes
Need real-time sync from server?
    ↓ Yes
Have ElectricSQL infrastructure?
    ↓ Yes
Using Drizzle ORM?
    ↓ Yes
✅ PERFECT MATCH - Use this pattern

Any "No" above:
    Consider alternatives:
    - No offline? → Direct API calls
    - No real-time? → Polling
    - No Electric? → Custom sync or tRPC
    - No Drizzle? → Prisma or raw SQL
```

### Which Write Strategy?

```
Need offline support?
    ↓ No
    Use direct API calls (simple)
    
    ↓ Yes
    
Can users lose data if offline?
    ↓ No (nice-to-have)
    Use optimistic UI only
    
    ↓ Yes (critical data)
    
Need complex conflict resolution?
    ↓ No
    Use queue + auto-retry
    
    ↓ Yes
    Use queue + manual conflict UI
```

---

## Testing Scenarios

### Critical Test Cases

1. **Offline → Online Transition**
   - Create 5 items offline
   - Restore connection
   - Verify all sync
   - Verify order preserved

2. **Conflict Resolution**
   - Edit offline (User A)
   - Edit online (User B)
   - A comes online
   - Verify resolution correct

3. **Shape Filter**
   - Login as Business A
   - Verify only A's data visible
   - Switch to Business B
   - Verify B's data, not A's

4. **Large Dataset**
   - 10k customers
   - Shape filtered by business
   - Initial sync time < 5s
   - Memory usage reasonable

5. **Error Recovery**
   - API returns 500
   - Queue retry
   - Eventually succeeds
   - No data loss

---

## Metrics to Track

| Metric | Target | Alert If |
|--------|--------|----------|
| Initial sync time | < 5s | > 10s |
| Live query latency | < 100ms | > 500ms |
| Write queue depth | < 50 | > 100 |
| Failed writes | 0 | > 5/day |
| PGlite memory | < 100MB | > 200MB |
| Sync errors | 0 | Any |

---

## Resources

- **ElectricSQL Docs**: https://electric-sql.com/docs
- **PGlite Docs**: https://pglite.dev/docs/
- **Drizzle ORM**: https://orm.drizzle.team/
- **Example App**: Linearlite (ElectricSQL examples)
