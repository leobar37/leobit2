# T-004: Allow DeliveryDate Update on Confirmed Pre_Orders

## Requirement

`FR-004` — Users must be able to reschedule the delivery date of a confirmed pre_order; the backend must permit this operation.

## Context

`packages/backend/src/services/business/sale.service.ts` at line 222-224 has a blanket guard:

```typescript
if (sale.status !== "draft") {
  throw new ValidationError("Solo se pueden editar ventas en borrador");
}
```

This rejects ALL field updates on any non-draft sale, including `deliveryDate` on confirmed pre_orders. Since confirmed pre_orders should allow rescheduling (product decision: Option A), this guard needs a targeted exception.

The frontend `RescheduleSaleDialog` already sends the correct mutation (`updateSale.mutateAsync({ id: saleId, input: { deliveryDate: newDate } })`). The backend just needs to allow it.

## Affected Files

- `packages/backend/src/services/business/sale.service.ts` — Relax guard in `updateSale` method for confirmed pre_order `deliveryDate` updates

## Changes Required

In `sale.service.ts`, refactor the update guard to allow `deliveryDate` changes on `confirmed` pre_orders while keeping other field edits blocked:

### 1. Replace the blanket draft-only guard

Current (line 222-224):
```typescript
if (sale.status !== "draft") {
  throw new ValidationError("Solo se pueden editar ventas en borrador");
}
```

New — allow deliveryDate on confirmed pre_orders only:
```typescript
// Allow deliveryDate updates on confirmed pre_orders (rescheduling)
const isDeliveryDateOnlyUpdate =
  sale.type === "pre_order" &&
  sale.status === "confirmed" &&
  Object.keys(data).length === 1 &&
  "deliveryDate" in data;

if (sale.status !== "draft" && !isDeliveryDateOnlyUpdate) {
  throw new ValidationError("Solo se pueden editar ventas en borrador");
}
```

### 2. Add deliveryDate validation for confirmed pre_order updates

If `isDeliveryDateOnlyUpdate` is true, still validate the new date is a future date. Add after the guard check:

```typescript
if (isDeliveryDateOnlyUpdate && data.deliveryDate) {
  const deliveryDateObj = new Date(data.deliveryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (deliveryDateObj < today) {
    throw new ValidationError("La fecha de entrega debe ser hoy o una fecha futura");
  }
}
```

This ensures rescheduling to a past date is rejected even when the field is otherwise allowed.

### 3. Frontend — improve error message (optional improvement)

In `reschedule-sale-dialog.tsx`, the catch block at line 74-77 currently shows a generic error. Since the backend now allows this operation, the dialog should work without changes. Optional: improve the toast message:

```typescript
} catch (error) {
  toast.error("Error al reprogramar", {
    description: error instanceof Error ? error.message : "Intenta de nuevo",
  });
}
```

## Verification

1. Open a confirmed pre_order in the editor
2. Click "Reprogramar entrega"
3. Select a new future date and confirm
4. Verify success toast and `deliveryDate` updated in the UI
5. Verify the update succeeds via API: `PATCH /sales/:id` with `deliveryDate`
6. Attempt to reschedule to a past date — expect 400 with validation error

## Dependencies

- T-002 (backend validation for pre_order creation) — shares the same date validation pattern, but T-002 is not a hard dependency

## Risks

- **Risk**: The `Object.keys(data).length === 1` check assumes no other fields are being sent. This is correct for the `RescheduleSaleDialog` but could be fragile if other callers start sending `deliveryDate` alongside other fields. Document the constraint.
- **Risk**: The `version` field must be incremented on the update even though the service doesn't validate it here — the repository handles it.
