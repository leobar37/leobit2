# Sync Runtime Migration to Framework Requirements

## Objective

Move the complete push sync runtime implementation from `packages/app/app/lib/sync/` into `@avileo/drizzle-sync/pglite` so the framework owns authoritative sync infrastructure. The app should only configure the engine, not duplicate sync logic.

## Scope

- **In scope**:
  - SyncAutoRunner (timer + backoff)
  - SyncMutex (push/pull coordination)
  - SyncEntityStatusUpdater (post-sync entity marking)
  - SyncOperationLifecycleService (state machine + self-heal)
  - SyncBatchProcessor (batch sending + priority ordering)
  - Completing PushSyncService stubs
  - Deprecating legacy app sync services
  - Unit tests for framework sync services
- **Out of scope**:
  - PullService migration (separate effort)
  - StagedPullCoordinator migration
  - E2E tests
  - Changing HTTP API contract with backend
  - React provider rewrites beyond cleanup

## Functional Requirements

- `FR-001` - SyncAutoRunner must support exponential backoff (base 1s, max 30s, 2x multiplier) with recordSuccess/recordFailure/resetBackoff
- `FR-002` - SyncMutex must prevent concurrent push/pull with re-entrant support for same operation type
- `FR-003` - SyncEntityStatusUpdater must mark entity `sync_status` as `synced` after successful push, using configurable `tenantColumn`
- `FR-004` - SyncOperationLifecycleService must manage operation states (pending → processing → completed/failed/conflict/deadLetter) with configurable self-heal rules
- `FR-005` - SyncBatchProcessor must fetch pending operations sorted by configurable entity priorities, chunk into batches, send via HTTP client, and update statuses
- `FR-006` - PushSyncService must have zero stubs: all methods (resetBackoff, retryAllDeadLetterOperations, resolveConflict, startAutoSync, getBackendConflicts, etc.) must have real implementations
- `FR-007` - The framework must accept `tenantColumn` configuration instead of assuming `tenant_id`
- `FR-008` - The framework must accept `entityPriorities` configuration for batch ordering
- `FR-009` - The framework must accept `selfHealRules` configuration for update→create conversion
- `FR-010` - Legacy app sync services (SyncService, SyncBatchProcessor, SyncAutoRunner, SyncOperationLifecycleService, SyncEntityStatusUpdater) must be deleted after framework implementation is verified

## Non-Functional Requirements

- `NFR-001` - Zero regression in existing sync behavior (offline writes, auto-sync, conflict detection, backoff)
- `NFR-002` - All changes must have accompanying unit tests in the framework package
- `NFR-003` - TypeScript type checking must pass across all packages after each task
- `NFR-004` - App bundle must not increase significantly (code should move, not duplicate)

## Acceptance Criteria

- App `lib/sync/` contains only app-specific code (staged pull, React providers, HTTP adapter, generated schemas)
- Framework `pglite/push-service.ts` has no stub methods
- Framework has dedicated unit tests for each migrated service
- `bun run typecheck` passes in both `packages/app` and `packages/drizzle-sync`
- `bun test` passes in `packages/drizzle-sync`
- Existing app tests that mock sync services continue to work (or are updated)

## Constraints

- Must preserve existing backend HTTP contract (`/sync/batch`, `/sync/changes`, `/sync/conflicts`)
- Must work with existing PGlite schema (no schema changes)
- Must maintain backward compatibility for existing `SyncClientEngine` consumers

## Open Questions

- Are there other consumers of `@avileo/drizzle-sync` besides Avileo app? (Affects how opinionated the framework can be)
- Should we keep a migration period where both implementations coexist with feature flag? (Risk mitigation)
