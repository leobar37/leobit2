# AGENTS.md - Local-First Services

**OVERVIEW:**
Client-side PGlite services extending `BaseService` for offline-first CRUD with automatic sync queueing.

**STRUCTURE:**
```
lib/services/
├── base-service.ts           # Abstract base with sync primitives
├── customer-service.ts       # Customers + tag associations
├── sale-service.ts           # Sales + items (atomic operations)
├── product-service.ts        # Products + variants
├── payment-service.ts        # Payment records (abonos)
├── purchase-service.ts       # Purchases + items
├── supplier-service.ts       # Suppliers
├── inventory-service.ts      # LOCAL-ONLY inventory tracking
├── distribucion-service.ts   # Distribution + items
├── visita-service.ts         # Visit records
├── tag-service.ts            # Customer tags
├── customer-tag-service.ts   # Customer-tag associations
└── customer-group-service.ts # Customer groups + members
```

**WHERE TO LOOK:**
| Pattern | Example |
|---------|---------|
| Base class methods | `base-service.ts` lines 82-228 |
| Atomic transactions | `sale-service.ts` `create()` with syncGroup |
| Search with filters | `customer-service.ts` `search()` |
| Entity + items | `purchase-service.ts`, `distribucion-service.ts` |

**CONVENTIONS:**

1. **Service Creation Pattern:**
```typescript
export class XService extends BaseService {
  getEntityType(): EntityType { return "customers"; }
  getEntityPrefix(): string { return "cus"; }
  
  async create(data: CreateInput): Promise<Entity> {
    const id = this.generateId();
    const syncGroup = this.generateSyncGroup();
    // ... PGlite insert ...
    await this.queueSync("create", id, payload, syncGroup);
    return entity;
  }
}
```

2. **Atomic Multi-Entity Operations:**
- Use `generateSyncGroup()` to group related operations
- Pass `syncGroup` to all `queueSync()` calls in transaction
- See `sale-service.ts` for items + sale atomic pattern

3. **Required Abstract Methods:**
- `getEntityType()` - Must return valid `EntityType` from `@avileo/shared`
- `getEntityPrefix()` - Used for ID generation (legacy, now uses UUID v4)

4. **Timestamps:**
- Use `this.now()` for local timezone ISO strings (Peru UTC-5)
- Never use `new Date().toISOString()` directly

5. **Sync Status Flow:**
- Initial write: `sync_status = 'pending'`
- On conflict: `incrementSyncVersion()` bumps version + sets pending
- Handler updates: `updateSyncStatus()` to `synced` or `error`

**ANTI-PATTERNS:**

❌ **Direct Date Construction:**
```typescript
// WRONG - uses UTC, not local timezone
const now = new Date().toISOString();
```

❌ **Missing Sync Group for Multi-Entity:**
```typescript
// WRONG - items and parent not atomic
await this.queueSync("create", saleId, saleData);
for (const item of items) {
  await this.queueSync("create", item.id, item); // No syncGroup!
}
```

❌ **Calling PGlite Directly Without Sync:**
```typescript
// WRONG - data written but never synced
await this.pg.query(`INSERT INTO customers ...`);
// Missing: await this.queueSync(...)
```

❌ **Wrong Entity Type:**
```typescript
// WRONG - 'customer' not in shared SYNC_ENTITIES
getEntityType() { return "customer"; } // Should be "customers"
```

**LOCAL-ONLY ENTITIES:**
- `inventory` - Frontend-only tracking, not synced
- `variant_inventory` - Legacy, deprecated

**RELATED:**
- Backend counterpart: `packages/backend/src/services/business/`
- Sync engine: `packages/app/app/lib/sync/`
- Shared entities: `@avileo/shared` SYNC_ENTITIES
