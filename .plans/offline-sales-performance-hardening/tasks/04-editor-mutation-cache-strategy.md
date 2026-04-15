# T-004 Editor Mutation Cache Strategy

## Objective

Optimize sales editor mutation behavior to avoid broad invalidation/refetch for small, localized updates.

## Requirements Covered

- `FR-003`
- `NFR-001`

## Dependencies

- `T-002`

## Files or Areas Involved

- `packages/app/app/hooks/use-sales-db.ts` - Modify - Replace broad invalidations with narrow cache updates.
- `packages/app/app/hooks/use-sales.ts` - Modify - Align mutation success handlers with editor-focused query strategy.
- `packages/app/app/components/sales/new-sale.tsx` - Modify - Ensure components rely on shared editor state and avoid duplicate fetch triggers.
- `packages/app/app/components/sales/new-sale-context.tsx` - Modify - Consolidate editor data access patterns.

## Actions

1. Identify editor mutations that currently trigger full sale/list invalidation.
2. Implement targeted `setQueryData`/local patch flows where safe.
3. Keep eventual consistency by scheduling low-priority refresh only where necessary.
4. Verify editor subcomponents do not trigger duplicate detail reads.

## Completion Criteria

- Editor mutation latency improves under repeated item/customer/payment changes.
- Number of full-detail rereads during edit session is reduced.
- Data consistency remains correct throughout edit and finalize transitions.

## Validation

- Run edit session perf scenario with repeated item operations and compare query counts/timing.
- Manual verify totals, balances, and item list correctness.

## Risks or Notes

- Incorrect cache patching can introduce subtle UI/data divergence if not validated carefully.
