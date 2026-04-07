# T-015: Verify All Tests Pass

**Requirement**: FR-all

## Action

Run the full test suite and compare against baseline.

### Step 1 — Run all frontend sync tests

```bash
cd /Users/leobar37/code/avileo/packages/app
bun test app/lib/sync/__tests__ --run 2>&1 | tee /tmp/sync-tests-after.txt
```

### Step 2 — Run all backend sync tests

```bash
cd /Users/leobar37/code/avileo/packages/backend
bun test src/services/sync/ --run 2>&1 | tee /tmp/backend-sync-tests-after.txt
```

### Step 3 — Compare with baseline

```bash
diff /tmp/sync-tests-baseline.txt /tmp/sync-tests-after.txt
diff /tmp/backend-sync-tests-baseline.txt /tmp/backend-sync-tests-after.txt
```

### Step 4 — Run E2E smoke test

```bash
cd /Users/leobar37/code/avileo/packages/app
# Start backend in background first if needed
bun run test:e2e --grep="sale" --run 2>&1 | head -50
```

## Success Criteria

- All tests pass
- No new failures introduced
- Compare output shows only expected changes (new tests added)

## If Tests Fail

1. Check which test failed
2. Revert only that change
3. Re-run tests to isolate
4. Fix and re-apply

## Files Checked
- `packages/app/app/lib/sync/__tests__/*.test.ts`
- `packages/app/app/lib/sync/__tests__/**/*.test.ts`
- `packages/backend/src/services/sync/**/*.test.ts`
