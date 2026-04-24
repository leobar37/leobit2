# T-001 Fix Sync Configuration Inconsistencies

## Objective

Correct the canonical sync configuration so that all syncable entities are registered, priorities enforce parent-before-child ordering, and parent/child relationships match the database schema.

## Requirements Covered

- `FR-001`
- `FR-002`
- `NFR-003`

## Dependencies

- none

## Files or Areas Involved

- `packages/shared/src/sync-config.ts` - Modify - Add `files` to `SYNC_ENTITIES`, fix `visitas` and `abonos` priorities
- `packages/shared/src/sync-config.ts` - Modify - Update `ENTITY_PRIORITIES` map
- `packages/backend/src/services/sync/handlers/registry.ts` - Review - Verify handler registration for `files`
- `packages/drizzle-sync/src/sync.schema.json` (or equivalent config) - Modify - Fix `visitas` parent relationships
- `packages/app/app/lib/sync/generated/*` - Review - May need regeneration after config changes

## Actions

1. Add `"files"` to the `SYNC_ENTITIES` array with appropriate priority
2. Change `visitas` priority from `1` to `2` in `ENTITY_PRIORITIES`
3. Change `abonos` priority from `1` to `2` in `ENTITY_PRIORITIES`
4. Update `sync.schema.json` (or drizzle-sync config) so that `visitas` parents are `["customers", "distribuciones"]` instead of `["customers", "sales"]`
5. Verify that `files` has a registered handler in `registry.ts`
6. If generated files need refresh, run the drizzle-sync code generator
7. Update `sync-config.test.ts` (if exists) to assert the new configuration values

## Completion Criteria

- `SYNC_ENTITIES` includes `"files"`
- `ENTITY_PRIORITIES["visitas"]` equals `2`
- `ENTITY_PRIORITIES["abonos"]` equals `2`
- `visitas` sync config parents list does not include `"sales"`
- TypeScript compilation of `packages/shared` succeeds
- Unit tests for sync-config pass

## Validation

- Run `cd packages/shared && bun test` (or equivalent test command)
- Run `cd packages/shared && bun run typecheck`
- Verify `isSyncEntity("files")` returns `true`

## Risks or Notes

- Confirm whether `files` should actually sync offline or if it was intentionally excluded. If files are online-only, this task should instead document the exclusion and skip adding it.
- Regenerating sync services may create large diffs in `packages/app/app/lib/sync/generated/`. Review generated changes carefully before committing.
