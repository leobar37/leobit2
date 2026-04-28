# T-008 Update Tests

## Objective

Update or remove all backend and frontend tests that reference the deleted custom handlers, state machines, snapshot fields, and base classes. Ensure test coverage for the new builder-based handlers exists.

## Requirements Covered

- `FR-018`

## Dependencies

- `T-007` (all code changes complete)

## Files or Areas Involved

- `packages/backend/src/services/sync-handlers/**/*.test.ts` - Modify or delete
- `packages/backend/src/services/transitions/**/*.test.ts` - Modify or delete
- `packages/backend/src/services/business/*.test.ts` - Review for state machine references
- `packages/app/app/lib/services/**/*.test.ts` - Review for snapshot field assertions
- `packages/app/e2e/` - Review for tests that depend on backend-created abonos or snapshots

## Actions

1. Search for all test files referencing `SaleSyncHandler`, `DistribucionSyncHandler`, `PurchaseSyncHandler`:
   - If tests exist, rewrite to test the new `createSaleHandler`/`createDistribucionHandler`/`createPurchaseHandler` factories
   - If no direct tests exist for handlers, verify this is acceptable

2. Search for all test files referencing `saleMachine`, `distribucionMachine`, `purchaseMachine`:
   - Delete tests for removed state machines
   - If `purchaseMachine` tests exist, rewrite to test the inline inventory hook

3. Search for all test files referencing `confirmedSnapshot`, `deliveredSnapshot`:
   - Remove assertions about these fields
   - Remove mock factory generation of these fields

4. Search for all test files referencing `createInitialPayment`:
   - Remove or update tests that verify automatic abono creation
   - Add tests for frontend `createWithItems` with abono (if frontend test coverage exists)

5. Verify the `abonos` handler `withPreValidation` works correctly with initial payment abonos:
   - Test: create credit sale → sync → abono created alongside sale
   - Test: abono with `referenceNumber: "init-sale:*"` is not rejected by balance check

6. Run all backend tests: `cd packages/backend && bun test`
7. Run all frontend tests: `cd packages/app && bun test`

## Completion Criteria

- No test file references deleted classes or functions
- All backend tests pass
- All frontend tests pass
- New tests exist for builder-based handlers (at minimum, the factories can be instantiated without errors)

## Validation

- `cd packages/backend && bun test`
- `cd packages/app && bun test`
- `rg "SaleSyncHandler|DistribucionSyncHandler|PurchaseSyncHandler|StatefulSyncHandler" packages/ --type ts`

## Risks or Notes

- Some E2E tests may depend on backend automatic abono creation. These will fail until the frontend change (T-006) is also complete. Consider running E2E tests only after T-006.
- Tests for the `sale.repository.ts` `confirmPreOrder`/`deliverPreOrder` methods need to be removed since those methods are deleted.
