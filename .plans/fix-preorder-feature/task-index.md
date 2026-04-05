# Fix Pre-Order Feature — Task Index

## Summary

- Mode: Structured
- Slug: `fix-preorder-feature`
- Requirements File: `requirements.md`
- Checklist File: `checklist.json`

## Requirements Coverage

| Requirement | Covered By |
| --- | --- |
| `FR-001` | `tasks/T-001-fix-local-sale-schema.md` |
| `FR-002` | `tasks/T-002-add-deliverydate-validation.md` |
| `FR-003` | `tasks/T-003-fix-sync-config-sale-items.md` |
| `FR-004` | `tasks/T-004-add-status-guard-reschedule.md` |
| `FR-005` | `tasks/T-005-fix-sale-detail-info-card.md` |
| `FR-006` | `tasks/T-006-fix-sale-detail-summary-card.md` |

## Task List

| Task ID | File | Purpose | Dependencies |
| --- | --- | --- | --- |
| `T-001` | `tasks/T-001-fix-local-sale-schema.md` | Add `type`, `deliveryDate`, `orderDate`, and extended status values to local `saleSchema` | none |
| `T-002` | `tasks/T-002-add-deliverydate-validation.md` | Require `deliveryDate` on `pre_order` creation; validate future date | none (backend-only) |
| `T-003` | `tasks/T-003-fix-sync-config-sale-items.md` | Add `"sale_items"` to `SYNC_STATUS_TRACKED` | none |
| `T-004` | `tasks/T-004-add-status-guard-reschedule.md` | Guard `RescheduleSaleDialog` based on sale status; clarify if confirmed pre_orders can be rescheduled | T-002 (backend must support reprogram first) |
| `T-005` | `tasks/T-005-fix-sale-detail-info-card.md` | Show `deliveryDate` with countdown on `SaleDetailInfoCard` | T-001 |
| `T-006` | `tasks/T-006-fix-sale-detail-summary-card.md` | Show "Pedido" type badge on `SaleDetailSummaryCard` header | T-001 |

## Suggested Execution Order

1. `T-001` — Local schema foundation; no dependencies; other frontend tasks depend on it
2. `T-002` — Backend validation for pre_order creation; no dependencies
3. `T-003` — Shared config fix; no dependencies; isolated
4. `T-004` — Backend change to allow `deliveryDate` on confirmed pre_orders; no task dependencies (but T-001 needed for type inference)
5. `T-005` — Depends on T-001 schema fix
6. `T-006` — Depends on T-001 schema fix

## Notes

- T-001, T-002, T-003, T-004 can all start in parallel (backend/frontend independent; T-004 uses existing types)
- T-004: the backend `updateSale` guard at `sale.service.ts:222-224` must be updated to allow `deliveryDate` on `confirmed` pre_orders before the frontend dialog works for confirmed orders
- T-005 and T-006 both depend on T-001 but are independent of each other and can run in parallel after T-001
