# T-002 Refactor Payment Service SQL to Drizzle ORM

## Objective

Eliminate all raw SQL (`pg.query()`) from `payment-service.ts` and replace it with Drizzle ORM query builder or generated drizzle-sync service methods.

## Requirements Covered

- `FR-003`
- `FR-004`
- `FR-005`
- `NFR-002`

## Dependencies

- `T-001`

## Files or Areas Involved

- `packages/app/app/lib/services/payment-service.ts` - Modify - Replace raw SQL with Drizzle queries
- `packages/app/app/lib/services/base-service.ts` - Review - May need helper methods for complex aggregations
- `packages/app/app/hooks/use-payments.ts` - Review - Verify no hooks depend on raw SQL row shapes
- `packages/app/app/hooks/use-accounts-receivable.ts` - Review - May need updates if return types change

## Actions

1. Identify every `pg.query()` call in `payment-service.ts`:
   - `findAccountsReceivablePage()` (CTE query ~lines 148-164)
   - `getAccountsReceivableTotal()` (CTE query ~lines 212-244)
   - `getCustomerDebtBalance()` (balance calculation ~lines 312-323)
   - Basic lookups (lines 256-259, 277-281, 295-299)
2. Replace basic lookups with Drizzle `select().from().where()` using `eq()`, `and()`
3. For the accounts receivable CTE:
   - Option A: Decompose into multiple Drizzle queries (get sales, get payments, calculate balance in TypeScript)
   - Option B: Create a typed view or helper in `base-service.ts` that encapsulates the CTE logic using Drizzle's `sql` template tag (this is acceptable because it stays within Drizzle's type system)
   - Option C: If the query is too complex for Drizzle, document it explicitly with a comment explaining why raw SQL is necessary
4. Ensure all write operations (`create`, `update`, `delete`) still call `queueSync()` via the generated `AbonosService` or `BaseService`
5. Preserve exact return types and data shapes to avoid breaking hooks/components
6. Remove unused SQL string fragments and imports

## Completion Criteria

- `payment-service.ts` contains zero `pg.query()` calls
- All methods compile without TypeScript errors
- `usePayments`, `useAccountsReceivable`, and `useCustomerBalance` hooks continue to work
- Payment registration flow (offline and online) remains functional

## Validation

- Run `cd packages/app && bun run typecheck`
- Run payment-related unit tests if they exist
- Manual test: register a payment offline, go online, verify sync succeeds

## Risks or Notes

- The CTE query calculates customer debt by joining sales and payments. If decomposed into multiple queries, ensure the calculation is still correct and efficient.
- If return types change even slightly, hooks that consume the service may need updates.
- Consider adding a unit test for `getCustomerDebtBalance()` to prevent regressions.
