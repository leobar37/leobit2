# T-002 Fix SaleSyncHandler Numeric Casts

## Objective

Remove all `Number()` calls on decimal fields in `SaleSyncHandler`, replacing arithmetic with the decimal helpers from T-001 and direct string comparisons.

## Requirements Covered

- `FR-002`
- `NFR-002`

## Dependencies

- `T-001` (decimal helpers)

## Files or Areas Involved

- `packages/backend/src/services/sync/handlers/SaleSyncHandler.ts` — Modify — lines 61, 76, 82

## Actions

1. **Line 61 — balanceDue calculation**:
   - Current: `String(Math.max(Number(parsed.totalAmount) - Number(parsed.amountPaid || 0), 0))`
   - Replace with: `subtract(parsed.totalAmount, parsed.amountPaid ?? "0")` — the helper already floors at zero and returns string
   - Import `subtract` from `~/lib/decimal`

2. **Line 76 — payment check**:
   - Current: `Number(parsed.amountPaid || 0) > 0`
   - Replace with: `isPositive(parsed.amountPaid ?? "0")` — direct string comparison
   - Import `isPositive` from `~/lib/decimal`

3. **Line 82 — payment amount**:
   - Current: `Number(parsed.amountPaid || 0).toFixed(2)`
   - Replace with: `parsed.amountPaid ?? "0"` — the schema already outputs a validated numeric string, and `PaymentRepository.createInitialPayment` already expects `amount: string`. No formatting needed.
   - If trailing zeros are required, use `toFixed(parsed.amountPaid ?? "0", 2)` from decimal helpers.

4. Verify the import path follows existing project conventions (check how other handlers import from `lib/`).

## Completion Criteria

- `grep "Number(" packages/backend/src/services/sync/handlers/SaleSyncHandler.ts` returns zero matches
- `grep ".toFixed" packages/backend/src/services/sync/handlers/SaleSyncHandler.ts` returns zero matches
- Existing sale sync tests pass unchanged

## Validation

- `cd packages/backend && bun test`
- Run the sale-sync.race.test.ts specifically: verify version conflict detection still works with string-based calculations

## Risks or Notes

- The `balanceDue` calculation must produce the exact same result as before for all existing test data. The key invariant is: `balanceDue = max(totalAmount - amountPaid, 0)`.
- The schema's `.refine()` on line 108 already uses `Number()` internally for validation — that's acceptable (validation-time conversion is not the problem; handler-time conversion is).
