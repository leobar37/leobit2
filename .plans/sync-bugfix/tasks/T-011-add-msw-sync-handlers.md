# T-011: Add MSW Sync Handlers to E2E Mocks

**Requirement**: FR-009

## Action

Add to `packages/app/e2e/mocks/handlers.ts`:

### POST /sync/batch handler

Add after existing handlers (around line 200):

```typescript
// POST /sync/batch
http.post(`${API_URL}/sync/batch`, async ({ request }) => {
  const body = await request.json() as {
    operations: Array<{
      idempotencyKey: string;
      entityType: string;
      entityId: string;
      operation: "create" | "update" | "delete";
      payload: Record<string, unknown>;
      localVersion: number;
      localTimestamp: string;
      syncGroupId?: string;
    }>;
  };

  const results = body.operations.map((op) => ({
    idempotencyKey: op.idempotencyKey,
    success: true,
  }));

  return HttpResponse.json({
    success: true,
    data: { results }
  });
}),
```

### GET /sync/changes handler

```typescript
// GET /sync/changes
http.get(`${API_URL}/sync/changes`, ({ request }) => {
  const url = new URL(request.url);
  const since = url.searchParams.get("since");
  const entityTypes = url.searchParams.get("entityTypes")?.split(",") || [];

  // Return empty changes by default — tests can override
  return HttpResponse.json({
    success: true,
    data: {
      changes: [],
      nextSince: since || new Date().toISOString(),
      hasMore: false,
      serverTimestamp: new Date().toISOString(),
    }
  });
}),
```

### For tests that need sync conflicts

```typescript
// Override handler for conflict testing
export function mockSyncConflict(entityType: string, entityId: string) {
  return http.post(`${API_URL}/sync/batch`, async ({ request }) => {
    const body = await request.json();
    const results = body.operations.map((op: { idempotencyKey: string }) => ({
      idempotencyKey: op.idempotencyKey,
      success: false,
      error: "VERSION_CONFLICT",
      conflict: {
        serverVersion: 2,
        serverData: { id: entityId, version: 2, updatedAt: new Date().toISOString() },
      }
    }));
    return HttpResponse.json({ success: true, data: { results } });
  });
}
```

## Files Modified
- `packages/app/e2e/mocks/handlers.ts`

## Verification

E2E tests that use these handlers should work. Test by running a sync-related E2E spec if one exists.
