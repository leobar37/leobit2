# T-006 Validation and Integration Testing

## Objective

Verify that all changes work together: the engine exposes tables, BaseService provides access, custom services compile without direct schema imports, and the generator produces the correct file.

## Requirements Covered

- `FR-003`
- `FR-006`
- `NFR-002`
- `NFR-003`

## Dependencies

- `T-004`
- `T-005`

## Files or Areas Involved

- `packages/app/` - Review - Type checking and compilation
- `packages/drizzle-sync/` - Review - Generator tests
- `packages/shared/` - Review - Schema exports unchanged

## Actions

1. Run TypeScript type checking across all packages
2. Verify no table object imports remain in custom services
3. Test engine initialization in the app
4. Test a sample Drizzle query using `this.tables`
5. Run existing unit tests
6. Verify generated services compile
7. Check for circular dependencies

## Completion Criteria

- All TypeScript compilation passes with zero errors
- No table object imports from `@avileo/shared` in service files
- Engine initialization succeeds and `tables` property is populated
- All existing tests pass
- Generator produces valid `drizzle-schema.ts`

## Validation

- `bun run typecheck` in all three packages
- `bun test` in shared and drizzle-sync
- Manual verification: `engine.tables.customers` has Drizzle table methods
- Grep validation: no table imports from `@avileo/shared` in services

## Risks or Notes

- If TypeScript compilation fails, the errors may cascade. Fix them systematically.
- Ensure the `tables` property is available immediately after engine initialization, not lazily loaded.
- Watch for circular dependency errors if `SyncTables` type is defined in a location that creates a loop.
