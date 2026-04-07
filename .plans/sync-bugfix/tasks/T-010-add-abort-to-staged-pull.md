# T-010: Add Abort Flag to Staged Pull

**Requirement**: FR-007

## Action

Modify `packages/app/app/lib/sync/staged-pull-coordinator.ts`:

### Add aborted property

Around line 34:

```typescript
private aborted = false;
```

### Add abort method

```typescript
abort(): void {
  this.aborted = true;
}
```

### Check aborted and online status in each stage's loop

In `loadCriticalData()` (around line 79):

```typescript
while (hasMore && !this.aborted && navigator.onLine) {
  const result = await this.pullService.pullWithOptions({ ... });
  // ... existing logic
}
```

Apply the same pattern to `loadRecentSales()` (line 128) and `loadHistoricalData()` (line 175).

### Reset aborted flag at start of executeStagedLoad

```typescript
async executeStagedLoad(): Promise<...> {
  this.aborted = false;  // ADD THIS
  // ... rest
}
```

### Propagate abort from PullService

If `PullService` aborts mid-pull (from T-006), the loop should stop. The `abort()` method on StagedPullCoordinator should also call `this.pullService.abort()`.

```typescript
abort(): void {
  this.aborted = true;
  this.pullService.abort();  // from T-006
}
```

## Files Modified
- `packages/app/app/lib/sync/staged-pull-coordinator.ts`

## Verification

Run: `cd packages/app && bun test app/lib/sync/__tests__/staged-pull-coordinator.test.ts --run`

## Dependencies

Requires T-006 (AbortController in PullService) to be implemented first, since we call `this.pullService.abort()`.
