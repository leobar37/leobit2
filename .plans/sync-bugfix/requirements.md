# Sync Bugfix — Requirements

## FR-001: Single PullService Instance
The app must have exactly ONE PullService running at any time. The SyncCoordinator's PullService is the single source of truth for pull sync. PullSyncWrapper must be removed.

**Verification**: Only one interval should fire every 10s hitting `/sync/changes`. Can verify via network tab or logs.

## FR-002: Cursor Always Advances
When the server returns a `nextSince` cursor, the client must save it regardless of whether changes were successfully applied. Failed changes are logged but must not block cursor advancement.

**Verification**: Add test where server returns 3 changes that all fail to apply. Next pull request must send the new cursor, not retry the same page.

## FR-003: DELETE Requires businessId
All DELETE operations in the change-applier must include `business_id` in the WHERE clause to enforce multi-tenancy.

**Verification**: Unit test that DELETE for entity X with businessId A must NOT affect entity X with businessId B.

## FR-004: Requests Are Cancellable
Network requests in sync operations (push and pull) must accept an AbortSignal. When the SyncCoordinator stops, all in-flight requests must be cancelled.

**Verification**: Navigate away during active sync. No state updates after unmount. No error logs from aborted requests.

## FR-005: Backoff Is Cancellable
Exponential backoff delays must be cleared when the sync service stops or resets.

**Verification**: After a failed sync followed by a reconnect, backoff must reset to 0 immediately.

## FR-006: forceSync Debouncing
On reconnect, `forceSync()` must not fire multiple times from rapid `online` events. Backoff resets must still fire immediately.

**Verification**: Simulate flaky connection (online-offline-online rapidly). Only one forceSync should execute.

## FR-007: Staged Pull Is Abortable
The staged pull coordinator must check online status within its loading loops. If offline, it must stop gracefully.

**Verification**: Go offline during staged load. No pending promises after offline event.

## FR-008: Backend Handler Tests
CustomerSyncHandler and ProductSyncHandler must have unit tests covering create, update, delete, and conflict scenarios.

## FR-009: MSW Sync Mock Handlers
E2E test mocks must include handlers for `/sync/batch` and `/sync/changes` so sync flows can be tested end-to-end.

## FR-010: ChangeApplier DELETE Test
ChangeApplier must have a test verifying DELETE includes businessId filter and does not affect records of other businesses.

## Non-Requirements (Out of Scope)
- XState or state machine refactor
- ElectricSQL integration
- Performance optimization beyond bug fixes
- New E2E sync flow tests (requires MSW handlers first — FR-009)
