# T-009: Debounce forceSync on Reconnect

**Requirement**: FR-006

## Action

Modify `packages/app/app/lib/sync/coordinator.ts`:

### Add debounce timer property

Around line 22:

```typescript
private forceSyncTimer: ReturnType<typeof setTimeout> | null = null;
private readonly FORCE_SYNC_DEBOUNCE_MS = 1000;
```

### Separate backoff reset from forceSync

Change `handleOnline` method (lines 64-72):

```typescript
private handleOnline = (): void => {
  console.log("[SyncCoordinator] Online - resuming sync");
  syncEvents.emit("sync:online", undefined);

  // Reset backoffs IMMEDIATELY (not debounced)
  this.pushBackoff.reset();
  this.pullBackoff.reset();

  // Debounce forceSync to handle rapid online/offline events
  if (this.forceSyncTimer) {
    clearTimeout(this.forceSyncTimer);
  }
  this.forceSyncTimer = setTimeout(() => {
    this.forceSyncTimer = null;
    this.forceSync();
  }, this.FORCE_SYNC_DEBOUNCE_MS);
};
```

### Clean up timer on stop

In `stop()` method (around line 54):

```typescript
stop(): void {
  if (this.forceSyncTimer) {
    clearTimeout(this.forceSyncTimer);
    this.forceSyncTimer = null;
  }
  // ... existing cleanup ...
}
```

### Update `reset()` in SyncService

Since `handleOnline` calls `this.pushBackoff.reset()` and `this.pullBackoff.reset()`, those backoff instances need a proper `reset()` method. Verify in `backoff.ts`:

```typescript
// Should exist — ensures backoff resets properly
reset(): void {
  this.failures = 0;
  this.currentDelay = 0;
}
```

## Files Modified
- `packages/app/app/lib/sync/coordinator.ts`

## Verification

Manual test: Simulate flaky connection (offline → online → offline → online rapidly). Only one forceSync should trigger. Check console for `[SyncCoordinator] Online - resuming sync` appearing once, not multiple times.

## Notes

The debounce only applies to `forceSync()`. Backoff resets still happen immediately on every `online` event, which is correct behavior.
