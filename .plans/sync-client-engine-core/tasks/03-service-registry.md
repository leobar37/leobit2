# T-003 Implement Service Registry

## Objective

Add a service registry to the `SyncClientEngine` that instantiates and manages domain services based on entity definitions in the config, exposing them via a typed `getService<T>(name)` method.

## Requirements Covered

- `FR-006`
- `FR-012`

## Dependencies

- `T-001` (config types, specifically `EntityServiceDefinition` and `SyncClientEngineContext`)
- `T-002` (engine class must exist to add registry to)

## Files or Areas Involved

- `packages/drizzle-sync/src/client/sync-client-engine.ts` — **Modify** — Add registry methods and internal service map
- `packages/drizzle-sync/src/client/types.ts` — **Modify** — Ensure `EntityServiceDefinition` factory signature is correct
- `packages/app/app/lib/services/base-service.ts` — **Review** — Understand existing BaseService constructor contract for compatibility

## Actions

1. Add a private `Map<string, unknown>` to `SyncClientEngine` for storing instantiated services.
2. During `initialize()` (after internal services are created), iterate `config.entities` and:
   - Build a `SyncClientEngineContext` object: `{ pg, db, syncService, businessId, businessUserId }`
   - Call each `EntityServiceDefinition.factory(context)` to instantiate the service
   - Store the result in the map keyed by `entity.name`
3. Add `getService<T>(name: string): T` method that retrieves from the map, throwing if not found.
4. Add `hasService(name: string): boolean` for checking without throwing.
5. Add `getAllServiceNames(): string[]` for enumeration.
6. Ensure the `SyncClientEngineContext` type passed to factories matches what `BaseService` subclasses expect (pg, db, syncService, businessId, businessUserId).

## Completion Criteria

- `engine.getService('customers')` returns the service instance created by the factory
- `engine.getService('nonexistent')` throws a descriptive error
- Services are instantiated exactly once during `initialize()`
- The context passed to factories has all fields needed by `BaseService` subclasses
- No service is created before `initialize()` is called

## Validation

- `cd packages/drizzle-sync && bun run build` succeeds
- `cd packages/drizzle-sync && bunx tsc --noEmit` passes
- Unit test: register a mock service factory, call initialize, verify getService returns instance

## Risks or Notes

- If a factory throws during `initialize()`, the engine should either fail fast (preferred) or log and skip that service. Choose fail-fast for safety.
- The `syncService` in the context must be the library's `SyncService` (from `@avileo/drizzle-sync/pglite`), not the app's custom wrapper. This may require adapter logic in F-004 during migration.
