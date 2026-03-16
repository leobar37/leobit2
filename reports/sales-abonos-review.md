# Sales & Abonos Modules — Deep Review Report

**Date:** 2026-03-16  
**Branch:** feature/improvements  
**Reviewer:** Automated deep review  

---

## 1. SALES MODULE

### 1.1 Data Model Overview

**Backend schema:** `packages/backend/src/db/schema/sales.ts`  
**Frontend schema:** `packages/app/app/lib/db/schemas/sale.ts`

The sales model is **unified** — it supports both `instant_sale` (immediate) and `pre_order` (scheduled delivery) via a `type` column.

| Key Field | Purpose |
|-----------|---------|
| `type` | `instant_sale` or `pre_order` |
| `saleType` | `contado` (cash) or `credito` (credit) |
| `paymentMode` | `pago_total`, `a_cuenta`, `debe_todo` |
| `status` | `draft` → `active`/`confirmed` → `delivered`/`cancelled` |
| `version` | Optimistic locking counter |
| `syncStatus` | `pending`, `synced`, `error` |
| `balanceDue` | Historical snapshot at sale creation |

**Sale Items** (`sale_items` table) are stored separately with their own `businessId` (for Electric sync filtering) and `syncStatus`.

**Sale Tokens** (`sale_tokens` table) enable public sharing of sales via URL tokens (12-char, URL-safe).

### 1.2 Offline Creation Flow

**Frontend service:** `packages/app/app/lib/services/sale-service.ts` (`SaleService`)

1. **Draft Creation** (`createDraft`):
   - Generates a `crypto.randomUUID()` for the sale ID client-side
   - Inserts into local PGlite with `sync_status = 'pending'`
   - Generates a `syncGroupId` via `crypto.randomUUID()`
   - Queues a sync operation (`insert`) via `BaseService.queueSync()`
   - Items can be added incrementally via `addItem()`

2. **Full Sale Creation** (`createWithItems`):
   - Wraps sale + all items in a PGlite transaction (`BEGIN` / `COMMIT` / `ROLLBACK`)
   - All item IDs are pre-generated before the transaction
   - Queues a single sync operation with items embedded in the payload

3. **Sale Confirmation** (`confirm`):
   - Updates local PGlite: `status = 'active'`, `sync_status = 'pending'`
   - Looks up the original insert's `syncGroupId` and attaches the update to the same group
   - Queues sync `update` operation

### 1.3 Sync Flow (Client → Server)

**Client sync service:** `packages/app/app/lib/sync/sync-service.ts` (`SyncService`)  
**Sync hooks:** `packages/app/app/lib/sync/hooks/sales.ts`  
**Backend handler:** `packages/backend/src/services/sync/handlers/SaleSyncHandler.ts`  
**Backend engine:** `packages/backend/src/services/sync/framework/SyncEngine.ts`

**Client-side flow:**
1. `BaseService.queueSync()` runs sync hooks first (e.g., `saleSyncHook` blocks empty sales)
2. Generates an `idempotencyKey` via `generateId()` 
3. `SyncService.enqueue()` checks for existing pending/failed operations for the same entity
4. **Operation coalescing:** If a pending `insert` exists and an `update` comes in, they merge. If a pending `insert` + `delete`, the operation is cancelled entirely
5. Auto-sync runs every `SYNC_INTERVAL_MS` (configurable), sends batches of up to `BATCH_SIZE`
6. Operations with the same `syncGroupId` are sent together as a batch

**Server-side flow:**
1. `SyncEngine.processBatch()` processes all operations in a single DB transaction with SAVEPOINTs per operation
2. Idempotency check: Looks up `sync_operations` table by `idempotencyKey` — if already `processed`, returns success immediately
3. Conflict check: `ConflictResolverRegistry` checks version conflicts
4. `SaleSyncHandler.handleCreate()`:
   - Creates sale + items in the DB
   - For credit sales with initial payment (`amountPaid > 0`), creates an initial abono via `paymentRepo.createInitialPayment()` using a reference `init-sale:{saleId}`
   - Uses `onConflictDoNothing` on the reference number for idempotency

