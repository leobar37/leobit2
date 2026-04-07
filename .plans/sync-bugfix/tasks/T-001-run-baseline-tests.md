# T-001: Run Baseline Tests

**Requirement**: FR-all (establish baseline)

## Action

Run all existing sync-related tests to establish a baseline.

```bash
# Frontend sync tests
cd /Users/leobar37/code/avileo/packages/app
bun test app/lib/sync/__tests__ 2>&1 | tee /tmp/sync-tests-baseline.txt

# Backend handler tests
cd /Users/leobar37/code/avileo/packages/backend
bun test src/services/sync/handlers/__tests__ 2>&1 | tee /tmp/backend-sync-tests-baseline.txt
```

## Success Criteria

- All existing tests pass (or failures are pre-existing, not new)
- Save output to `/tmp/sync-tests-baseline.txt` for comparison after changes

## Notes

If any test fails before making changes, investigate why before proceeding. Some tests may be already broken.
