# T-007 Sales List and Search Optimization

## Objective

Improve local sales listing and search performance for multi-thousand row datasets.

## Requirements Covered

- `FR-005`
- `NFR-001`

## Dependencies

- `T-001`

## Files or Areas Involved

- `packages/app/app/lib/services/sale-service.ts` - Modify - Refactor list/search query shapes.
- `packages/app/app/lib/sync/schema/sales.schema.ts` - Modify - Add missing indexes aligned with real filters.
- `packages/app/app/lib/sync/schema/sale-items.schema.ts` - Modify - Add/adjust index strategy for lookup-heavy joins/subqueries.
- `packages/app/app/hooks/use-sales.ts` - Modify - Tune pagination/query behavior for mobile flow.
- `packages/app/app/routes/_protected.ventas._index.tsx` - Review/Modify - Ensure list UI uses scalable fetching strategy.

## Actions

1. Replace or narrow high-cost search predicates (`LIKE` + broad `EXISTS`) for local scale.
2. Add/adjust indexes for frequent list filters and ordering combinations.
3. Review count/pagination strategy to avoid unnecessary full-cost counts.
4. Validate query plans and user-perceived responsiveness under large local datasets.

## Completion Criteria

- List filtering/search operations show materially lower latency at scale.
- Added indexes are aligned with actual query patterns and do not regress write path excessively.
- Mobile list interactions remain responsive while paging/searching.

## Validation

- Targeted query timing comparisons before/after index and query-shape changes.
- Manual scenario: search/filter repeatedly with ~7000 sales dataset.

## Risks or Notes

- Over-indexing can hurt writes; index set should be intentional and measured.