**Self-healing:** When a `sales` update fails with "not found", the `SyncService` converts it to an `insert` and retries (see `trySelfHealOperation`).

### 1.4 Sale Sharing Flow

**Hooks:** `packages/app/app/hooks/use-sale-token.ts`, `packages/app/app/hooks/use-public-sale.ts`  
**Schema:** `packages/backend/src/db/schema/sale-tokens.ts`

1. **Token generation** calls backend API (`POST /sales/:id/token`) — requires internet
2. **Public access** via `/venta/:token` — customer can view and edit the sale
3. **Customer edits** use `baseVersion` for optimistic locking (prevents concurrent edit conflicts)
4. **Confirm** (`useConfirmPublicSale`) submits customer info + delivery date
5. Token can be toggled active/inactive, regenerated (old token invalidated)
6. Public sale data refreshes every 30 seconds (`refetchInterval: 30000`)

**Key observation:** Token generation and all public sale operations are **API-only** — they require internet connection. This is by design since sharing involves a server-mediated interaction.

### 1.5 Potential Issues Found

#### ISSUE S1: AbonoSyncHandler ignores `entityId` on create (CRITICAL)

**File:** `packages/backend/src/services/sync/handlers/AbonoSyncHandler.ts`, line ~49

```typescript
private async handleCreate(ctx, operation, tx) {
  const parsed = abonoCreateSchema.parse(operation.payload);
  await this.paymentRepo.create(ctx, {
    customerId: parsed.customerId,
    amount: String(parsed.amount),
    paymentMethod: parsed.paymentMethod,
    notes: parsed.notes,
  }, tx);
}
```

The `operation.entityId` (the client-generated UUID) is **never passed** to `paymentRepo.create()`. The repository then generates a new server-side UUID. This means:
- The abono ID on the server will **differ** from the client-generated ID
- If Electric sync pulls the abono back, it'll appear as a **different record** than the one the client created
- The client's `markCompleted()` updates `sync_status` on the local record by its entity ID, but the server record has a different ID
- **Risk:** Duplicate payments in the local PGlite if the server-created abono syncs back via ElectricSQL with a different ID

#### ISSUE S2: SaleSyncHandler also ignores `entityId` for initial payment abono

**File:** `packages/backend/src/services/sync/handlers/SaleSyncHandler.ts`, line ~71-78

When a credit sale is created with an initial payment, `paymentRepo.createInitialPayment()` creates an abono **without** using any client-supplied ID. This is somewhat mitigated by the `referenceNumber` unique constraint (`init-sale:{saleId}`) with `onConflictDoNothing`, but:
- The abono ID will be server-generated
- If the same sale sync is retried, the `onConflictDoNothing` prevents duplicates
- **Minor risk:** The client has no knowledge of this server-created abono until Electric sync pulls it back

#### ~~ISSUE S3~~ (RESOLVED): Sale item sync handler exists

`SaleItemSyncHandler` is registered in `HandlerRegistry` and properly handles individual item CRUD operations with the client's `entityId`. It correctly:
- Uses `operation.entityId` as the item ID on the server
- Updates the sale's `totalAmount` and `balanceDue` when items change
- Handles create, update, and delete operations transactionally

#### ISSUE S4: `updateItem()` and `removeItem()` sync without `syncGroupId`

**File:** `packages/app/app/lib/services/sale-service.ts`, lines ~422, ~467

```typescript
// updateItem - no syncGroupId
await this.queueSync("update", itemId, { saleId, quantity, unitPrice, subtotal });

// removeItem - no syncGroupId
await this.queueSync("delete", itemId, { saleId });
```

These item-level operations don't use the sale's `syncGroupId`. If they're processed separately from the sale creation, the **ordering** is not guaranteed. The server may see an item update before the sale exists, causing failures.

However, the `SyncService.processPending()` does process grouped operations together and individual operations separately, so this may be partially mitigated by processing order (created_at ASC).

#### ISSUE S5: PaymentService.getCustomerDebtBalance() has incorrect SQL query

**File:** `packages/app/app/lib/services/payment-service.ts`, line ~127

