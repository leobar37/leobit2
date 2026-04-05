# Fix Pre-Order Feature — Requirements

## Objective

Fix critical gaps in the pre_order ("Programar pedido") system that cause local schema validation failures, missing API validation, incomplete sync tracking, and inconsistent UI display across frontend, backend, and sync layers.

## Scope

### In Scope

- Local Zod schema (`packages/app/app/lib/db/schema.ts`) — add missing pre_order fields
- Backend API validation (`packages/backend/src/api/sales.ts`, `packages/backend/src/services/business/sale.service.ts`) — require and validate `deliveryDate` for pre_orders
- Sync config (`packages/shared/src/sync-config.ts`) — add `sale_items` to `SYNC_STATUS_TRACKED`
- Frontend component: `RescheduleSaleDialog` — add status guard for confirmed pre_orders
- Frontend component: `SaleDetailInfoCard` — display `deliveryDate` for pre_orders
- Frontend component: `SaleDetailSummaryCard` — show "Pedido" type badge

### Out of Scope

- Creating new pre_order creation flows (already functional)
- State machine refactoring (`packages/backend/src/services/transitions/sale.ts`)
- `orderDate` field population (exists in DB but no frontend code sets it)
- Offline-first behavior of pre_orders beyond schema and sync tracking

## Functional Requirements

- `FR-001` — Local Zod schema must validate and parse pre_order rows from PGlite without failures, including `type`, `deliveryDate`, `orderDate`, and extended status values (`confirmed`, `delivered`)
- `FR-002` — API must reject creation of a `pre_order` without `deliveryDate` and must validate that `deliveryDate` is a valid future date
- `FR-003` — `sale_items` rows must have their `sync_status` updated to `"synced"` after a successful sync operation
- `FR-004` — Users must not be able to trigger a `deliveryDate` reschedule API call that the backend will reject; the UI should reflect the actual capability based on sale status
- `FR-005` — Pre_order detail view must display the delivery date with a countdown or formatted date, consistent with the list card display
- `FR-006` — Pre_order detail view header must visually distinguish "Pedido" from "Venta" via a type badge

## Non-Functional Requirements

- `NFR-001` — Schema changes must be additive; no existing valid data may become invalid after the fix
- `NFR-002` — Validation errors must produce user-facing toast messages in Spanish (es-PE locale)
- `NFR-003` — All changes must follow existing naming conventions and patterns documented in the project's AGENTS.md files

## Acceptance Criteria

1. A pre_order created offline and synced renders correctly in the list and detail views without Zod validation errors
2. Attempting to create a `pre_order` without a `deliveryDate` returns a validation error before hitting the database
3. After a sync operation completes, `sale_items` rows for the synced sale show `sync_status = 'synced'` in the database
4. The "Reprogramar" button is either functional for the current sale status or is disabled/hidden with no confusing error toast
5. `SaleDetailInfoCard` shows a delivery date row for pre_orders with the same formatting as `SaleCard`
6. `SaleDetailSummaryCard` header shows "Pedido #XXXXXX" (not "Venta #XXXXXX") for pre_orders

## Constraints

- Backend validation must throw a `ValidationError` (per existing error hierarchy) rather than returning an HTTP error directly
- Local schema changes must use `z.string().nullable().optional()` for date fields to match the existing pattern for nullable fields in `saleSchema`
- Component changes must not break existing instant_sale flows

## Open Questions

- **Resolved**: Confirmed pre_orders should allow rescheduling (`FR-004`). The backend guard in `sale.service.ts` must be updated to allow `deliveryDate` updates on `confirmed` pre_orders. T-004 implements this.
