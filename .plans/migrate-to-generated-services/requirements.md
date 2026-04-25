# Requirements: Migrate to Generated Services

## Objective

Unify Avileo's frontend service layer by fixing the `drizzle-sync` type contract, extending generated services with custom business logic, and migrating all hooks to use `useEngineService<T>()`. Remove redundant `registerAppServices` and eliminate ~111 repetitive `engine.use()` calls.

## Scope

- **In scope**:
  - Fix `drizzle-sync` factory type to accept `SyncClientEngine` instance
  - Update `drizzle-sync` tests to reflect new factory signature
  - Extend generated services with custom methods from manual services
  - Update `createAvileoSyncEngine` entities array to use extended services
  - Delete `registerAppServices.ts`
  - Migrate all hooks to `useEngineService<T>()`
  - Update direct service consumers (components, contexts)
  - Run typecheck and tests to validate

- **Out of scope**:
  - Backend API changes
  - Database schema migrations
  - New feature development
  - E2E test rewrites (unless broken by type changes)
  - Service generator output format changes (same CRUD methods)

## Functional Requirements

- `FR-001` — `drizzle-sync` `EntityServiceDefinition.factory` must receive `SyncClientEngine` (which implements `SyncClientEngineLike`) instead of `SyncClientEngineContext`
- `FR-002` — `SyncClientEngine.instantiateServices()` must pass `this` (the engine instance) to `definition.factory()`
- `FR-003` — All generated service classes must remain instantiable with a `SyncClientEngineLike` constructor parameter
- `FR-004` — Manual service classes must extend their generated counterparts and only add custom business methods
- `FR-005` — Manual service classes must not override CRUD methods (`create`, `update`, `delete`, `findById`, `list`) unless they add business logic beyond what the generated version provides
- `FR-006` — `createAvileoSyncEngine` must register extended service classes in its `entities` array
- `FR-007` — `registerAppServices.ts` must be deleted and all its functionality absorbed into `createAvileoSyncEngine`
- `FR-008` — All hooks must use `useEngineService<T>("name")` instead of `engine.use("name", factory)`
- `FR-009` — Non-hook consumers of services (components, contexts) must also use `useEngineService` or equivalent engine API
- `FR-010` — All TypeScript errors introduced by the migration must be resolved

## Non-Functional Requirements

- `NFR-001` — Zero runtime behavior change: all custom business logic must work identically before and after migration
- `NFR-002` — No breaking changes to hook APIs (same function signatures, return types, query keys)
- `NFR-003` — All existing unit and integration tests must continue to pass

## Acceptance Criteria

- `createAvileoSyncEngine` can instantiate and register all 14+ entity services without `registerAppServices`
- `useEngineService<CustomerService>("customers")` returns a working service with both generated and custom methods
- No file in `packages/app/app/hooks/` contains `engine.use(`
- `packages/app/app/lib/sync/register-services.ts` does not exist
- `bun run typecheck` passes in `packages/app/`
- `bun test` passes in `packages/drizzle-sync/`

## Constraints

- Must maintain backward compatibility with existing hook APIs (function signatures, query keys, return types)
- Cannot change the generated service class structure (still extends BaseService, still has same CRUD methods)
- Cannot modify the backend sync protocol or database schema

## Open Questions

- Should we keep `useSyncEngine()` exported for edge cases, or deprecate it in favor of `useEngineService`?
- Should we create a convenience wrapper like `useCustomerService()` to avoid repeating `useEngineService<CustomerService>("customers")` in every hook function?