```typescript
const salesResult = await this.pg.query<{ total: string }>(
  `SELECT COALESCE(SUM(total_amount), 0) as total FROM sales
   WHERE customer_id = $1 AND business_id = $2
   AND status = 'credit' AND count_toward_debt = true`,
  [customerId, this.businessId]
);
```

**Problems:**
1. Uses `status = 'credit'` — but there is **no** `credit` status. The correct column is `sale_type = 'credito'`
2. References `count_toward_debt` column — this column **does not exist** in the sales schema
3. This means `getCustomerDebtBalance()` will **always return 0** (no rows match)
4. Consequently, `validatePaymentAmount()` will **always throw "El cliente no tiene deuda pendiente"** when trying to create a payment

**Impact:** This is a **critical bug** — creating payments (abonos) is likely broken or bypassed. However, the `useAccountsReceivable` hook calculates debt differently (correctly) using `saleType === 'credito'` and checking `status !== 'draft' && status !== 'cancelled'`.

#### ISSUE S6: Missing `distribucion_id` filter in queries (minor)

The `SaleService.findByBusiness()` fetches ALL sales for the business. For vendors with distribuciones, this could return sales from other distributions. Not a correctness issue per se, but a performance and data exposure concern.

#### ISSUE S7: `SaleService.createDraft` sets `balance_due = totalAmount` incorrectly

**File:** `packages/app/app/lib/services/sale-service.ts`, `createDraft()`, line ~193

```typescript
saleInput.totalAmount || 0,  // balance_due
```

A draft sale starts with `amountPaid = 0` and `balanceDue = totalAmount`, which is 0 for new drafts. This is actually correct for the draft flow since totalAmount starts at 0 and items are added incrementally.

#### ISSUE S8: No deduplication for `createWithItems` on retry

When `createWithItems` fails mid-transaction and the user retries, a new `saleId` is generated each time (via `generateId()`). This means:
- If the first attempt's sync operation was already queued but the local DB failed, the sync may create a server-side record for the first attempt
- The retry creates a completely separate sale
- **Mitigation:** The PGlite transaction ensures atomicity locally — either all local writes succeed or none do. The sync queue is separate.

#### ISSUE S9: `confirm()` doesn't validate sale has items

**File:** `packages/app/app/lib/services/sale-service.ts`, `confirm()` method

A draft sale can be confirmed even if it has zero items. The `saleSyncHook` checks for items before sync, but the local state transitions without this validation.

#### ISSUE S10: `deleteItem` on server via cascade but no explicit sync for items

When a sale is deleted locally (`SaleService.delete()`), items are deleted via Drizzle, and only the sale's delete sync is queued. On the server side, `SaleRepository.delete()` uses SQL delete which depends on `ON DELETE CASCADE` on the FK. This is correct architecture, but there's a **timing window**: if the sale deletion sync hasn't been processed yet but an item update sync arrives first, it could fail or create orphaned operations.

---

## 2. ABONOS (PAYMENTS) MODULE

### 2.1 Data Model Overview

**Backend schema:** `packages/backend/src/db/schema/payments.ts`  
**Frontend service:** `packages/app/app/lib/services/payment-service.ts`

| Key Field | Purpose |
|-----------|---------|
| `customerId` | Required — every payment is linked to a customer |
| `sellerId` | Points to `business_users.id` |
| `amount` | Decimal(12,2) |
| `paymentMethod` | `efectivo`, `yape`, `plin`, `transferencia`, `tarjeta`, `saldo` |
| `referenceNumber` | Unique constraint — used for idempotency |
| `relatedSaleId` | Optional FK to `sales.id` — used for cancellation tracking |
| `syncStatus` | `pending`, `synced`, `error` |

**Notable:** The abonos table has NO `updatedAt` column — only `createdAt`. This means updates are "append-only" in a sense; the schema does support updates but has no timestamp tracking for them.

### 2.2 Offline Abono Creation

**Flow:**
1. `PaymentService.create()` generates UUID, inserts into PGlite
2. Validates customer belongs to business
3. Validates payment amount against customer debt (see ISSUE S5 — this validation is broken)
4. Queues sync operation with `insert`

**The abono sync payload uses `snake_case` keys:**
```typescript
await this.queueSync("insert", id, {
  customer_id: input.customer_id,    // snake_case
  seller_id: input.seller_id,
  amount,
  payment_method: input.payment_method,
  ...
});
```

