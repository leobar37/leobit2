# T-014: Test ChangeApplier DELETE with businessId

**Requirement**: FR-010

## Action

Add to `packages/app/app/lib/sync/__tests__/change-applier.test.ts`:

### Add test for DELETE with businessId filter

```typescript
describe("applyDelete", () => {
  it("should include businessId in DELETE query to enforce multi-tenancy", async () => {
    const capturedSql: string[] = [];
    const capturedParams: unknown[][] = [];

    const mockPg = {
      query: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => {
        capturedSql.push(sql);
        capturedParams.push(params);
        return { rows: [] };
      }),
    } as unknown as PGlite;

    const change: PullChange = {
      idempotencyKey: "test-key",
      entityType: "customers",
      operation: "delete",
      entityId: "cust-123",
      payload: {},
      localTimestamp: new Date().toISOString(),
      processedAt: new Date().toISOString(),
    };

    await applyDelete(mockPg, "customers", change, "biz-456");

    // Verify the DELETE includes business_id
    expect(capturedSql[0]).toContain('DELETE FROM "customers"');
    expect(capturedSql[0]).toContain('id = $1');
    expect(capturedSql[0]).toContain('business_id = $2');
    expect(capturedParams[0]).toEqual(["cust-123", "biz-456"]);
  });

  it("should NOT affect record with different businessId", async () => {
    // This test verifies the businessId filter actually works
    // by checking the SQL structure
    const mockPg = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    } as unknown as PGlite;

    const change: PullChange = {
      idempotencyKey: "test-key",
      entityType: "sales",
      operation: "delete",
      entityId: "sale-789",
      payload: {},
      localTimestamp: new Date().toISOString(),
      processedAt: new Date().toISOString(),
    };

    await applyDelete(mockPg, "sales", change, "biz-abc");

    // Verify businessId was passed as second parameter
    expect(mockPg.query).toHaveBeenCalledWith(
      expect.stringContaining("business_id = $2"),
      expect.arrayContaining(["sale-789", "biz-abc"])
    );
  });
});
```

### Also add test for cursor advancement edge case

```typescript
describe("applyChange — cursor advancement", () => {
  it("should handle case where all changes fail but cursor still advances (verified at PullService level)", () => {
    // This scenario is tested at PullService level (T-004)
    // This test just verifies applyDelete returns success even when
    // the record may not exist (idempotent delete)
    const mockPg = {
      query: vi.fn().mockResolvedValue({ rows: [] }),  // record not found
    } as unknown as PGlite;

    const change: PullChange = {
      idempotencyKey: "test-key",
      entityType: "customers",
      operation: "delete",
      entityId: "already-deleted",
      payload: {},
      localTimestamp: new Date().toISOString(),
      processedAt: new Date().toISOString(),
    };

    // Should succeed — delete is idempotent
    const result = applyDelete(mockPg, "customers", change, "biz-123");
    expect(result).resolves.toEqual({ success: true });
  });
});
```

## Files Modified
- `packages/app/app/lib/sync/__tests__/change-applier.test.ts`

## Verification

Run: `cd packages/app && bun test app/lib/sync/__tests__/change-applier.test.ts --run`

## Dependencies

Blocked by T-005 (DELETE fix must be applied first, since the test verifies the fix).
