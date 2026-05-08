# T-006 Deposits And Container Views

## Objective

Add operational screens that make container balances and deposit guarantees visible and auditable for agua businesses.

## Requirements Covered

- `FR-009`
- `FR-012`

## Dependencies

- `T-005`

## Files or Areas Involved

- `packages/app/app/routes/` - Create/Modify - Add water container/deposit views under protected routes or integrate into reports/config as appropriate.
- `packages/app/app/components/customers/` - Modify - Link customer detail to ledger history.
- `packages/backend/src/api/` - Create/Modify - Add read endpoints for container and deposit summaries.
- `packages/backend/src/services/business/` - Create/Modify - Add summary queries and adjustment flows.

## Actions

1. Add container summary API by customer, route/zone, and business.
2. Add deposit summary API by customer and status.
3. Add customer detail sections for container ledger and deposit ledger.
4. Add an agua-only operational list for customers with containers outside or deposit issues.
5. Add adjustment actions for admin users with explicit reason fields.
6. Keep deposit amounts separate from sale revenue and accounts receivable displays.

## Completion Criteria

- Agua admins can see which customers have containers outside.
- Agua admins can see active/refunded/penalized deposit history.
- Adjustment actions are auditable and require a reason.
- Polleria users do not see water operational views.

## Validation

- Backend summary query tests.
- Browser QA for ledger visibility after completing route stops.
- Check empty/loading/error states on mobile.

## Risks or Notes

- Deposit UX must avoid implying that guarantees are normal sales revenue.
