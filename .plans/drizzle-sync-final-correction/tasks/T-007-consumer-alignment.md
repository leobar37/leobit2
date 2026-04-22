# T-007: Consumer Alignment

## Objective

Align backend and app consumers with canonical entity naming and schema-derived runtime contracts.

## Requirements Covered

- `FR-007`
- `NFR-001`

## Dependencies

- `T-003`
- `T-004`
- `T-005`
- `T-006`

## Files or Areas Involved

- `packages/backend/src/services/sync/schemas/index.ts` — **Modify**
- `packages/backend/src/services/sync/types.ts` — **Modify**
- `packages/backend/src/services/sync/framework/types.ts` — **Modify**
- `packages/backend/src/services/sync/sync.service.ts` — **Modify**
- `packages/backend/src/services/sync/handlers/registry.ts` — **Review/Modify**
- `packages/backend/src/api/sync.ts` — **Modify**
- `packages/app/app/lib/sync/engine-service-factories.ts` — **Modify**
- `packages/app/app/lib/sync/sync-batch-processor.ts` — **Modify**
- `packages/app/app/lib/sync/sync-operation-lifecycle-service.ts` — **Modify**

## Actions

1. Replace legacy entity unions/enums with canonical schema-aligned values.
2. Ensure API validation and internal service contracts accept canonical entity names.
3. Update app service registration and sync helpers to use canonical entity identity.
4. Remove any remaining business-logic assumptions that depend on old camelCase entity keys.

## Completion Criteria

- Backend request validation, handler dispatch, and sync logging all use canonical names.
- App runtime and service registration operate with canonical names only.
- No runtime translation layer is needed for internal processing post-migration window.

## Validation

- Backend tests for sync schemas/handlers pass with canonical names.
- App sync tests pass with canonical names.
- Manual end-to-end sync smoke works across representative entities.

## Risks or Notes

- Keep compatibility handling from `T-005` only as long as needed; remove once confirmed drained.