But the backend `abonoCreateSchema` expects **camelCase**:
```typescript
export const abonoCreateSchema = z.object({
  customerId: z.string(),        // camelCase
  amount: z.union([...]),
  paymentMethod: z.enum([...]),
  ...
});
```

#### ISSUE A1: Snake_case vs camelCase mismatch in abono sync payload (CRITICAL)

**Frontend sends:** `customer_id`, `seller_id`, `payment_method`  
**Backend expects:** `customerId`, `paymentMethod`

This means `abonoCreateSchema.parse(operation.payload)` will **fail validation** because `customerId` is required but received as `customer_id`. The sync handler will return an error for every abono creation.

**Impact:** Abono sync to server is **completely broken**. Payments are created locally in PGlite but will never sync to the server successfully.

### 2.3 Abono-Sale Relationship

**Relationship structure:**
- `abonos.relatedSaleId` is an optional FK to `sales.id`
- Not all payments are tied to a specific sale — they reduce the customer's **overall** debt
- Balance is calculated at the **customer level**, not the sale level:
  - Total debt = SUM(credit sales totalAmount) - SUM(all abonos)
  - See `useAccountsReceivable` hook for the correct implementation

**Initial payment on credit sale:**
- When a credit sale is created with an initial payment (`amountPaid > 0`), the `SaleSyncHandler` creates an abono via `paymentRepo.createInitialPayment()` with `referenceNumber = 'init-sale:{saleId}'`
- This uses `onConflictDoNothing` on the unique `referenceNumber` for idempotency

### 2.4 Balance Calculation Logic

**Backend (`CustomerRepository.getBalance()`):** Not directly visible in reviewed files, but the schema comment says "use CustomerRepository.getBalance() for current debt"

**Frontend — Two implementations:**

1. **`PaymentService.getCustomerDebtBalance()`** (BROKEN — see ISSUE S5):
   - Queries `sales WHERE status = 'credit' AND count_toward_debt = true` — both conditions are wrong
   - This is used in `validatePaymentAmount()` before creating a payment

2. **`useAccountsReceivable` hook** (CORRECT):
   - Fetches all sales and payments for the business
   - Filters credit sales that are not `draft` or `cancelled`
   - Calculates: `totalDebt = SUM(totalSales) - SUM(totalPayments)`
   - Used by `useCustomerBalance` hook

**The inconsistency is:**  
- The hook-based calculation is correct and used for display
- The service-based validation is broken, meaning payment creation may throw incorrect errors

### 2.5 Double-Payment Prevention

1. **Reference number uniqueness:** `abonos.referenceNumber` has a `UNIQUE` constraint. If a payment has a reference number (e.g., Yape transaction ID), duplicates are prevented at the DB level.
2. **Initial payment idempotency:** `createInitialPayment` uses `onConflictDoNothing` on `referenceNumber`
3. **No amount-level deduplication:** There's no check to prevent two separate payments of the same amount to the same customer. This is by design — a customer can make multiple payments.
4. **Sync idempotency:** The `SyncEngine` records each operation's `idempotencyKey` in `sync_operations` table and skips already-processed operations.

---

## 3. CROSS-CUTTING CONCERNS

### 3.1 Sync Coalescing

The `SyncService.enqueue()` method implements operation coalescing:
- `insert + update → merged insert` (payload merged)
- `insert + delete → cancel` (operation removed entirely)
- `update + update → merged update` (payload merged)
- `update + delete → replace with delete`

This is a well-designed optimization, but has a subtle issue: **merged payloads may have stale data** if the user makes multiple changes to different fields. The last merge always wins.

### 3.2 Dead Letter Queue

Failed operations (after `MAX_RETRIES`) are moved to `sync_dead_letter` table. This provides:
- Manual retry capability
- Error tracking
- No data loss even with persistent failures

### 3.3 Backend Sync Validation

**Sync schemas** (`packages/backend/src/services/sync/schemas/index.ts`):
- `saleCreateSchema` validates that credit sales require a customer
- `saleCreateSchema` validates that contado sales have `amountPaid ≈ totalAmount`
- `abonoCreateSchema` validates `amount > 0` and requires `customerId`

