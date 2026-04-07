# T-007: Add AbortController to SyncService sendBatch

**Requirement**: FR-004

## Action

Modify `packages/app/app/lib/sync/http/fetch-sync-http-client.ts`:

### Add AbortController property

```typescript
private abortController: AbortController | null = null;
```

### Modify `sendBatch` to accept and use AbortSignal

```typescript
async sendBatch(
  operations: SyncOperationRecord[],
  signal?: AbortSignal
): Promise<BatchSyncResponse> {
  // ... existing validation ...

  const response = await fetch(`${this.baseUrl}/sync/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.authToken}`,
      "x-business-id": this.businessId,
      "x-correlation-id": batchCorrelationId,
    },
    body: JSON.stringify({ operations: operations.map(...) }),
    signal,  // ADD THIS
  });
  // ... rest ...
}
```

### Handle AbortError

```typescript
} catch (error) {
  if (error instanceof Error && error.name === "AbortError") {
    console.log("[SyncHttpClient] Batch send was aborted");
    throw error;  // re-throw so SyncService can handle
  }
  // ... existing error handling ...
}
```

### Add abort method

```typescript
abort(): void {
  if (this.abortController) {
    this.abortController.abort();
  }
}
```

### Modify SyncService to pass signal and handle abort

In `sync-service.ts`, when calling `sendBatch`:

```typescript
const response = await this.httpClient.sendBatch(ops, this.abortSignal);
```

In `stopAutoSync()`:

```typescript
stopAutoSync(): void {
  if (this.syncIntervalId) {
    clearInterval(this.syncIntervalId);
    this.syncIntervalId = null;
  }
  this.httpClient.abort();  // cancel in-flight requests
}
```

## Files Modified
- `packages/app/app/lib/sync/http/fetch-sync-http-client.ts`
- `packages/app/app/lib/sync/sync-service.ts`

## Verification

Run: `cd packages/app && bun test app/lib/sync/__tests__/sync-service.test.ts --run`
