# Plan: Fix Compras Creation Flow (Align with Ventas)

## 1. Objective

Fix the broken purchase creation flow so it works like the sales flow: tapping (+) creates a draft purchase via API, then navigates to the form where the user adds items and saves.

## 2. Scope

- **Frontend**: Fix `useCreateDraftPurchase` to actually call the API instead of throwing an error. Update `purchase-form-context.tsx` to handle draft purchases properly.
- **Backend**: Allow creating a purchase with `items: []` and `status: "draft"`. Add a `confirmPurchase` endpoint to finalize drafts.
- **Files**: 3-4 files, ~50 lines of changes.

## 3. Verified Context

| Item | Status | Detail |
|------|--------|--------|
| Backend enum has `draft` | ✅ Verified | `purchaseStatusEnum` includes `draft` |
| `useCreateDraftPurchase` throws error | ✅ Verified | `hooks/use-purchases.ts:156` hardcoded `throw new Error(...)` |
| Backend `POST /purchases` requires `items` array | ✅ Verified | `api/purchases.ts` body validation requires `items` |
| Backend `PurchaseService.createPurchase` rejects empty items | ✅ Verified | `purchase.service.ts:63` throws if `items.length === 0` |
| Sales flow creates draft with empty items | ✅ Verified | `use-sales.ts:useCreateDraftSale` posts `{ items: [] }` |

## 4. Assumptions

1. The purchase form UI (`purchase-form-context.tsx`) already handles local state for items/supplier correctly — it just needs a real draft ID from the API.
2. No new database migrations needed — `draft` is already in the enum.
3. The confirm pattern (draft -> pending) is preferred over direct creation, matching sales.

## 5. Files Involved

### To Modify

| File | Purpose |
|------|---------|
| `packages/app/app/hooks/use-purchases.ts` | Fix `useCreateDraftPurchase` to call API; add `useConfirmPurchase` |
| `packages/backend/src/services/business/purchase.service.ts` | Allow empty items for draft creation; add `confirmPurchase` method |
| `packages/backend/src/api/purchases.ts` | Accept `status` in POST body; add `POST /:id/confirm` endpoint |
| `packages/app/app/components/purchases/purchase-form-context.tsx` | Handle draft purchases: load by ID, confirm on save instead of creating new |

## 6. Ordered Execution Steps

### Step 1: Fix backend to allow draft creation

**File**: `packages/backend/src/services/business/purchase.service.ts`

- In `createPurchase`, remove or conditionally skip the `items.length === 0` validation when `data.status === "draft"`.
- Add `confirmPurchase(ctx, id)` method that transitions `draft` -> `pending` and validates items exist.

### Step 2: Add confirm endpoint to backend API

**File**: `packages/backend/src/api/purchases.ts`

- Add `status` to POST body schema (optional, default `"pending"`).
- Make `items` optional or allow empty array in POST body schema.
- Add new route: `POST /:id/confirm` calling `purchaseService.confirmPurchase`.

### Step 3: Fix frontend hook

**File**: `packages/app/app/hooks/use-purchases.ts`

- Rewrite `useCreateDraftPurchase` to call `api.purchases.post({ supplierId: "", purchaseDate: today, items: [], status: "draft" })`.
- Add `useConfirmPurchase` mutation calling `api.purchases({ id }).confirm.post()`.

### Step 4: Update form context to use draft flow

**File**: `packages/app/app/components/purchases/purchase-form-context.tsx`

- When `purchaseId` exists (draft mode), load the purchase via `usePurchase(purchaseId)`.
- On save, if purchase is draft, call `confirmPurchase` instead of `createPurchase`.
- If no `purchaseId` (direct mode), keep existing `createPurchase` flow.

### Step 5: Test

- Tap (+) on Compras list -> should navigate to `/compras/nueva/:id` with draft.
- Add supplier, items, date.
- Tap Guardar -> should confirm draft and redirect to `/compras`.

## 7. Risks and Edge Cases

| Risk | Mitigation |
|------|------------|
| Draft without supplier fails validation on confirm | Ensure `confirmPurchase` validates supplierId exists |
| Empty items on confirm | Ensure `confirmPurchase` validates items.length > 0 |
| Race condition: user saves before draft loads | Disable save button while `isLoading` |

## 8. Validation Strategy

1. **Unit test hooks**: Verify `useCreateDraftPurchase` returns a purchase with `status: "draft"`.
2. **Integration test**: Full flow from list -> draft -> add items -> confirm -> list shows purchase.
3. **Manual test**: Same as integration test in browser.

## 9. Open Questions

| Question | Answer Needed |
|----------|---------------|
| Should draft purchases appear in the list? | Currently no "drafts" tab on Compras — probably hide them or add filter later |
| Should we support editing a draft after leaving the page? | Yes, via `/compras/nueva/:id` route already exists |
