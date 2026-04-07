# T-008: Make Backoff Cancellable

**Requirement**: FR-005

## Action

Modify `packages/app/app/lib/sync/sync-service.ts`:

### Add backoffTimer property

Around line 437 (with other properties):

```typescript
private backoffTimer: ReturnType<typeof setTimeout> | null = null;
```

### Modify `applyBackoff` to use stored timer reference

```typescript
private async applyBackoff(): Promise<void> {
  if (this.currentBackoff > 0) {
    console.log(
      `[SyncService] Waiting ${this.currentBackoff}ms due to previous failures`
    );
    return new Promise((resolve) => {
      this.backoffTimer = setTimeout(() => {
        this.backoffTimer = null;
        resolve();
      }, this.currentBackoff);
    });
  }
}
```

### Modify `reset()` method to clear timer

Find the `reset()` method (if it exists) or create one:

```typescript
reset(): void {
  if (this.backoffTimer) {
    clearTimeout(this.backoffTimer);
    this.backoffTimer = null;
  }
  this.currentBackoff = 0;
  this.consecutiveFailures = 0;
}
```

### Ensure `stopAutoSync` clears the timer

In `stopAutoSync()` (around line 1100):

```typescript
stopAutoSync(): void {
  if (this.syncIntervalId) {
    clearInterval(this.syncIntervalId);
    this.syncIntervalId = null;
  }
  if (this.backoffTimer) {
    clearTimeout(this.backoffTimer);
    this.backoffTimer = null;
  }
  this.httpClient.abort();
}
```

## Files Modified
- `packages/app/app/lib/sync/sync-service.ts`

## Verification

Run: `cd packages/app && bun test app/lib/sync/__tests__/backoff.test.ts --run`
