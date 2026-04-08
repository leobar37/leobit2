# T-005 Add Stale Pull Auto-Recovery on Online Event

## Objective

After stale pull detection stops the sync loop, the next `online` event must automatically call `forceReset()` to restart the pull loop, instead of requiring a manual page reload. Additionally, when `processPending()` repeatedly fails while online (transient network), the system should self-heal by resetting backoff and retrying.

## Requirements Covered

- `FR-005`

## Dependencies

- `T-002` (offline guard must be in place before this, because online-recovery logic depends on backoff state)

## Files or Areas Involved

- `packages/app/app/lib/sync/coordinator.ts` - Modify - `handleOnline()` must call `forceResetSync()` when stuck
- `packages/app/app/lib/sync/pull-service.ts` - Review - `forceReset()` and `getIsStuck()` methods at lines 143-162
- `packages/app/app/lib/sync/sync-service.ts` - Modify - Add `resetBackoff()` method
- `packages/app/app/lib/sync/sync-service.ts` - Modify - `processPending()` to self-heal after transient failures

## Actions

1. **Update `SyncCoordinator.handleOnline()`** to detect if sync is stuck and auto-recover:
   ```typescript
   private handleOnline = (): void => {
     console.log("[SyncCoordinator] Online - resuming sync");
     syncEvents.emit("sync:online", undefined);

     this.pushBackoff.reset();
     this.pullBackoff.reset();

     // If pull service is stuck (stale pull detected previously), force reset
     if (this.pullService.getIsStuck()) {
       console.log("[SyncCoordinator] Sync was stuck - forcing reset");
       this.forceResetSync();
       return;
     }

     // If push backoff is at max, reset it on reconnect
     if (this.syncService.getBackoffAtMax?.()) {
       this.syncService.resetBackoff();
     }

     if (!this.syncService.isRunning()) {
       this.syncService.startAutoSync();
     }
     if (!this.pullService.isRunning()) {
       this.pullService.startAutoPull();
     }

     if (this.forceSyncTimer) clearTimeout(this.forceSyncTimer);
     this.forceSyncTimer = setTimeout(() => this.forceSync(), this.FORCE_SYNC_DEBOUNCE_MS);
   };
   ```

2. **Add `getBackoffAtMax()` method to `SyncService`** to expose backoff state:
   ```typescript
   getBackoffAtMax(): boolean {
     return this.currentBackoff >= BACKOFF_MAX_MS;
   }
   ```

3. **Add self-healing to `processPending()` for transient network failures.** When `processPending()` catches a network error and increments `consecutiveFailures`, after reaching MAX_RETRIES the operations move to DLQ. However, if connectivity is restored, those operations stay in DLQ forever without auto-retry.

   Add a `syncService.retryDeadLetterAfterTimeout()` or modify `handleOnline()` to call `syncService.retryAllDeadLetterOperations()` when coming back online:
   ```typescript
   // In SyncService
   async retryAllDeadLetterOperations(): Promise<number> {
     const dlq = await this.getDeadLetterOperations();
     let retried = 0;
     for (const op of dlq) {
       const ok = await this.retryDeadLetterOperation(op.id);
       if (ok) retried++;
     }
     return retried;
   }
   ```

4. **Wire the auto-retry in `SyncCoordinator.handleOnline()`**:
   ```typescript
   if (this.pullService.getIsStuck()) {
     // forceResetSync includes pullService.forceReset() which clears stuck state
     this.forceResetSync();
   } else {
     // Just come back online - retry any DLQ operations
     const retried = await this.syncService.retryAllDeadLetterOperations();
     if (retried > 0) {
       console.log(`[SyncCoordinator] Re-enqueued ${retried} DLQ operations`);
     }
   }
   ```

5. **Test the stale pull auto-recovery manually**:
   - Trigger stale pull detection: use browser proxy (Charles/Burp) to intercept `/sync/changes` and return the same cursor repeatedly with `hasMore: true` and 0 changes, 5 times
   - After 5 consecutive stale pulls, auto-pull stops
   - In DevTools console, confirm `isStuck: true` in PullService status
   - Toggle browser offline → online (or use Network tab to re-enable)
   - Verify auto-pull restarts automatically without page reload
   - Verify queued operations begin syncing

## Completion Criteria

- After stale pull detection triggers `stopAutoPull()`, toggling browser offline → online automatically calls `forceResetSync()` and restarts the pull loop
- After transient network failure recovers, DLQ operations are automatically re-enqueued on the next online event
- No manual page reload needed to recover from stale pull or transient offline period
- Backoff resets to 0 on successful sync after reconnection

## Validation

- Manual test: stale pull → offline → online flow (step 5)
- DLQ auto-retry: have 2 operations in DLQ, toggle offline → online, verify both re-enqueued and eventually synced

## Risks or Notes

- **Risk**: Auto-recovery could cause thundering herd if many clients reconnect simultaneously after an outage. The debounced `forceSync()` (1 second) mitigates this.
- **Risk**: If the stale pull was caused by a server-side bug (not cursor), auto-recovery will just fail again. The `MAX_STALE_PULLS` guard (3 consecutive) is conservative enough to not loop forever on a real server bug.
- **Note**: This task does NOT cover alerting the user when stuck — just auto-recovery. User-facing notification of stuck state is separate UX work.
