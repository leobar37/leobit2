# T-002 Extend SyncClientEngine with Tables Property

## Objective

Add a typed `tables` property to `SyncClientEngine` that exposes all Drizzle table objects, making them accessible to services through the engine instance.

## Requirements Covered

- `FR-001`
- `FR-006`
- `NFR-001`
- `NFR-002`

## Dependencies

- `T-001`

## Files or Areas Involved

- `packages/drizzle-sync/src/client/sync-client-engine.ts` - Modify - Add `tables` property
- `packages/drizzle-sync/src/client/types.ts` - Modify - Update `SyncClientEngine` interface
- `packages/app/app/lib/sync/generated/engine.ts` - Modify - Inject tables into engine instance
- `packages/app/app/lib/sync/generated/drizzle-schema.ts` - Review - Import source

## Actions

1. Define a `SyncTables` type in `types.ts` that maps table names to their Drizzle table objects
2. Add `tables: SyncTables` to the `SyncClientEngine` interface/class
3. In `sync-client-engine.ts`, import the tables from `drizzle-schema.ts` (or pass them via config)
4. Initialize `this.tables` in the engine constructor with all table references
5. Update `createAvileoSyncEngine` in `packages/app/app/lib/sync/generated/engine.ts` to pass tables to the engine
6. Ensure `getDb()` continues to work unchanged (backward compatibility)

## Completion Criteria

- `SyncClientEngine` has a `tables` property with full TypeScript IntelliSense
- `engine.tables.customers` returns the same object as the imported `customers` table
- No runtime overhead (simple object reference, not getter/factory)
- Engine initialization succeeds with the new property

## Validation

- TypeScript compilation passes with no errors
- Verify `engine.tables` has autocomplete for all table names
- Test engine initialization in `packages/app`

## Risks or Notes

- Avoid circular dependencies: engine should not import from app-specific paths. Consider passing tables via config or making the type generic.
- If tables are passed via config, ensure `SyncClientEngineConfig` is updated accordingly.
- The `tables` object should be created once during initialization, not per-access.
