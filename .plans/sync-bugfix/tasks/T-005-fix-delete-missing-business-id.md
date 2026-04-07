# T-005: Fix DELETE Missing businessId

**Requirement**: FR-003

## Action

Two changes needed in `packages/app/app/lib/sync/change-applier.ts`:

### Change 1 — Update `applyDelete` signature and query

```typescript
// BEFORE (line 209-216)
async function applyDelete(
  pg: PGlite,
  tableName: string,
  change: PullChange
): Promise<ChangeApplicationResult> {
  const id = change.entityId;
  await pg.query(`DELETE FROM "${tableName}" WHERE id = $1`, [id]);
  return { success: true };
}

// AFTER
async function applyDelete(
  pg: PGlite,
  tableName: string,
  change: PullChange,
  businessId: string
): Promise<ChangeApplicationResult> {
  const id = change.entityId;
  await pg.query(
    `DELETE FROM "${tableName}" WHERE id = $1 AND business_id = $2`,
    [id, businessId]
  );
  return { success: true };
}
```

### Change 2 — Update the call site in `applyChange`

In `applyChange()` at line 69 (switch case "delete"):

```typescript
// BEFORE
case "delete":
  return await applyDelete(pg, tableName, change);

// AFTER
case "delete":
  return await applyDelete(pg, tableName, change, businessId);
```

## Files Modified
- `packages/app/app/lib/sync/change-applier.ts`

## Test to Add

Add to `packages/app/app/lib/sync/__tests__/change-applier.test.ts`:

```typescript
it("applyDelete should include businessId in WHERE clause", async () => {
  const executedQueries: string[] = [];
  const mockPg = {
    query: async (sql: string, params: unknown[]) => {
      executedQueries.push(sql);
      return { rows: [] };
    }
  } as unknown as PGlite;

  const change = { entityType: "customers", entityId: "cust-123", operation: "delete" as const, payload: {} };

  await applyDelete(mockPg, "customers", change, "biz-456");

  // Verify the DELETE includes business_id
  expect(executedQueries[0]).toContain('business_id');
  expect(executedQueries[0]).toContain('$2');
  expect(executedQueries[1]).toBe("biz-456"); // params[1] = businessId
});
```

## Verification

Run: `cd packages/app && bun test app/lib/sync/__tests__/change-applier.test.ts --run`

## Notes

This is a **security fix**. The change-applier receives `businessId` in its function signature but wasn't using it for DELETE. Now all delete operations are scoped to the correct business.
