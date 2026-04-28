# T-003 Operation Grouping And Ordering

## Objective

Add explicit grouping/correlation semantics for compound offline operations so sale headers, sale items, and related abonos can be processed, retried, debugged, and tested coherently.

## Requirements Covered

- `FR-004`
- `FR-006`
- `NFR-002`
- `NFR-004`

## Dependencies

- `T-001`
- `T-002`

## Files or Areas Involved

- `packages/drizzle-sync/src/core/types.ts` - Modify - Extend `EnqueueParams` if grouping/correlation needs to be accepted by local enqueue calls.
- `packages/drizzle-sync/src/core/interfaces.ts` - Review/Modify - Keep write-port and operation interfaces aligned.
- `packages/drizzle-sync/src/client/` - Review/Modify - Ensure queued operations persist grouping/correlation metadata through push.
- `packages/drizzle-sync/src/pglite/` - Review/Modify - Ensure local queue schema and processors retain grouping/correlation metadata.
- `packages/backend/src/api/sync.ts` - Review - Backend already accepts optional `correlationId`; confirm final field mapping.
- `packages/backend/src/services/sync/framework/` - Review/Modify - Ensure batch processing uses grouping/order metadata where required.
- `packages/backend/src/sync.config.ts` - Review/Modify - Add or correct parent relation metadata for target entities.
- `packages/shared/src/sync-config.ts` - Review/Modify - Keep priorities aligned with the grouping strategy.
- `packages/app/app/lib/services/base-service.ts` - Modify - Allow services to pass grouping/correlation metadata when queueing operations.

## Actions

1. Choose one canonical grouping field for frontend/domain services. Prefer using backend-supported `correlationId` unless `syncGroupId` is required for persisted local queue compatibility.
2. Extend local queue types and persistence so queued operations preserve grouping/correlation metadata from enqueue to `/sync/batch`.
3. Add a service-level way to pass grouping metadata through `BaseService.queueSync` without requiring each generated service to know business grouping rules.
4. Ensure compound sale operations can share one grouping value across the sale header and all sale items.
5. Ensure optional abonos related to a sale can include the same group/correlation when part of one logical workflow.
6. Review backend entity ordering and parent relation metadata for `customers -> sales`, `sales -> sale_items`, and `customers/sales -> abonos`.
7. Add tests for grouped operation serialization and backend processing order with parent-child dependencies.

## Completion Criteria

- App-generated queued operations can include grouping/correlation metadata.
- Push payloads include that metadata in the backend-supported contract.
- Backend processing order remains parent-before-child for grouped sales/items and fails/retries explicitly when dependencies are missing.
- Tests demonstrate grouped sale + sale_items operations preserve order and metadata.

## Validation

- `bun run --cwd packages/drizzle-sync test` if available.
- `bun run sync:validate`
- Targeted backend sync batch tests for grouped operations.
- Targeted app/local queue tests for metadata persistence.

## Risks or Notes

- Local persisted queue schema changes may require a migration or defensive read path for existing queued operations.
- Do not add both `syncGroupId` and `correlationId` as independent concepts without a mapping rule; duplicated semantics will make debugging harder.
- Generated services may need regeneration if enqueue signatures or generated queue calls change.
