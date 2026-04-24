# T-003 Update BaseService to Expose Tables

## Objective

Expose the engine's `tables` property through `BaseService` so that all subclasses can access tables via `this.tables` without importing them directly.

## Requirements Covered

- `FR-002`
- `NFR-003`

## Dependencies

- `T-002`

## Files or Areas Involved

- `packages/app/app/lib/services/base-service.ts` - Modify - Add `tables` getter
- `packages/app/app/lib/services/base-service.ts` - Modify - Update `SyncClientEngineLike` interface

## Actions

1. Update `SyncClientEngineLike` interface to include `tables`
2. Add a `tables` getter to `BaseService`
3. Import `SyncTables` type from the appropriate location (engine types or drizzle-schema)
4. Ensure all existing subclasses compile without changes (backward compatibility check)
5. Document the new pattern in comments (optional but recommended)

## Completion Criteria

- `BaseService` exposes `this.tables` with full type inference
- All existing service subclasses compile without modification
- No breaking changes to the constructor signature

## Validation

- TypeScript compilation of `base-service.ts` passes
- Create a temporary test to verify `this.tables.customers` is accessible in a service subclass
- Run app typecheck

## Risks or Notes

- If `SyncClientEngineLike` is used in many places, adding `tables` as a required property may break implementations. Consider making it optional initially or updating all implementations.
- The `SyncTables` type import must not create circular dependencies between `base-service.ts` and the engine.
