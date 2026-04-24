# Code Review Checklist for Sync Architecture

This checklist helps detect architecture violations in `packages/app/app/`.

## Architecture Rules

### Rule 1: NO Direct SQL in `packages/app`

**Anti-pattern** — direct SQL queries in service or hook code:
```typescript
// ❌ BAD: Direct SQL query
const items = await this.pg.query(`SELECT id FROM sale_items WHERE sale_id = $1`, [id]);
const result = await pg.query(`SELECT * FROM products WHERE business_id = $1`, [businessId]);
```

**Correct pattern** — use generated services:
```typescript
// ✅ GOOD: Using generated service
const items = await this.generatedItemsService.findBySaleId(saleId);
```

**Exception**: Debug utilities in `lib/debug/console/` may use direct SQL for diagnostics.

**Grep patterns to find violations**:
```
await.*\.query\(` — finds direct SQL queries
```

**Files to check**:
- `packages/app/app/lib/services/*.ts` — should NOT have `.pg.query(\`)`
- `packages/app/app/hooks/*.ts` — should NOT have `.pg.query(\`)`
- `packages/app/app/lib/*.ts` — should NOT have `.pg.query(\`)` (except cache.ts in debug context)

---

### Rule 2: Generated Services First

**Anti-pattern** — reimplementing CRUD manually:
```typescript
// ❌ BAD: Manual CRUD that duplicates generated service
async createCustomer(data: CreateCustomerInput) {
  await this.pg.query(
    `INSERT INTO customers (...) VALUES (...)`,
    [...]
  );
}
```

**Correct pattern** — extend/use generated service:
```typescript
// ✅ GOOD: Extending generated service
import { CustomersService } from "~/lib/sync/generated/services";

export class CustomerService extends CustomersService {
  async customMethod(data: CreateCustomerInput) {
    // Custom logic using parent CRUD
    return super.create(data);
  }
}
```

**Composition pattern** (when extension isn't enough):
```typescript
// ✅ GOOD: Composing with generated service
export class SaleService {
  private generatedSalesService: GeneratedSalesService;
  private generatedItemsService: GeneratedItemsService;

  constructor(engine: SyncClientEngineLike) {
    this.generatedSalesService = new GeneratedSalesService(engine);
    this.generatedItemsService = new GeneratedItemsService(engine);
  }
}
```

---

### Rule 3: Business Logic in Services, Not Hooks

**Anti-pattern** — business logic in hooks:
```typescript
// ❌ BAD: Business logic in hook
export function useCreateSale() {
  return useMutation({
    mutationFn: async ({ sale, items }) => {
      // Business logic shouldn't be here
      if (!sale.customerId) throw new Error("Customer required");
      const sellerId = business?.businessUserId;
      if (!sellerId) throw new Error("Business seller required");
      // ... more business rules
    }
  });
}
```

**Correct pattern** — service handles business logic:
```typescript
// ✅ GOOD: Service handles business logic
export class SaleService {
  async createSale(input: CreateSaleInput): Promise<Sale> {
    if (!input.customerId) throw new Error("Customer required");
    // ... business rules in service
  }
}

// Hook only orchestrates
export function useCreateSale() {
  return useMutation({
    mutationFn: (input) => saleService.createSale(input)
  });
}
```

**Hook responsibilities**:
- Query key management
- `onSuccess`/`onError` callbacks (UI-side only)
- Query invalidation
- Connecting to engine: `engine.use("entity", () => new Service(engine))`

---

### Rule 4: All Mutations Go Through Sync

**Anti-pattern** — direct DB write bypassing sync:
```typescript
// ❌ BAD: Direct write, bypasses sync queue
await this.pg.query(`UPDATE sales SET status = $1 WHERE id = $2`, [status, id]);
```

**Correct pattern** — use sync-enabled service:
```typescript
// ✅ GOOD: Write goes through sync queue
await this.generatedSalesService.update(id, { status });
// OR via queueSync
await this.queueSync("update", id, { status });
```

**Why it matters**: Direct writes skip the sync queue, making changes invisible to the server and breaking offline-first.

---

### Rule 5: Service Composition Over Complex Inheritance

**Anti-pattern** — extending BaseService for all CRUD:
```typescript
// ❌ BAD: All CRUD manually in BaseService subclass
export class ProductService extends BaseService {
  async findAll() { /* manual query */ }
  async create(data) { /* manual insert */ }
  async update(id, data) { /* manual update */ }
}
```

**Correct pattern** — extend generated service:
```typescript
// ✅ GOOD: Extend generated, add custom methods only
export class ProductService extends ProductsService {
  async findByCategory(categoryId: string) {
    // Custom method only
  }
}
```

**When to use BaseService directly**:
- Entity has no generated service yet
- Need low-level sync queue access (`queueSync`)

---

### Rule 6: Structured Logging Only

**Anti-pattern** — raw console.log/error:
```typescript
// ❌ BAD: Raw console usage
console.log("Sale created", sale);
console.error("Failed to create", error);
```

**Correct pattern** — structured logging with tags:
```typescript
// ✅ GOOD: Tagged performance logs
console.log("[Perf][SaleService] createDraft", { saleId: sale.id, totalMs });
console.log("[Perf][useCreateDraftSale] mutationFn", { ... });

