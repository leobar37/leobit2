# T-005 Deprecate Legacy App Sync Services

## Objective

Delete the duplicate sync services from `packages/app/app/lib/sync/` and consolidate the app to use only the framework's `SyncClientEngine` for sync operations. Clean up imports, providers, and any remaining references.

## Requirements Covered

- `FR-010` - Delete legacy app sync services
- `NFR-001` - Zero regression
- `NFR-003` - Type checking
- `NFR-004` - No bundle size increase

## Dependencies

- `T-001` (Extract Generic Sync Infrastructure)
- `T-002` (Migrate Operation Lifecycle Service)
- `T-003` (Complete PushSyncService)
- `T-004` (Migrate Batch Processor)

## Files or Areas Involved

- `packages/app/app/lib/sync/` - Delete files:
  - `sync-service.ts`
  - `sync-batch-processor.ts`
  - `sync-auto-runner.ts`
  - `sync-operation-lifecycle-service.ts`
  - `sync-entity-status-updater.ts`
  - `sync-mutex.ts`
  - `coordinator.ts` (if framework SyncCoordinator is sufficient)
- `packages/app/app/lib/sync/service-provider.tsx` - Modify | Remove legacy mode, keep engine mode only
- `packages/app/app/lib/sync/engine-provider.tsx` - Review | Ensure it covers all hooks
- `packages/app/app/lib/sync/index.ts` - Modify | Remove legacy exports
- `packages/app/app/routes/_protected.tsx` - Review | Ensure engine initialization is correct
- `packages/app/app/lib/sync/__tests__/` - Review | Update or remove tests for deleted services

## Actions

1. **Verify framework completeness**
   - Confirm all methods from app's `SyncService` are available in framework's `PushSyncService`
   - Confirm `SyncCoordinator` from framework covers all features from app's `coordinator.ts`
   - If any features are missing (e.g., specific event emission patterns), port them to framework first

2. **Delete legacy services**
   - Remove `sync-service.ts`
   - Remove `sync-batch-processor.ts`
   - Remove `sync-auto-runner.ts`
   - Remove `sync-operation-lifecycle-service.ts`
   - Remove `sync-entity-status-updater.ts`
   - Remove `sync-mutex.ts`
   - Remove `coordinator.ts` (if framework version is sufficient)

3. **Update service-provider.tsx**
   - Remove legacy mode entirely (the `if (!engine)` branch)
   - Keep only engine mode service retrieval
   - Simplify to a thin wrapper that reads from engine
   - Remove refs for legacy services (`syncServiceRef`, `pullServiceRef`, `coordinatorRef`)
   - Remove legacy `useEffect` that initializes services

4. **Update exports and imports**
   - Update `packages/app/app/lib/sync/index.ts` to remove legacy exports
   - Update any hooks or components that imported from local sync services
   - Ensure all imports point to `@avileo/drizzle-sync` or engine provider hooks

5. **Update or remove legacy tests**
   - Review `packages/app/app/lib/sync/__tests__/` for tests covering deleted services
   - Remove tests that are now covered by framework tests
   - Update tests that mock sync services to mock framework interfaces instead
   - Keep tests for app-specific sync logic (staged pull, HTTP adapter, etc.)

6. **Verify app initialization**
   - Check `_protected.tsx` engine creation and configuration
   - Ensure `createSyncClientEngine` receives all needed configuration:
     - `tenantColumn: "business_id"`
     - `entityPriorities` from `@avileo/shared`
     - `selfHealRules` for Avileo entities
     - `httpClient` via `createSyncEngineHttpClient`
   - Ensure `SyncEngineProvider` is used consistently

7. **Smoke test**
   - Run app dev server and verify sync initializes correctly
   - Verify offline writes still enqueue operations
   - Verify auto-sync still runs

## Completion Criteria

- App `lib/sync/` no longer contains legacy sync services
- `service-provider.tsx` has only engine mode
- All imports reference framework or engine provider
- App tests pass
- Type checking passes
- Dev smoke test passes (sync initializes, offline writes work)

## Validation

- Run `cd packages/app && bun run typecheck` - no errors
- Run `cd packages/app && bun test` - tests pass
- Manual smoke test: start dev server, verify sync status indicator works

## Risks or Notes

- **Risk**: This is the point of no return. Once legacy services are deleted, any missing functionality in the framework becomes a production bug.
- **Mitigation**: Before deleting, run the app for a full session with only engine mode to verify everything works.
- **Risk**: Some app tests may mock internal behavior of legacy services. These need careful updating.
- **Note**: Consider keeping a git branch with legacy code until this task is fully validated.
