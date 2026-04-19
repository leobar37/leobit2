# T-005 — Migrate SyncService and HandlerRegistry to Use Library

## Objective

Replace `packages/backend/src/services/sync/sync.service.ts` and `packages/backend/src/services/sync/framework/HandlerRegistry.ts` to import from `@avileo/drizzle-sync/server`. The backend's `SyncService` becomes a thin composition layer that wires app-specific dependencies (Drizzle db, concrete repositories, RequestContext) into the library's `SyncEngine`. All 14 entity handlers are updated to extend the library's `BaseSyncHandler`.

## Requirements Covered

- `FR-001` — Backend's `SyncService.processBatch()` calls library's `SyncEngine.processBatch()`
- `FR-002` — All concrete sync handlers extend `BaseSyncHandler` from library
- `FR-006` — Library's `ConflictResolverRegistry` is used with all entity resolvers registered

## Dependencies

- T-003 (SyncEngine config and repository interfaces must be final)
- T-004 (repository interface implementations must be validated)

## Files or Areas Involved

- `packages/backend/src/services/sync/sync.service.ts` — Modify (replace direct SyncEngine with library import)
- `packages/backend/src/services/sync/framework/HandlerRegistry.ts` — Modify (import from library)
- `packages/backend/src/services/sync/handlers/SaleSyncHandler.ts` — Modify (extend library BaseSyncHandler)
- `packages/backend/src/services/sync/handlers/PurchaseSyncHandler.ts` — Modify
- `packages/backend/src/services/sync/handlers/DistribucionSyncHandler.ts` — Modify
- `packages/backend/src/services/sync/handlers/BaseSyncHandler.ts` — Modify (becomes re-export or thin subclass of library)
- `packages/backend/src/services/sync/handlers/core/GenericSyncHandler.ts` — Review (may extend BaseSyncHandler)
- `packages/backend/src/services/sync/handlers/core/StatefulSyncHandler.ts` — Review
- `packages/backend/src/services/sync/handlers/core/SyncHandlerBuilder.ts` — Review
- `packages/drizzle-sync/src/server/sync-engine.ts` — Import
- `packages/drizzle-sync/src/server/handler-registry.ts` — Import
- `packages/drizzle-sync/src/server/base-handler.ts` — Import
- `packages/drizzle-sync/src/server/conflict-resolver.ts` — Import

## Actions

### 5a. Replace HandlerRegistry

1. Update `packages/backend/src/services/sync/framework/HandlerRegistry.ts`:
   ```typescript
   import { HandlerRegistry, type HandlerFactory } from "@avileo/drizzle-sync/server";
   export { HandlerRegistry, type HandlerFactory };
   ```
2. Or: delete the file entirely and update all imports in the codebase to use `@avileo/drizzle-sync/server/handler-registry`
3. Update `sync.service.ts` import: `import { HandlerRegistry } from "@avileo/drizzle-sync/server"`
4. Verify `HandlerRegistry.register()` calls still work — handler factory signature must be compatible with the library's `HandlerFactory` type

### 5b. Replace BaseSyncHandler

1. Update `packages/backend/src/services/sync/handlers/BaseSyncHandler.ts`:
   - Either re-export from library:
     ```typescript
     export { BaseSyncHandler } from "@avileo/drizzle-sync/server";
     export type { ... } from "@avileo/drizzle-sync/server";
     ```
   - Or keep as a thin subclass if backend-specific overrides are truly necessary (should be rare after T-002)
2. Verify all concrete handlers still extend `BaseSyncHandler` without changes

### 5c. Migrate SyncService

1. In `sync.service.ts`:
   - Replace: `import { SyncEngine } from "./framework/SyncEngine"`
   - With: `import { SyncEngine } from "@avileo/drizzle-sync/server"`
2. Construct `SyncEngine` with app-specific config:
   ```typescript
   this.engine = new SyncEngine(deps, {
     db: db, // Drizzle client implementing DbClient
     syncOpRepo: new SyncOperationRepository(), // implements ISyncOperationRepository
     syncConflictRepo: new SyncConflictRepository(),
     logger: createSyncLoggerAdapter(syncLogger), // bridges to ISyncLogger
     now: () => toISODate(now()),
     savepointSql: (name) => sql`SAVEPOINT ${sql.raw(name)}`,
     releaseSavepointSql: (name) => sql`RELEASE SAVEPOINT ${sql.raw(name)}`,
     rollbackSavepointSql: (name) => sql`ROLLBACK TO SAVEPOINT ${sql.raw(name)}`,
   });
   ```
3. Verify `processBatch(ctx, operations)` call still works — the method signature must match
4. Keep `registerHandlers()` logic identical — handler registration is app-specific

### 5d. Register Conflict Resolvers from Library

1. Library's `ConflictResolverRegistry` (from `@avileo/drizzle-sync/server`) must have all entity conflict resolvers registered
2. In `sync.service.ts` constructor, after engine creation:
   ```typescript
   import { ConflictResolverRegistry } from "@avileo/drizzle-sync/server";
   // Register all entity conflict resolvers (same as library's ConflictResolverRegistry.register calls)
   ConflictResolverRegistry.register("sales", new SaleConflictResolver());
   ConflictResolverRegistry.register("customers", new CustomerConflictResolver());
   // ... etc.
   ```
3. If library's registry already has default resolvers: skip re-registering
4. If backend has custom resolvers not in library: add them to both the library and the backend

### 5e. Wire SyncPipeline (if Option B chosen in T-003)

If T-003 chose Option B (SyncPipeline as backend-only wrapper):
1. Keep `SyncPipeline.ts` in backend
2. `SyncService` calls `pipeline.execute()` instead of `engine.processBatch()` directly
3. `pipeline` internally calls `engine.processBatch()` with pre/post middleware

### 5f. Run typecheck and tests

1. `cd packages/backend && bun run typecheck` — must pass
2. `cd packages/backend && bun test` — must pass (especially sync handler tests)
3. Fix any import mismatches or type errors

## Completion Criteria

- `sync.service.ts` imports `SyncEngine` from `@avileo/drizzle-sync/server`
- `HandlerRegistry` in backend comes from `@avileo/drizzle-sync/server`
- `BaseSyncHandler` in backend comes from `@avileo/drizzle-sync/server`
- All 14 entity handlers continue to extend `BaseSyncHandler` and function identically
- `ConflictResolverRegistry` registrations are wired to library's registry
- Backend typecheck passes

## Validation

- `cd packages/backend && bun run typecheck` — zero errors
- `cd packages/backend && bun test` — all tests pass
- Manual test: send a sync batch to `/sync/batch` endpoint and verify same behavior as pre-migration (use existing E2E tests)

## Risks or Notes

- If the library's `SyncEngine.processBatch` signature differs from the backend's (e.g., different return shape), this is caught in typecheck. The audit in T-001 should have identified this.
- Handler factory compatibility: the library's `HandlerFactory` type is `(deps: SyncEngineDeps) => ISyncHandler`. Backend's factories match this signature. If not, they must be updated.
- This is the task most likely to surface unexpected incompatibilities discovered during actual import.