// ✅ GOOD: Error logging
console.error("[SaleService] createDraft failed", { error: error.message });
```

**Tags to use**:
- `[Perf][ServiceName]` — performance measurements
- `[Error][ServiceName]` — error conditions
- `[Sync][ServiceName]` — sync-related events

---

### Rule 7: Domain Errors via throw, Hooks Handle

**Anti-pattern** — catching and re-throwing in service:
```typescript
// ❌ BAD: Swallowing errors in service
try {
  await this.generatedSalesService.update(id, data);
} catch (error) {
  console.error(error);
  // Error disappears here
}
```

**Correct pattern** — let errors propagate:
```typescript
// ✅ GOOD: Service throws domain errors
async confirmSale(id: string) {
  const sale = await this.findById(id);
  if (sale.status !== "draft") {
    throw new Error("Only draft sales can be confirmed");
  }
  await this.generatedSalesService.update(id, { status: "confirmed" });
}

// Hook handles error with onError
useMutation({
  mutationFn: (id) => saleService.confirmSale(id),
  onError: (error) => {
    showError("Error al confirmar", error.message);
  }
});
```

---

## Known Violations (Pending Migration)

| File | Line | Issue | Fix |
|------|------|-------|-----|
| `lib/services/sale-service.ts` | 960 | Direct SQL for item lookup | Use `generatedItemsService.findBySaleId()` |
| `lib/services/sale-service.ts` | 972 | Direct SQL for sale status check | Use `findById()` instead |
| `lib/services/payment-service.ts` | 148, 166, 212, 256, 277, 295, 312, 319, 353 | Multiple direct SQL | Use generated service + Drizzle queries |
| `lib/services/purchase-service.ts` | 88, 95, 145, 153, 177, 190, 232, 271 | Multiple direct SQL | Use generated service + Drizzle queries |
| `lib/services/inventory-service.ts` | 58, 88 | Direct SQL | Create InventoryService extending generated or use Drizzle |

---

## Grep Patterns for Quick Audit

```bash
# Direct SQL in services/hooks (exclude debug)
grep -r "await.*\.query(\`" packages/app/app/lib/services/
grep -r "await.*\.query(\`" packages/app/app/hooks/

# Raw console usage (exclude debug)
grep -r "console\.log\|console\.error" packages/app/app/lib/services/
grep -r "console\.log\|console\.error" packages/app/app/hooks/

# Missing sync via service
grep -r "pg\.query.*INSERT\|pg\.query.*UPDATE\|pg\.query.*DELETE" packages/app/app/lib/

# Missing generated service usage
grep -L "Generated.*Service\|extends.*Service" packages/app/app/lib/services/
```

---

## Correct Hook Architecture Order

```
┌─────────────────────────────────────────────────────────────┐
│                        Component                              │
│  useSale(id) → useMutation → saleService.createSale()       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  SaleService → GeneratedSalesService → queueSync()          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Sync Engine (PGlite)                       │
│  SyncService → Push/Pull → Remote PostgreSQL                 │
└─────────────────────────────────────────────────────────────┘
```

**Hook pattern**:
```typescript
export function useSale(id: string | null) {
  const engine = useSyncEngine();
  const saleService = engine.use("sales", () => new SaleService(engine));

  return useQuery({
    queryKey: ["sales", id],
    queryFn: () => saleService.findById(id!),
    enabled: !!id,
  });
}
```
