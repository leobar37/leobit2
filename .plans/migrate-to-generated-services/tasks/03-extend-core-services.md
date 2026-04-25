# T-003 Extend Customer, Sale, and Payment Services

## Objective

Create extension classes for the three most critical entity services (customers, sales, payments/abonos) that inherit from generated services and add only custom business methods.

## Requirements Covered

- `FR-004`
- `FR-005`

## Dependencies

- `T-001`
- `T-002`

## Files or Areas Involved

- `packages/app/app/lib/services/customer-service.ts` — Refactor to extend `CustomersService`
- `packages/app/app/lib/services/sale-service.ts` — Refactor to extend `SalesService` (or BaseService if atomic operations need it)
- `packages/app/app/lib/services/payment-service.ts` — Refactor to extend `AbonosService`

## Actions

### CustomerService

1. Change class declaration to extend `CustomersService` (from generated)
2. Remove constructor (inherited from generated)
3. Remove `getEntityType()` and `getEntityPrefix()` (inherited)
4. Remove `create()`, `update()`, `delete()`, `findById()`, `list()` if they are pure overrides without added logic
5. Keep custom methods:
   - `findByBusiness(filters?)` — search, tag/group filtering
   - `countByBusiness(filters?)` — counting with filters
   - `findPageByBusiness(query)` — pagination with filters
   - `getCustomerTagsForCustomers(customerIds[])` — tag aggregation
6. Update imports to use generated `CustomersService` as base

### SaleService

1. **Analyze**: `SaleService` currently extends `BaseService` directly and manually manages both `sales` and `sale_items` tables atomically. It does NOT extend `SalesService` generated.
2. **Decision**: Keep extending `BaseService` OR compose `SalesService` + `SaleItemsService`. The atomic transaction logic across two tables is custom and cannot be auto-generated.
3. If keeping `BaseService`: Ensure it still receives `SyncClientEngineLike` and works with `useEngineService`
4. Keep all custom methods: `createWithItems`, `confirm`, `confirmPreOrder`, `deliver`, `finalizeDelivery`, `cancel`, `addItem`, `updateItem`, `removeItem`, `recordPayment`, `getSalesStats`, `getDebtorsSummary`, `getSalesChart`
5. Remove any redundant CRUD that the generated `SalesService` already provides if not adding value

### PaymentService (Abonos)

1. Change class declaration to extend `AbonosService` (from generated)
2. Remove constructor, `getEntityType()`, `getEntityPrefix()`
3. Remove `create()`, `update()`, `delete()`, `findById()`, `findByBusiness()`, `findByCustomer()` if they are pure overrides without added logic
4. Keep custom methods:
   - `findAccountsReceivablePage(query)` — accounts receivable with pagination
   - `getAccountsReceivableTotal(filters)` — total debt calculation
   - `getCustomerDebtBalance(customerId)` — single customer balance
   - `validatePaymentAmount(customerId, amount)` — business validation
5. Keep overrides that add validation logic (e.g., `create` with debt validation)

## Completion Criteria

- `CustomerService extends CustomersService` and only contains custom methods
- `PaymentService extends AbonosService` and only contains custom methods
- `SaleService` retains atomic multi-entity operations
- All custom methods have identical signatures to their manual versions
- TypeScript compiles without errors in these three files

## Validation

- `cd packages/app && bun run typecheck`
- Verify no TS errors in the three service files
- Spot-check: `CustomerService` should have `findByBusiness` method available

## Risks or Notes

- `SaleService` is the most complex. Its atomic transactions across `sales` + `sale_items` tables may need to stay as-is. Document the decision.
- If a generated `create()` method sets fields differently than the manual override, verify business logic isn't lost.
- Keep exported types/interfaces (`CustomerSearchFilters`, `SalePageQuery`, etc.) as they are used by hooks.
