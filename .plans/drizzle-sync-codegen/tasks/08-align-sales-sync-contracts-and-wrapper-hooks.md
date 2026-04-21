# T-008 Align Sales Sync Contracts and Wrapper Hooks

## Objective

Align sales/sale_items sync contracts with generated primitives while preserving explicit complex sales workflows in wrapper hooks/services.

## Requirements Covered

- `FR-008`
- `FR-010`

## Dependencies

- `T-003`
- `T-005`
- `T-006`

## Files or Areas Involved

- `packages/backend/src/services/sync/schemas/index.ts` - Modify - Align accepted sales and sale_items payload shapes with generated local-first operations.
- `packages/backend/src/services/sync/handlers/SaleSyncHandler.ts` - Review/Modify - Ensure handler behavior supports aligned contract.
- `packages/app/app/hooks/use-sales.ts` - Modify - Keep as composition wrapper over generated primitives where complexity exists.
- `packages/app/app/lib/sync/generated/sdk.ts` - Generated - Verify sales primitive methods contract.

## Actions

1. Decide and enforce canonical sales sync contract (nested vs separate child ops compatibility strategy).
2. Ensure generated primitives for `sales` and `sale_items` can support wrapper flows.
3. Refactor `use-sales.ts` to consume generated primitives where possible while keeping complex transitions explicit.
4. Preserve money/weight serialization invariants in both directions.

## Completion Criteria

- Sales wrapper hooks can build on generated primitives without losing business workflows.
- Backend schema/handler accepts emitted operation payloads reliably.
- No regression in preorder/delivery/cancel/finalize lifecycle paths.

## Validation

- `cd packages/backend && bun run test:run`
- `cd packages/app && bun run test`
- Manual offline-to-online sales lifecycle validation.

## Risks or Notes

- Sales flows are highest-risk domain; keep wrapper logic explicit and well-scoped.
