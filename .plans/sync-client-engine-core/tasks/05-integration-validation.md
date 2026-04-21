# T-005 Integration Validation

## Objective

Write integration-level validation that proves the engine works end-to-end: construction, initialization, service registration, lifecycle, and event emission. This is not a full test suite — it validates the contract for downstream features (F-002 through F-005).

## Requirements Covered

- `FR-001` through `FR-012` (validation of all)
- `NFR-001` through `NFR-005` (verification of all)

## Dependencies

- `T-001` (config types)
- `T-002` (engine class)
- `T-003` (service registry)
- `T-004` (factory function and entry point)

## Files or Areas Involved

- `packages/drizzle-sync/src/client/__tests__/` — **Create** — Test directory for engine tests
- `packages/drizzle-sync/src/client/__tests__/sync-client-engine.test.ts` — **Create** — Integration validation
- `packages/drizzle-sync/src/client/types.ts` — **Read** — Config types for test construction
- `packages/drizzle-sync/tsconfig.json` or `vitest.config.ts` — **Review** — Test runner configuration

## Actions

1. Create test directory and test file for the engine.
2. Write validation scenarios:
   - **Construction**: `createSyncClientEngine(config)` returns instance without error
   - **Initialization**: `engine.initialize()` creates internal services; verify sync queue tables exist
   - **Service registry**: Register a mock entity service, verify `getService()` returns it
   - **Lifecycle**: `engine.start()` then `engine.stop()` completes without error
   - **Event bridge**: Subscribe to `pull:complete` event, verify callback is called when pull completes
   - **Manual sync**: `engine.triggerSync()` and `engine.triggerPull()` invoke expected methods
   - **Status**: `engine.getStatus()` returns expected shape
   - **Error handling**: `engine.getService('nonexistent')` throws descriptive error
   - **Double initialize**: Calling `initialize()` twice is safe (idempotent)
   - **Start without init**: Calling `start()` before `initialize()` throws
3. Use mock implementations for PGlite, SyncService, PullService where needed (or test against real PGlite if available).
4. Verify no React imports in the test file itself (proves NFR-001).

## Completion Criteria

- All validation scenarios pass
- No React imports in test file
- Test file runs via `bun test` or `vitest` without configuration changes
- Existing test suite in `packages/drizzle-sync` still passes

## Validation

- `cd packages/drizzle-sync && bun test` passes (or appropriate test command)
- `cd packages/drizzle-sync && bun run build` succeeds
- `cd packages/drizzle-sync && bunx tsc --noEmit` passes

## Risks or Notes

- PGlite requires a WASM runtime. Tests may need to use a mock or in-memory PGlite. Check if existing tests in the package already have a mock setup.
- The test may need to mock `fetch` or the HTTP client since `SyncService` makes API calls. Use the library's `ISyncHttpClient` interface for mocking.
- This task is intentionally lightweight — full test coverage belongs in implementation, not planning. The goal is to validate the contract for F-002+ consumers.
