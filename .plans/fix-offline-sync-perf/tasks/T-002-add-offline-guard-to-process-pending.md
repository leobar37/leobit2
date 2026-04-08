# T-002 Add Offline Guard to processPending

## Objective

Prevent `processPending()` from attempting network I/O when `navigator.onLine` is `false`. Currently it runs every 5 seconds regardless of connectivity, generating error logs and filling the dead-letter queue with noise when truly offline.

## Requirements Covered

- `FR-001`
- `FR-005` (partial — stale pull auto-recovery also depends on this)

## Dependencies

- None

## Files or Areas Involved

- `packages/app/app/lib/sync/sync-service.ts` - Modify - Add online guard at start of `processPending()`
- `packages/app/app/lib/sync/sync-service.ts` - Modify - Reset backoff/consecutiveFailures when going online
- `packages/app/app/lib/sync/coordinator.ts` - Modify - Ensure `handleOnline` resets sync state
- `packages/app/app/lib/sync/pull-service.ts` - Review - Confirm existing online guard at line 618

## Actions

1. **Add `navigator.onLine` guard to `processPending()`** in `sync-service.ts`. At the very start of the method (before any await), add:
   ```typescript
   if (!navigator.onLine) {
     console.log(`[SYNC] Offline - skipping push sync`);
     return { processed: 0, failed: 0, conflicts: 0 };
   }
   ```
   This is the same pattern `PullService` already uses at line 618 of `pull-service.ts`.

2. **Reset backoff state on successful online transition.** In `coordinator.ts`, the `handleOnline()` method at line 81 already calls `this.pushBackoff.reset()` and `this.pullBackoff.reset()`. However, `SyncService` has its own `consecutiveFailures` and `currentBackoff` fields that are not reset by the coordinator. In `handleOnline()`, after `pushBackoff.reset()`, also call `syncService.resetBackoff()` — add this method to `SyncService` if it doesn't exist.

3. **Ensure `SyncService` exposes a `resetBackoff()` method.** Add to `SyncService`:
   ```typescript
   resetBackoff(): void {
     this.consecutiveFailures = 0;
     this.currentBackoff = 0;
   }
   ```

4. **Wire the reset in `SyncCoordinator.handleOnline()`**. Confirm that `coordinator.handleOnline()` calls `syncService.resetBackoff()`. If not, add it alongside the existing `pushBackoff.reset()` call.

5. **Test offline behavior manually**:
   - Chrome DevTools → Network → "Offline" checkbox
   - Create 3 sales while offline
   - Wait 30 seconds (3 sync cycles)
   - Open PGlite devtools, run `SELECT COUNT(*) FROM sync_operations WHERE status = 'failed'` — should be 0
   - Uncheck offline, wait 10 seconds
   - Verify all 3 sales sync to server without errors

## Completion Criteria

- `processPending()` returns immediately with zero counts when `navigator.onLine === false`
- Zero `markFailed()` calls occur during a 1-minute offline window
- After reconnecting, queued operations sync successfully without manual intervention
- No new methods added to the public `ISyncService` interface (method is private or package-private)

## Validation

- Manual offline test (step 5)
- Unit test: mock `navigator.onLine = false`, call `processPending()`, assert zero network calls

## Risks or Notes

- **Risk**: Some environments (corporate proxies, PWA service workers) may report `navigator.onLine = true` even when requests fail. The existing backoff mechanism handles this gracefully. The guard only prevents the obvious offline case.
- **Note**: `processPending()` is also called directly by `forceSync()`. The guard must not affect `forceSync()` — a vendor might want to force-sync when they believe they are online. Consider passing an optional `ignoreOnlineCheck?: boolean` parameter to `processPending()` used only by `forceSync()`.
