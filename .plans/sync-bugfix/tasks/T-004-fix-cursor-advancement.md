# T-004: Fix Cursor Advancement Bug

**Requirement**: FR-002

## Action

Edit `packages/app/app/lib/sync/pull-service.ts`, line 350.

### Before (buggy):
```typescript
// Persist cursor
if (nextSince && appliedCount > 0) {
  if (config.cursorKey) {
    this.saveStageCursor(config.cursorKey, nextSince);
  } else if (config.useDefaultCursor) {
    this.saveCursor(nextSince);
  }
}
```

### After (fixed):
```typescript
// Persist cursor — always advance when server provides a new cursor
// even if changes failed to apply (prevents infinite retry loops)
if (nextSince) {
  if (config.cursorKey) {
    this.saveStageCursor(config.cursorKey, nextSince);
  } else if (config.useDefaultCursor) {
    this.saveCursor(nextSince);
  }
}
```

## Why This Works

The cursor represents "I've received data up to this point." If changes fail to apply, we still acknowledge receipt. The next pull will get the same changes if the server hasn't compacted them. If the server compacted (sent changes to other clients), the client will reconcile via the conflict resolution system.

The previous condition (`appliedCount > 0`) caused a loop: changes arrive → fail to apply → cursor doesn't advance → same changes arrive again → repeat forever.

## Test to Add

Add a test case in `packages/app/app/lib/sync/__tests__/pull-service.edge-cases.test.ts`:

```typescript
it("should advance cursor even when all changes fail to apply", async () => {
  const mockFetch = vi.fn();
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      data: {
        changes: [createMockChange({ entityType: "customers", entityId: "c1" })],
        nextSince: "cursor-2",
        hasMore: false,
      }
    })
  });
  vi.stubGlobal("fetch", mockFetch);

  // Apply change always fails
  const mockPg = createMockPGlite({ applyChange: () => ({ success: false, error: "schema mismatch" }) });
  const service = new PullService(mockPg, mockDb, businessId, authToken);

  const result = await service.pull();

  // Cursor must advance even though changesApplied = 0
  expect(result.nextSince).toBe("cursor-2");
  expect(mockFetch).toHaveBeenCalledWith(
    expect.stringContaining("cursor-2"),
    expect.anything()
  );
});
```

## Files Modified
- `packages/app/app/lib/sync/pull-service.ts`

## Verification

Run: `cd packages/app && bun test app/lib/sync/__tests__/pull-service.edge-cases.test.ts --run`
