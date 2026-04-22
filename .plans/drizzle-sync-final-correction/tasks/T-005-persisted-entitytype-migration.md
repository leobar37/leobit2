# T-005: Persisted EntityType Migration

## Objective

Safely migrate persisted sync metadata rows from legacy camelCase entity identifiers to canonical snake_case names.

## Requirements Covered

- `FR-005`
- `NFR-001`

## Dependencies

- `T-001`

## Files or Areas Involved

- `packages/backend/src/db/schema/sync-operations.ts` — **Review**
- `packages/backend/src/db/schema/sync-dead-letter.ts` — **Review**
- `packages/backend/src/db/schema/sync-conflicts.ts` — **Review**
- Backend migrations/scripts — **Add/Modify** migration SQL
- `packages/app/app/lib/sync/schema/index.ts` — **Modify** (local migration hook if needed)
- `packages/app/app/lib/sync/schema-version.ts` — **Modify** (trigger local normalization)
- `packages/backend/src/api/sync.ts` — **Modify** (temporary alias compatibility, optional)

## Actions

1. Define alias map from legacy names to canonical names.
2. Add backend migration to rewrite stored entity identifiers in sync metadata tables.
3. Add client-side local DB normalization step for PGlite sync tables.
4. Ensure migration is idempotent.
5. Optionally add short-lived backend compatibility to accept legacy entity names while old clients drain.

## Completion Criteria

- Existing pending rows and conflicts are preserved and processable.
- Legacy names are normalized to canonical values in persisted metadata.
- Re-running migration causes no harmful changes.

## Validation

- Seed test rows with legacy names and verify migration rewrites them.
- Run sync flows after migration with pending operations.
- Confirm no backlog caused by unknown entity names.

## Risks or Notes

- This is the highest operational-risk task; execute with explicit before/after verification.