These validations may reject operations that were valid at creation time but became invalid due to concurrent changes.

### 3.4 Transaction Isolation

**Backend:** Uses a single DB transaction with SAVEPOINTs for the entire batch. Individual operation failures don't abort the transaction.

**Frontend:** Uses PGlite `BEGIN/COMMIT/ROLLBACK` for atomic local writes. Sync operations are queued **after** commit, so if commit fails, no orphaned sync operations.

---

## 4. ISSUE SUMMARY

| ID | Severity | Module | Description |
|----|----------|--------|-------------|
| **A1** | 🔴 CRITICAL | Abonos | Snake_case vs camelCase mismatch in sync payload — abono sync to server is broken |
| **S1** | 🔴 CRITICAL | Abonos | `AbonoSyncHandler.handleCreate()` ignores client-generated `entityId` — creates server record with different ID |
| **S5** | 🔴 CRITICAL | Payments | `PaymentService.getCustomerDebtBalance()` queries non-existent column/status — always returns 0 |
| ~~S3~~ | ✅ RESOLVED | Sales | `sale_items` handler exists and works correctly |
| **S4** | 🟡 HIGH | Sales | Item update/remove syncs without `syncGroupId` — ordering not guaranteed |
| **S2** | 🟠 MEDIUM | Sales | Initial payment abono created without client ID linkage |
| **S8** | 🟠 MEDIUM | Sales | No deduplication for `createWithItems` on retry (mitigated by local transaction) |
| **S9** | 🟡 LOW | Sales | `confirm()` doesn't validate sale has items (sync hook blocks empty sales) |
| **S10** | 🟡 LOW | Sales | Timing window for item update arriving before sale deletion sync |
| **S6** | ⚪ INFO | Sales | No `distribucion_id` filter in bulk queries |
| **S7** | ⚪ INFO | Sales | `createDraft` balance_due logic (correct but non-obvious) |

---

## 5. KEY CODE REFERENCES

| What | File |
|------|------|
| Sales backend schema | `packages/backend/src/db/schema/sales.ts` |
| Abonos backend schema | `packages/backend/src/db/schema/payments.ts` |
| Sale tokens schema | `packages/backend/src/db/schema/sale-tokens.ts` |
| Frontend sale schema (Zod) | `packages/app/app/lib/db/schemas/sale.ts` |
| SaleService (frontend) | `packages/app/app/lib/services/sale-service.ts` |
| PaymentService (frontend) | `packages/app/app/lib/services/payment-service.ts` |
| SaleSyncHandler (backend) | `packages/backend/src/services/sync/handlers/SaleSyncHandler.ts` |
| AbonoSyncHandler (backend) | `packages/backend/src/services/sync/handlers/AbonoSyncHandler.ts` |
| Sync schemas (backend) | `packages/backend/src/services/sync/schemas/index.ts` |
| SyncEngine (backend) | `packages/backend/src/services/sync/framework/SyncEngine.ts` |
| SyncService (frontend) | `packages/app/app/lib/sync/sync-service.ts` |
| BaseService (frontend) | `packages/app/app/lib/services/base-service.ts` |
| Sale hooks | `packages/app/app/hooks/use-sales.ts` |
| Sales DB hooks | `packages/app/app/hooks/use-sales-db.ts` |
| Payment hooks | `packages/app/app/hooks/use-payments.ts` |
| Sale token hooks | `packages/app/app/hooks/use-sale-token.ts` |
| Public sale hooks | `packages/app/app/hooks/use-public-sale.ts` |
| Accounts receivable | `packages/app/app/hooks/use-accounts-receivable.ts` |
| Customer balance | `packages/app/app/hooks/use-customer-balance.ts` |
| Payment utils | `packages/app/app/lib/sales/payment-utils.ts` |
| Sale sync hooks | `packages/app/app/lib/sync/hooks/sales.ts` |
| Sale repository (backend) | `packages/backend/src/services/repository/sale.repository.ts` |
| Payment repository (backend) | `packages/backend/src/services/repository/payment.repository.ts` |
| Sync API route | `packages/backend/src/api/sync.ts` |
