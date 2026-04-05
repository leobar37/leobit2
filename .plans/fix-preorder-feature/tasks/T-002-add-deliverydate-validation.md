# T-002: Add DeliveryDate Validation for Pre_Order Creation

## Requirement

`FR-002` — API must reject creation of a `pre_order` without `deliveryDate` and must validate that `deliveryDate` is a valid future date.

## Context

Currently `deliveryDate` in the POST `/sales` endpoint is accepted as `t.Optional(t.String())` with zero validation (`packages/backend/src/api/sales.ts:86`). The service layer at `sale.service.ts:155-156` only checks `isPreOrder` to decide whether to persist it, but does not validate presence or format.

## Affected Files

- `packages/backend/src/api/sales.ts` — Add t-schema validation for `deliveryDate` on POST body
- `packages/backend/src/services/business/sale.service.ts` — Add service-layer guard (throw `ValidationError`)

## Changes Required

### 1. API Layer — Require `deliveryDate` for `pre_order`

In `packages/backend/src/api/sales.ts`, the POST body definition currently has:

```typescript
// Line 79
type: t.Optional(t.Union([t.Literal("instant_sale"), t.Literal("pre_order")])),
// Line 86
deliveryDate: t.Optional(t.String()),
```

Since t-schema does not support conditional required fields easily, add a custom guard. Add after the body parsing, before calling the service:

```typescript
if (body.type === "pre_order" && !body.deliveryDate) {
  return new BadRequestError("La fecha de entrega es requerida para pedidos programados");
}
```

Also validate the date format is YYYY-MM-DD using a regex or Date parsing:
```typescript
if (body.deliveryDate && isNaN(Date.parse(body.deliveryDate))) {
  return new BadRequestError("La fecha de entrega no es una fecha válida");
}
```

### 2. Service Layer — Validate future date

In `packages/backend/src/services/business/sale.service.ts`, in the `create` method after `isPreOrder` is set (around line 138), add:

```typescript
if (isPreOrder) {
  if (!data.deliveryDate) {
    throw new ValidationError("La fecha de entrega es requerida para pedidos programados");
  }
  const deliveryDateObj = new Date(data.deliveryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (deliveryDateObj < today) {
    throw new ValidationError("La fecha de entrega debe ser hoy o una fecha futura");
  }
}
```

Place this after line 138 (`const isPreOrder = data.type === "pre_order"`) and before the `salePayload` construction.

## Verification

1. Send POST `/sales` with `type: "pre_order"` and no `deliveryDate` — expect 400 with the error message
2. Send POST `/sales` with `type: "pre_order"` and `deliveryDate` in the past — expect 400
3. Send POST `/sales` with `type: "pre_order"` and valid future `deliveryDate` — expect 201
4. Existing `instant_sale` creation without `deliveryDate` still works

## Dependencies

None — backend-only task.

## Risks

- **Risk**: The service-layer validation runs after the API layer has already accepted the body. Both layers should be kept consistent so error messages are the same.
- **Risk**: Date comparison uses local timezone. The `sale-service.ts` already uses local date helpers; ensure consistency with existing date comparisons in the service.
