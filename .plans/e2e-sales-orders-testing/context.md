# E2E Testing: Sales & Orders Feature

## Objective

Create a comprehensive E2E testing suite covering all sales (ventas) and orders (pedidos) flows in the Avileo application, with 70+ test cases using MSW mock infrastructure for 1000+ records without touching the real database.

## Motivation

The Avileo application needs robust end-to-end testing for its core sales functionality. Current tests cover basic flows but lack:
- Comprehensive validation testing
- Volume testing with large datasets
- Complete order lifecycle coverage
- Reusable patterns for future E2E development

## Key Architectural Decisions

1. **MSW for Mocks**: All tests use MSW (Mock Service Worker) to intercept API calls and return mock data. No real database is touched.

2. **1000+ Records Support**: Mock infrastructure supports generating and handling 1000+ records for volume testing.

3. **Page Object Pattern**: All UI interactions abstracted through page objects for maintainability.

4. **Mobile-First**: Tests run in mobile viewport (390x844 - iPhone 14) matching the app's primary use case.

5. **Offline-First Testing**: Tests verify IndexedDB persistence and sync behavior.

## Scope

### In Scope
- All sales flows (cash, credit, distribution, visits)
- All order flows (creation, confirmation, delivery, cancellation)
- Validation and error scenarios
- Volume testing with 1000+ records
- Performance benchmarks
- End-to-end integration flows

### Out of Scope
- Unit tests (covered separately)
- Visual regression testing
- Cross-browser testing (Chrome only)
- Load testing beyond 1000 records

## Current State

### Existing Infrastructure
- Playwright config exists
- MSW handlers with basic data (5 customers, 4 products)
- Page objects for core flows
- ~12 existing test specs

### Target State
- 70+ test cases covering all scenarios
- Volume data generators (1000+ records)
- Complete page object library
- Reusable pattern documentation
- CI/CD integration

## References

- Main plan document: `../e2e-sales-orders-testing.md`
- Backend API: `/packages/backend/src/api/sales.ts`
- Database schema: `/packages/backend/src/db/schema/sales.ts`
- Existing tests: `/packages/app/e2e/tests/`
