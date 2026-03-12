---
name: pglite-electric-hybrid
description: Architecture guide for PGlite + ElectricSQL + Drizzle ORM hybrid
  sync. Use when designing offline-first apps where ElectricSQL handles
  server-to-client sync and REST API handles client-to-server writes with
  Drizzle ORM shared across frontend and backend.
user-invocable: true
disable-model-invocation: false
---

# PGlite + Electric + Drizzle (Hybrid Architecture)

> **IMPORTANT: Read project documentation first**

When this skill is activated, immediately read these documentation files from the project:

```bash
# Core architecture documentation (MUST READ)
read docs/offline/02-arquitectura.md   # Stack overview and patterns
read docs/offline/03-flujo-sync.md     # Data flow timelines and sequences  
read docs/offline/04-decisiones.md     # Architecture decision records (ADRs)

# Reference documentation (as needed)
read docs/offline/01-entidades.md      # Entity inventory for offline support
read docs/offline/05-migracion.md      # Migration guide from TanStack DB
read docs/offline/06-troubleshooting.md # Common issues and solutions
read docs/offline/07-testing.md        # Testing strategies
```

These documents contain:
- ✅ Approved patterns and anti-patterns
- ✅ Architecture decisions with rationale  
- ✅ Data flow examples and timelines
- ⚠️ Common pitfalls to avoid
- 🔧 Troubleshooting guides

**Always reference these docs when:**
- Designing sync architecture
- Implementing offline features
- Troubleshooting sync issues
- Making architecture decisions

> **Architecture pattern: Electric for reads, API for writes, Drizzle everywhere**

## When to Use This Pattern

- Building offline-first web applications
- Using PGlite (PostgreSQL in browser) as local database
- ElectricSQL available for sync infrastructure
- Drizzle ORM as your data layer
- Need real-time sync from server with offline write support

## Core Architecture

```
┌─────────────────────────────────────────────┐
│  CLIENT (Browser)                           │
│  ├─ React/Vue/Svelte UI                     │
│  ├─ Drizzle ORM (queries)                   │
│  ├─ PGlite (local Postgres)                 │
│  ├─ ElectricSQL (read sync)                 │
│  └─ Write Queue (offline support)           │
└──────────────────┬──────────────────────────┘
                   │
         Electric Sync (reads)
                   │
┌──────────────────┼──────────────────────────┐
│  SERVER          │                          │
│  ├─ REST API ←───┘ (writes)                 │
│  ├─ Drizzle ORM                             │
│  └─ PostgreSQL ←── Electric captures changes│
└─────────────────────────────────────────────┘
```

## Key Decisions You Need to Make

### 1. Schema Sharing
**Question:** How will you share Drizzle schema between frontend and backend?

**Options:**
- **Monorepo with shared package**: `packages/shared/schema.ts`
- **Single file copied**: Same schema file in both projects
- **Backend exports, frontend imports**: Backend package exports schema

**Considerations:**
- Keep schema as the single source of truth
- Avoid drift between frontend/backend types
- Version schema changes carefully

### 2. Electric Shapes
**Question:** Which tables need to sync to the client?

**Pattern:**
```typescript
// Define shapes per business/tenant
pg.electric.syncShapeToTable({
  shape: {
    table: 'customers',
    where: `business_id = '${businessId}'`
  },
  table: 'customers',
  primaryKey: ['id']
})
```

**Decisions:**
- Which entities sync (customers, sales, products)?
- Filter by tenant (business_id) for multi-tenant apps
- Read-only tables vs syncable tables

### 3. Write Strategy
**Question:** How do you handle writes when offline?

**Options:**

**A. Immediate API Call (simplest)**
- POST to API immediately
- If fails, show error
- No offline support

**B. Queue + Retry (offline support)**
- Try API call first
- If fails (offline), queue in IndexedDB
- Auto-retry when online
- Show pending state in UI

**C. Optimistic + Sync (complex)**
- Update PGlite immediately (optimistic)
- Queue API call
- Rollback if API fails

