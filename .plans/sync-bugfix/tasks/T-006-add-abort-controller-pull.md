# T-006: Add AbortController to PullService

**Requirement**: FR-004

## Action

Modify `packages/app/app/lib/sync/pull-service.ts`:

### Add AbortController property

In the class properties (around line 33-50):

```typescript
private abortController: AbortController | null = null;
```

### Modify `executePull` to accept AbortSignal

The `executePull` method signature (around line 199):

```typescript
// Add optional signal parameter
private async executePull(
  config: PullExecutionConfig,
  signal?: AbortSignal
): Promise<PullResult & { nextSince: string | null }> {
```

### Pass signal to fetch

In the fetch call (around line 242):

```typescript
const response = await fetch(url.toString(), {
  method: "GET",
  headers: {
    Authorization: `Bearer ${this.authToken}`,
    "x-business-id": this.businessId,
  },
  signal,  // ADD THIS
});
```

### Handle AbortError in catch

Add at the start of the catch block (around line 382):

```typescript
} catch (error) {
  if (error instanceof Error && error.name === "AbortError") {
    console.log("[Pull] Pull was aborted");
    return { success: false, changesApplied: 0, hasMore: false, error: "Aborted", nextSince: null };
  }
  // ... existing error handling
}
```

### Create abort controller when starting pull

In `executePull`, at the start (around line 200):

```typescript
if (signal?.aborted) {
  return { success: false, changesApplied: 0, hasMore: false, error: "Already aborted", nextSince: null };
}
```

### Expose abort method

Add to the class:

```typescript
abort(): void {
  if (this.abortController) {
    this.abortController.abort();
  }
}
```

### Modify `stopAutoPull` to abort

In `stopAutoPull()` (around line 480):

```typescript
stopAutoPull(): void {
  if (this.pullIntervalId) {
    clearInterval(this.pullIntervalId);
    this.pullIntervalId = null;
  }
  this.abort();  // ADD THIS — cancel any in-flight request
}
```

## Files Modified
- `packages/app/app/lib/sync/pull-service.ts`

## Verification

Run: `cd packages/app && bun test app/lib/sync/__tests__/pull-service.test.ts --run`
