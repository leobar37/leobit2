# Unit Tests for Staged Sync System

## Objective

Create comprehensive unit tests for the staged sync system implementation, covering the StagedPullCoordinator, sync-stages utilities, useStagedSync hook, StagedSyncIndicator component, and backend getChanges method with entity filtering. Tests must follow the existing Vitest + Testing Library patterns in the codebase.

## Scope

### In Scope

- Unit tests for `StagedPullCoordinator` (sequential loading, error handling, progress tracking)
- Unit tests for `sync-stages.ts` utilities (entity filtering, stage lookup)
- Unit tests for `useStagedSync` hook (state management, callbacks, auto-start)
- Unit tests for `StagedSyncIndicator` component (rendering states, progress display)
- Unit tests for backend `sync.service.ts` getChanges with entityTypes filter
- Unit tests for backend `sync.ts` API endpoint query param parsing
- Mock implementations for PullService dependencies
- Follow existing test patterns from `change-applier.test.ts`

### Out of Scope

- Integration tests (backend/frontend communication)
- E2E tests (Playwright browser automation)
- Performance/load testing
- Database schema tests
- Sync operation handler tests (already exist)

## Verified Context

- **Test framework**: Vitest with `describe`, `expect`, `it`, `vi`, `beforeEach` pattern
- **Existing test location**: `packages/app/app/lib/sync/__tests__/change-applier.test.ts` (340 lines)
- **Mock pattern**: Uses `vi.mock()` for schema-mapper, manual mocks for PGlite/drizzle
- **Frontend test structure**: Tests use `mockPg`, `mockDb` as any type
- **Backend test structure**: Tests exist at `packages/backend/src/services/sync/framework/__tests__/OperationSorter.test.ts`
- **New files to test**:
  - `packages/app/app/lib/sync/staged-pull-coordinator.ts` (StagedPullCoordinator class)
  - `packages/shared/src/sync-stages.ts` (utility functions)
  - `packages/app/app/hooks/use-staged-sync.ts` (React hook)
  - `packages/app/app/components/sync/staged-sync-indicator.tsx` (React component)
  - `packages/backend/src/services/sync/sync.service.ts` (getChanges method)
  - `packages/backend/src/api/sync.ts` (endpoint handler)
- **Testing libraries**: vitest, @testing-library/react for component tests
- **Config files**: `vitest.config.ts` exists in packages/app

## Assumptions

- Vitest and @testing-library/react are already installed (verified in package.json)
- Existing test mocks can be reused (mockPg, mockDb patterns)
- Backend tests use similar mocking strategy as framework tests
- Components use shadcn/ui patterns (Card, Progress) which should be mocked
- The sync system is designed to be testable with dependency injection

## Files Involved

### Create (Test Files)

- `packages/app/app/lib/sync/__tests__/staged-pull-coordinator.test.ts` - Create - Unit tests for StagedPullCoordinator (sequential loading, error handling, progress callbacks, per-stage cursors)
- `packages/shared/src/__tests__/sync-stages.test.ts` - Create - Unit tests for sync-stages utilities (getEntitiesForStage, getStageForEntity, isEntityInStage)
- `packages/app/app/hooks/__tests__/use-staged-sync.test.ts` - Create - Unit tests for useStagedSync hook (state management, onProgress/onComplete callbacks, autoStart, reset)
- `packages/app/app/components/sync/__tests__/staged-sync-indicator.test.tsx` - Create - Unit tests for StagedSyncIndicator component (render states, progress bar, status icons)
- `packages/backend/src/services/sync/__tests__/sync.service.staged.test.ts` - Create - Unit tests for getChanges with entityTypes filter
- `packages/backend/src/api/__tests__/sync.staged.test.ts` - Create - Unit tests for /sync/changes endpoint with entityTypes query param

### Modify (Test Infrastructure)

- `packages/app/vitest.config.ts` - Review - Ensure component testing setup is correct for React Testing Library
- `packages/backend/vitest.config.ts` - Review - Ensure backend test config supports sync service tests

## Ordered Execution Steps

### Phase 1: Shared Utilities Tests

1. **Create sync-stages.test.ts**
   - Files: `packages/shared/src/__tests__/sync-stages.test.ts`
   - Action: Test all utility functions: getEntitiesForStage returns correct arrays for each stage, getAllStagedEntities returns flat list, isEntityInStage validates membership, getStageForEntity returns correct stage or null
   - Depends on: None
   - Mock requirements: None (pure functions)

### Phase 2: Frontend Core Tests

2. **Create staged-pull-coordinator.test.ts**
   - Files: `packages/app/app/lib/sync/__tests__/staged-pull-coordinator.test.ts`
   - Action: Mock PullService with pullWithOptions method, test executeStagedLoad calls stages in correct order (CRITICAL → RECENT → HISTORICAL), test error handling per stage (one fails, others continue), test progress callback notifications, test isAppUsable returns true after stage 2, test getTotalChangesApplied sums correctly
   - Depends on: Step 1 (understanding stage definitions)
   - Mock requirements: Mock PullService class with jest mock functions for pullWithOptions

