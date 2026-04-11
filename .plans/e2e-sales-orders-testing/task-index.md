# Task Index: E2E Sales & Orders Testing

## Overview

This structured plan implements comprehensive E2E testing for sales and orders flows with 70+ test cases and MSW mock infrastructure supporting 1000+ records.

## Task List

| ID | Task | Priority | Status | Dependencies |
|----|------|----------|--------|--------------|
| T-001 | Create mock factories (customer, product, sale, order) | P0 | pending | - |
| T-002 | Extend MSW handlers with volume support | P0 | pending | T-001 |
| T-003 | Create SalesListPage page object | P0 | pending | - |
| T-004 | Create SaleDetailPage page object | P0 | pending | - |
| T-005 | Implement cash sale tests | P0 | pending | T-002, T-003, T-004 |
| T-006 | Implement credit sale tests | P0 | pending | T-002, T-003, T-004 |
| T-007 | Implement sale validation tests | P1 | pending | T-005, T-006 |
| T-008 | Implement sale cancellation tests | P1 | pending | T-004 |
| T-009 | Extend NewSalePage with missing methods | P1 | pending | - |
| T-010 | Create DashboardPage page object | P2 | pending | - |
| T-011 | Implement order creation tests | P0 | pending | T-002 |
| T-012 | Implement order lifecycle tests | P0 | pending | T-011 |
| T-013 | Extend NewOrderPage with item methods | P1 | pending | - |
| T-014 | Extend OrderDetailPage with token/permission methods | P1 | pending | - |
| T-015 | Create PublicSalePage page object | P2 | pending | - |
| T-016 | Create volume data generators | P1 | pending | T-001 |
| T-017 | Create volume MSW handlers | P1 | pending | T-016 |
| T-018 | Create sync MSW handlers | P1 | pending | T-017 |
| T-019 | Implement volume performance tests | P1 | pending | T-017, T-018 |
| T-020 | Implement sync tests | P1 | pending | T-018 |
| T-021 | Implement E2E integration flows | P0 | pending | T-005, T-006, T-011, T-012 |
| T-022 | Document reusable patterns | P2 | pending | All |
| T-023 | Create test utilities library | P2 | pending | All |
| T-024 | Update playwright config for volume tests | P2 | pending | T-019 |
| T-025 | Add package.json scripts | P2 | pending | T-024 |

## Phase Organization

### Phase 1: Foundation (T-001 to T-006)
- Mock factories
- MSW volume support
- Core page objects
- Cash and credit sale tests

### Phase 2: Sale Management (T-007 to T-010)
- Validation tests
- Cancellation tests
- Dashboard page
- Extended methods

### Phase 3: Orders (T-011 to T-015)
- Order creation tests
- Order lifecycle tests
- Extended page objects
- Public sale page

### Phase 4: Volume & Sync (T-016 to T-020)
- Volume data generators
- Volume handlers
- Sync handlers
- Performance tests

### Phase 5: Integration (T-021 to T-025)
- E2E flow tests
- Pattern documentation
- Test utilities
- Configuration updates

## Execution Order

```
T-001 ──┬── T-002 ──┬── T-005 ──┬── T-007
        │           │           │
        │           ├── T-006 ──┤
        │                       │
T-003 ──┤                       ├── T-008
        │                       │
T-004 ──┘                       │
                                ├── T-011 ──┬── T-012
                                │           │
T-009 ──────────────────────────┤           ├── T-021
                                │           │
T-010 ──────────────────────────┤           ├── T-022
                                │           │
T-013 ──────────────────────────┤           ├── T-023
                                │           │
T-014 ──────────────────────────┤           ├── T-024
                                │           │
T-015 ──────────────────────────┘           ├── T-025
                                            │
T-016 ──┬── T-017 ──┬── T-019 ──────────────┤
        │           │                       │
        │           ├── T-018 ──┬── T-020 ──┘
        │                       │
        │                       └── T-019
        │
        └── T-017
```

## File Mapping

| Task | Files Created/Modified |
|------|------------------------|
| T-001 | `mocks/factories/customer.factory.ts`, `mocks/factories/product.factory.ts`, `mocks/factories/sale.factory.ts`, `mocks/factories/order.factory.ts` |
| T-002 | `mocks/handlers.ts` (extend), `mocks/volume-data.ts` |
| T-003 | `page-objects/SalesListPage.ts` |
| T-004 | `page-objects/SaleDetailPage.ts` |
| T-005 | `tests/sales-cash.spec.ts` |
| T-006 | `tests/sales-credit.spec.ts` |
| T-007 | `tests/sales-validations.spec.ts` |
| T-008 | `tests/sales-cancellation.spec.ts` |
| T-009 | `page-objects/NewSalePage.ts` (extend) |
| T-010 | `page-objects/DashboardPage.ts` |
| T-011 | `tests/orders-creation.spec.ts` |
| T-012 | `tests/orders-lifecycle.spec.ts` |
| T-013 | `page-objects/NewOrderPage.ts` (extend) |
| T-014 | `page-objects/OrderDetailPage.ts` (extend) |
| T-015 | `page-objects/PublicSalePage.ts` |
| T-016 | `mocks/volume-data.ts` (implement generators) |
| T-017 | `mocks/volume-handlers.ts` |
| T-018 | `mocks/sync-handlers.ts` |
| T-019 | `tests/volume-performance.spec.ts` |
| T-020 | `tests/sync-tests.spec.ts` |
| T-021 | `tests/e2e-flows.spec.ts` |
| T-022 | `e2e/PATTERNS.md` |
| T-023 | `e2e/utils/index.ts` |
| T-024 | `playwright.config.ts` (modify), `playwright.volume.config.ts` (create) |
| T-025 | `package.json` (modify) |
