# T-006: Add Pre_Order Type Badge to SaleDetailSummaryCard

## Requirement

`FR-006` — Pre_order detail view header must visually distinguish "Pedido" from "Venta" via a type badge.

## Context

`packages/app/app/components/sales/sale-detail-summary-card.tsx` (lines 1-169) builds the sale summary header. Line 80 hardcodes "Venta #" regardless of sale type:

```typescript
<p className="truncate text-lg font-bold tracking-tight text-foreground">
  Venta #{sale.id.slice(-6)}
</p>
```

The `SaleCard` component at `sale-card.tsx` already shows this distinction correctly using an indigo `Package` icon and "Pedido" label for pre_orders. The detail view should match.

## Affected Files

- `packages/app/app/components/sales/sale-detail-summary-card.tsx` — Update header text and add type badge

## Changes Required

### 1. Update header text

Change line 80:
```typescript
Venta #{sale.id.slice(-6)}
```
To:
```typescript
{sale.type === "pre_order" ? "Pedido" : "Venta"} #{sale.id.slice(-6)}
```

### 2. Add type badge (optional but recommended for consistency with SaleCard)

After the header line (around line 81), add a badge similar to the workflow badge styles. Since there's already a "workflow" badge showing status (draft/confirmed/etc), add a separate type indicator only for pre_orders:

```typescript
{sale.type === "pre_order" && (
  <span className="ml-2 inline-flex items-center rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-semibold text-indigo-700">
    Pedido
  </span>
)}
```

### 3. Verify `sale.type` is accessible

Confirm the `Sale` type imported from `~/lib/services/sale-service` has a `type` field. This should be the case after T-001.

## Verification

1. Navigate to a pre_order detail view — header should show "Pedido #XXXXXX" with indigo type badge
2. Navigate to an instant_sale detail view — header should show "Venta #XXXXXX" with no type badge

## Dependencies

- T-001 (local schema fix) — the `Sale` type used by the component must have `type` field

## Risks

- **Risk**: Low. This is purely additive UI with no side effects on existing instant_sale views.
- **Risk**: The existing `getWorkflowBadgeStyles()` already has a case for `"confirmed"` (blue-100 text-blue-700), which overlaps visually with the indigo pre_order color. The pre_order type badge is additive and does not conflict.