**Recommendation:** Start with B for most apps.

### 4. Conflict Resolution
**Question:** What happens if server data changes while user was offline?

**Electric handles this:**
- Server changes sync automatically to PGlite
- User sees latest data when reconnecting
- Last-write-wins on individual fields

**Your decision:** Do you need custom merge logic?
- Most apps: No, Electric's default is fine
- Complex apps: Custom conflict UI for user resolution

## Implementation Checklist

### Phase 1: Setup
- [ ] Install `@electric-sql/pglite` and `@electric-sql/pglite-sync`
- [ ] Install `drizzle-orm` in frontend and backend
- [ ] Set up shared schema definition
- [ ] Configure Electric sync endpoint

### Phase 2: Read Path
- [ ] Initialize PGlite with Electric extension
- [ ] Create schema in PGlite (tables + indexes)
- [ ] Configure sync shapes for your entities
- [ ] Implement live queries with `useLiveQuery`

### Phase 3: Write Path
- [ ] Create API endpoints for writes
- [ ] Implement write queue (IndexedDB)
- [ ] Add offline detection and retry logic
- [ ] Show sync status in UI

### Phase 4: Polish
- [ ] Handle sync errors gracefully
- [ ] Add conflict resolution UI (if needed)
- [ ] Test offline/online transitions
- [ ] Optimize shape filters for performance

## Data Flow Examples

### Creating a Sale (Online)
1. User clicks "Create Sale"
2. POST `/api/sales` with sale data
3. Backend validates, inserts into Postgres
4. Electric detects change in Postgres
5. Electric pushes update to client
6. PGlite updates automatically
7. UI re-renders with new sale

### Creating a Sale (Offline)
1. User clicks "Create Sale"
2. POST fails (no connection)
3. Save to IndexedDB queue
4. Show "Pending" status in UI
5. User continues working offline
6. Connection restored
7. Queue processes POST
8. Sale appears in UI after sync

### Reading Data (Always)
1. Component mounts
2. `useLiveQuery(db.select().from(sales))`
3. Returns current data from PGlite
4. Electric updates PGlite automatically
5. Query re-runs when data changes
6. UI updates reactively

## Common Pitfalls

### 1. Writing directly to PGlite
❌ **Don't:** Insert directly into PGlite for server-synced data
✅ **Do:** Always go through API for writes

### 2. Forgetting tenant filtering
❌ **Don't:** Sync all data: `syncShapeToTable({table: 'customers'})`
✅ **Do:** Filter by tenant: `where: business_id = 'xyz'`

### 3. Shapes without primary keys
❌ **Don't:** Forget to specify `primaryKey` in shape config
✅ **Do:** Always define: `primaryKey: ['id']`

### 4. Not handling shape errors
❌ **Don't:** Ignore `onError` callback
✅ **Do:** Log errors and show user-friendly messages

## Resources

- **ElectricSQL Sync Docs**: https://pglite.dev/docs/sync
- **Drizzle PGlite Driver**: https://orm.drizzle.team/docs/connect-pglite
- **Electric React Hooks**: https://pglite.dev/docs/framework-hooks/react
- **PGlite Examples**: https://pglite.dev/examples

## Architecture Comparison

| Aspect | Full Custom Sync | Electric + API (This Pattern) |
|--------|-----------------|-------------------------------|
| Read Sync | Manual polling/pullChanges | Electric handles automatically |
| Write Sync | Manual pushChanges | Your API + queue |
| Offline Reads | Cached in PGlite | Cached in PGlite |
| Offline Writes | Complex queue logic | Your queue implementation |
| Conflict Resolution | You implement | Electric handles + your UI |
| Complexity | High | Medium |
| Control | Full | Reads: Electric, Writes: You |

## Next Steps

1. **Define your schema** in shared Drizzle format
2. **Choose your write strategy** (immediate, queued, or optimistic)
3. **Set up Electric sync** for your tables
4. **Build your API** for writes
5. **Implement offline queue** if needed

For implementation details, consult the official documentation links above.
