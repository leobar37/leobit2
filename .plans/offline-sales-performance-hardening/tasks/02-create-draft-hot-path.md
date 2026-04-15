# T-002 Create Draft Hot Path

## Objective

Reduce latency of draft sale creation by removing redundant reads and non-critical work from the immediate response path.

## Requirements Covered

- `FR-002`
- `NFR-001`

## Dependencies

- `T-001`

## Files or Areas Involved

- `packages/app/app/lib/services/sale-service.ts` - Modify - Refactor `createDraft` return path to avoid redundant reloads.
- `packages/app/app/hooks/use-sales.ts` - Modify - Adjust post-success behavior to avoid unnecessary invalidation.
- `packages/app/app/components/sales/create-sale-type-sheet.tsx` - Modify - Seed editor state/cache before navigation.
- `packages/app/app/routes/_protected.ventas.$id.editar._index.tsx` - Modify - Reuse seeded data when present.

## Actions

1. Refactor `createDraft` to return sufficient created data without mandatory `findById` round-trip.
2. Remove immediate broad list invalidation from draft-create success path when not required for current screen.
3. Seed detail/editor query cache before navigating into editor route.
4. Ensure editor route can render from seeded cache and refresh in background when needed.

## Completion Criteria

- Draft creation executes fewer local round-trips than baseline.
- UI transition to editor is measurably faster and does not require duplicate immediate fetch.
- List correctness remains intact after eventual refresh/invalidation.

## Validation

- Compare before/after create-draft P50/P95 in baseline harness.
- Manual verify create -> navigate -> edit flow under offline mode.

## Risks or Notes

- Avoid stale cache artifacts by scoping seeded query data carefully.
