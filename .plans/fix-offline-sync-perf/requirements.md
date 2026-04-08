# Fix Offline Sync & Performance Requirements

## Objective

Fix critical bugs and performance issues in the offline-first sync system so the app is reliable offline, responsive at scale, and shows correct data after sync.

## Scope

- **In scope**: Offline behavior, TanStack Query invalidation, sales pagination, DLQ recovery, stale pull recovery
- **Out of scope**: Backend sync handlers, Electric SQL, schema migrations, new sync entities

## Functional Requirements

- `FR-001` — **Offline push guard**: When `navigator.onLine` is `false`, `processPending()` must not attempt any network I/O and must return immediately. No error logging, no backoff, no queue growth.
- `FR-002` — **TanStack invalidation on pull**: After a successful pull completes and changes are applied, all affected TanStack Query caches must be invalidated so UI reflects the new data. Specifically, `pullService.setOnChangesApplied()` must be called in `ServicesProvider` with a callback that calls `queryClient.invalidateQueries()` per entity type.
- `FR-003` — **Sales pagination**: `useSales()` must never call `findByBusiness()` (unbounded). All list hooks must use `findPageByBusiness()` with a page size of 50. The `usePaginatedSales` hook must be the default for sales lists.
- `FR-004` — **DLQ recovery UI**: A DLQ section must be added to the sync debug panel showing dead-letter operations (entity type, operation, error, attempts). Each operation must have "Retry" (re-enqueue) and "Discard" (delete) actions.
- `FR-005` — **Stale pull auto-recovery**: After a stale pull detection triggers `stopAutoPull()`, the next successful `online` event must automatically call `forceReset()` to restart the pull loop, not require manual page reload.

## Non-Functional Requirements

- `NFR-001` — **Backward compatibility**: No existing public API may change (hooks, service methods, event signatures)
- `NFR-002` — **Performance**: Sales list queries must use `LIMIT/OFFSET` with a cap of 50 records per page
- `NFR-003` — **Zero offline noise**: When offline, sync loop must not emit errors, must not add to DLQ, must not log failures

## Acceptance Criteria

1. Vendor can create, confirm, and cancel sales while completely offline for 30 minutes
2. After going offline and back online, all queued sales appear in the server dashboard
3. After another device modifies a sale, pulling the latest changes immediately reflects in the UI
4. Sales list with 1000 records loads in < 500ms
5. DLQ operations are visible and retryable from the sync debug panel
6. After a stale pull, switching to a different network automatically resumes sync without page reload

## Constraints

- All changes are frontend-only (packages/app)
- TanStack Query `queryClient` must be accessible in the sync layer via React context
- PGlite is the single source of truth; server is authoritative only after successful sync
