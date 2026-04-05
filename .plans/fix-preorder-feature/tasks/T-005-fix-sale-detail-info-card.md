# T-005: Add DeliveryDate Display to SaleDetailInfoCard

## Requirement

`FR-005` — Pre_order detail view must display the delivery date with a countdown or formatted date, consistent with the list card display.

## Context

`packages/app/app/components/sales/sale-detail-info-card.tsx` (lines 1-88) shows sale information rows with icons and labels. The `SaleCard` component in list view (at `sale-card.tsx`) shows `formatDeliveryCountdown(sale.deliveryDate)` producing strings like "Entrega hoy", "Entrega mañana", "Atrasado 2d", etc. The detail view currently shows `saleDate` (line 12-18) but does not show `deliveryDate` for pre_orders.

The `formatDeliveryCountdown` utility is in `packages/app/app/lib/date-utils.ts` (lines 266-285).

## Affected Files

- `packages/app/app/components/sales/sale-detail-info-card.tsx` — Add deliveryDate row for pre_orders
- Verify `Sale` type from `~/lib/services/sale-service` has `deliveryDate` field (should be confirmed by T-001)

## Changes Required

In `SaleDetailInfoCard`, add a delivery date row for pre_orders. This should use the `formatDeliveryCountdown` utility to match the list card behavior.

### 1. Add import for `formatDeliveryCountdown`

```typescript
import { formatDeliveryCountdown } from "~/lib/date-utils";
```

### 2. Add deliveryDate row conditionally for pre_orders

In the `rows` array (around line 20), add a conditional row after the `saleDate` row:

```typescript
const rows = [
  // existing rows...
  {
    icon: Calendar,
    label: "Fecha",
    value: formattedDate,
    accent: "text-muted-foreground",
  },
  // ADD: conditional pre_order delivery row
  ...(sale.type === "pre_order" && sale.deliveryDate
    ? [
        {
          icon: Calendar,
          label: "Fecha de entrega",
          value: formatDeliveryCountdown(sale.deliveryDate),
          accent: "text-indigo-600",
        },
      ]
    : []),
  // ... rest of existing rows
];
```

Note: `formatDeliveryCountdown` returns strings like "Entrega hoy" or "Atrasado 2d", which is user-facing text in Spanish. No additional formatting needed.

## Verification

1. Create a pre_order with a future delivery date
2. Navigate to the detail view (`/ventas/:id`)
3. Verify the "Fecha de entrega" row appears with the countdown text
4. Navigate to an instant_sale detail view — the row must not appear

## Dependencies

- T-001 (local schema fix) — the `Sale` type used by the component must have `type` and `deliveryDate` fields

## Risks

- **Risk**: Low. This is purely additive UI — existing instant_sale behavior is unchanged.
- **Risk**: `formatDeliveryCountdown` is also used by `SaleCard` — any changes to that utility will reflect here automatically.