3. **Create use-staged-sync.test.ts**
   - Files: `packages/app/app/hooks/__tests__/use-staged-sync.test.ts`
   - Action: Test hook with renderHook from @testing-library/react, test state updates when stages progress, test onProgress callback fired, test onComplete called with final state, test autoStart option, test reset function clears state, test isLoading/isUsable/isComplete derived states
   - Depends on: Step 2
   - Mock requirements: Mock StagedPullCoordinator, mock PullService

### Phase 3: Component Tests

4. **Create staged-sync-indicator.test.tsx**
   - Files: `packages/app/app/components/sync/__tests__/staged-sync-indicator.test.tsx`
   - Action: Test renders null when all stages complete, test renders loading UI when critical/recent loading, test renders usable message when critical+recent complete but historical loading, test displays correct status icons (CheckCircle2, Loader2, AlertCircle), test progress bar percentage calculation, test "X registros" count display, test error state rendering
   - Depends on: Step 3 (understanding state types)
   - Mock requirements: Mock Card, Progress, and icon components from lucide-react

### Phase 4: Backend Tests

5. **Create sync.service.staged.test.ts**
   - Files: `packages/backend/src/services/sync/__tests__/sync.service.staged.test.ts`
   - Action: Test getChanges with entityTypes filter returns only requested entities, test getChanges without entityTypes returns all entities (backward compatibility), test entityTypes combined with since filter works correctly, test empty entityTypes array treated as no filter
   - Depends on: None
   - Mock requirements: Mock db.query.syncOperations.findMany, mock RequestContext

6. **Create sync.staged.test.ts**
   - Files: `packages/backend/src/api/__tests__/sync.staged.test.ts`
   - Action: Test /sync/changes endpoint parses entityTypes query param (comma-separated), test endpoint passes parsed array to syncService.getChanges, test endpoint maintains backward compatibility when entityTypes not provided, test error handling for invalid query params
   - Depends on: Step 5
   - Mock requirements: Mock syncService, mock Elysia context

### Phase 5: Verification

7. **Run all tests and verify coverage**
   - Files: All test files created above
   - Action: Run `bun run test` in packages/app and packages/backend, verify all tests pass, verify coverage targets met (80%+ for new code)
   - Depends on: Steps 1-6

## Risks and Edge Cases

### Test-Specific Risks

1. **Mock complexity for PullService**: PullService has many dependencies (PGlite, drizzle). Testing StagedPullCoordinator requires mocking only pullWithOptions method without full PGlite mock.
   - Mitigation: Create minimal mock that only implements pullWithOptions with jest.fn()

2. **React hook testing complexity**: useStagedSync uses useState and useCallback which can be tricky to test with renderHook.
   - Mitigation: Use @testing-library/react's renderHook and act() for state updates, follow patterns from existing hook tests if any

3. **Component test flakiness**: StagedSyncIndicator has conditional rendering based on multiple state combinations.
   - Mitigation: Use test.each() or describe.each() to test all state combinations systematically

4. **Backend test database mocking**: Sync service tests require mocking Drizzle ORM queries.
   - Mitigation: Use same pattern as existing backend tests - mock db module with vi.mock()

### Edge Cases to Test

1. **Empty entityTypes array**: Should behave same as undefined (no filter)
2. **Invalid entity type names**: Should return empty results gracefully
3. **Stage loading with zero changes**: Should mark stage complete immediately
4. **Hook unmounting during load**: Should not cause memory leaks or state updates on unmounted component
5. **Rapid reset() calls**: Should handle race conditions gracefully
6. **Progress callback exceptions**: Should not break coordinator if callback throws

## Validation Strategy

### Test Execution

- **Frontend tests**: `cd packages/app && bun run test -- --run staged` (runs staged-related tests)
- **Backend tests**: `cd packages/backend && bun run test -- --run staged`
- **All tests**: `bun run test` from root (runs workspace tests)

### Coverage Targets

- StagedPullCoordinator: 90%+ lines covered
- sync-stages utilities: 100% lines covered (pure functions)
- useStagedSync hook: 85%+ lines covered
- StagedSyncIndicator: 80%+ lines covered (UI components have lower threshold)
- Backend getChanges: 90%+ lines covered

### Quality Gates

- All tests must pass before commit
- No test should have `only` or `skip` when committing
- Tests must not have console.error/console.log unless testing error cases
- Mock implementations should be in `__mocks__` directory or inline in test file following existing patterns

## Open Questions

1. **Should we test the actual localStorage cursor persistence?**: Testing localStorage in unit tests can be flaky. Should we mock localStorage or use a storage abstraction?

2. **Should we add integration test helpers?**: The plan is unit tests only, but should we create helper functions that could be reused for future integration tests?

3. **Component snapshot testing?**: Should StagedSyncIndicator use snapshot tests for UI states, or prefer explicit assertions?

4. **Backend test database**: Should backend tests use an in-memory SQLite database or mock Drizzle completely? Existing tests seem to mock.
