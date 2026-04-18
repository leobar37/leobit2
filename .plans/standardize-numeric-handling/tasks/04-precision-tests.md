# T-004 Add Precision Regression Tests

## Objective

Create tests that verify decimal precision is preserved through the entire sync pipeline (schema → handler → service → repository), preventing future regressions.

## Requirements Covered

- `FR-005`
- `NFR-001`
- `NFR-002`

## Dependencies

- `T-001` (decimal helpers)
- `T-002` (SaleSyncHandler fixes)
- `T-003` (DistribucionService fixes)

## Files or Areas Involved

- `packages/backend/src/lib/__tests__/decimal.test.ts` — Create — unit tests for decimal helpers
- `packages/backend/src/services/sync/handlers/__tests__/` — Create or extend — precision tests for handlers

## Actions

1. **Decimal helpers tests** (`decimal.test.ts`):
   - Test `subtract`: `"0.1" - "0.05"` = `"0.05"`, `"100" - "99.99"` = `"0.01"`, `"5" - "10"` = `"0"`
   - Test `max`: `max("0.001", "0")` = `"0.001"`, `max("999999999.99", "0.01")` = `"999999999.99"`
   - Test `isPositive`: `"0.001"` → true, `"0"` → false, `"100"` → true
   - Test `toFixed`: `"5"` → `"5.00"`, `"0.1"` → `"0.10"`, `"100.123"` → `"100.12"`
   - Edge cases: empty string, very large numbers (12 digits), very small decimals (3 decimal places)

2. **Schema precision tests**:
   - Verify `numericStringTransform` preserves: `"999999999.99"`, `"0.001"`, `"0.1"`
   - Verify `optionalNumericStringTransform` handles: `null` → `undefined`, `undefined` → `undefined`, `"0.1"` → `"0.1"`

3. **Handler precision tests** (extend existing or new file):
   - Create sale with `totalAmount: "999999999.99"` and `amountPaid: "0.01"` → verify `balanceDue: "999999999.98"`
   - Create sale with `totalAmount: "0.10"` and `amountPaid: "0.05"` → verify `balanceDue: "0.05"`
   - Create distribucion with `cantidadAsignada: "0.001"` → verify it's stored as `"0.001"`

4. **Existing tests must pass unchanged** — do not modify any existing test data or assertions.

## Completion Criteria

- All new tests pass
- All existing tests pass without modification
- Test coverage includes at least 5 edge-case decimal values

## Validation

- `cd packages/backend && bun test`
- Verify new test files are discovered and run

## Risks or Notes

- Handler precision tests require database access (integration tests). If the test environment doesn't have a DB, write them as unit tests that mock the repository and verify the handler passes the correct string values through.
- The distribucion precision test depends on T-003 being complete (interface must accept strings).
