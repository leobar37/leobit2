# E2E Testing Guide

This directory contains End-to-End tests for the Avileo POS system.

## Current Status

### Test Infrastructure
- ✅ MSW mock handlers created (`e2e/mocks/`)
- ✅ Page objects created (`e2e/page-objects/`)
- ✅ Test utilities created (`e2e/utils/`)
- ✅ Volume test configuration (`playwright.volume.config.ts`)
- ⚠️ E2E tests marked as skipped (require PGlite)

### Why E2E Tests Are Skipped

The E2E tests for sales and orders flows are currently **skipped** because:

1. **PGlite initialization**: The browser-based PostgreSQL (PGlite) takes 2-5 minutes to initialize in headless mode
2. **Build time**: The dev server takes significant time to start
3. **Test reliability**: Tests timeout before PGlite finishes initializing

### Test Coverage (70+ Test Cases)

The following test cases are defined in `e2e/tests/`:

| File | Tests | Description |
|------|-------|-------------|
| `sales-cash.spec.ts` | 5 | Cash sale flow (contado) |
| `sales-credit.spec.ts` | 5 | Credit sale flow (crédito) |
| `sales-validations.spec.ts` | 8 | Form validation tests |
| `sales-cancellation.spec.ts` | 6 | Sale cancellation tests |
| `orders-creation.spec.ts` | 11 | Pre-order creation tests |
| `orders-lifecycle.spec.ts` | 20 | Order lifecycle tests |
| `volume-performance.spec.ts` | 12 | Performance with 1000+ records |
| `sync-tests.spec.ts` | 6 | Sync operation tests |
| `e2e-flows.spec.ts` | 8 | Full E2E integration flows |
| **Total** | **81** | |

## Running Tests

### Prerequisites

1. Start the backend server:
   ```bash
   cd packages/backend && bun run dev
   ```

2. Start the frontend dev server:
   ```bash
   cd packages/app && bun run dev
   ```

3. Wait for PGlite to initialize (watch for "Database ready" in console)

### Run Integration Tests (Fast, No PGlite)

```bash
cd packages/app
bun run test:e2e integration-msw.spec.ts --config=playwright.dev.config.ts
```

These tests use MSW to mock all API calls and don't require PGlite.

### Run E2E Tests (Slow, Requires PGlite)

```bash
cd packages/app
bun run test:e2e sales-cash.spec.ts --config=playwright.dev.config.ts
```

> ⚠️ **Warning**: These tests take 5-10 minutes to run due to PGlite initialization.

## Manual Testing Checklist

Since E2E tests are slow, use this checklist for manual testing:

### Login Flow
- [ ] Login with demo credentials (`demo@avileo.com` / `demo123456`)
- [ ] Verify redirect to dashboard
- [ ] Verify auth state persists across page refresh

### Cash Sale Flow
- [ ] Navigate to sales list
- [ ] Click "Nueva Venta"
- [ ] Select "Pago al Contado"
- [ ] Add a product
- [ ] Enter quantity/weight
- [ ] Complete the sale
- [ ] Verify redirect to sale detail

### Credit Sale Flow
- [ ] Navigate to sales list
- [ ] Click "Nueva Venta"
- [ ] Select "Venta a Crédito"
- [ ] Select or create customer
- [ ] Add products
- [ ] Record partial payment
- [ ] Complete the sale
- [ ] Verify balance shows correctly

### Order Flow
- [ ] Navigate to orders
- [ ] Create new pre-order
- [ ] Add customer and products
- [ ] Submit order
- [ ] Verify order appears in list
- [ ] Mark order as delivered
- [ ] Record payment

## Future Improvements

1. **Faster local database**: Consider using IndexedDB or a faster embedded DB
2. **Test fixtures**: Pre-seed data to avoid setup time
3. **CI optimization**: Run E2E tests only on specific branches
4. **Visual testing**: Add screenshot comparisons for UI regression

## Adding New Tests

### 1. Create Mock Data (if needed)
```typescript
// e2e/mocks/volume-handlers.ts
export function createMockProduct(overrides?: Partial<Product>) {
  return {
    id: `prod-${cuid()}`,
    name: "Test Product",
    type: "pollo" as const,
    unit: "kg" as const,
    basePrice: "15.00",
    isActive: true,
    businessId: "biz-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
```

### 2. Add Page Object Method
```typescript
// e2e/page-objects/NewSalePage.ts
async selectCreditSale() {
  await this.page.click('button:has-text("Venta a Crédito")');
}
```

### 3. Write Test
```typescript
// e2e/tests/example.spec.ts
test("should complete a credit sale", async ({ page }) => {
  await page.goto("/ventas");
  await newSalePage.startNewSale();
  await newSalePage.selectCreditSale();
  await newSalePage.addCustomer("Juan Perez");
  // ... rest of test
});
```

## Architecture

```
e2e/
├── mocks/
│   ├── handlers.ts          # Base API handlers
│   ├── volume-handlers.ts   # 1000+ record handlers
│   ├── sync-handlers.ts     # Sync operation handlers
│   └── index.ts             # Combined handlers
├── page-objects/
│   ├── LoginPage.ts         # Login flow
│   ├── DashboardPage.ts     # Dashboard navigation
│   ├── SalesListPage.ts     # Sales list interactions
│   ├── NewSalePage.ts       # New sale form
│   ├── SaleDetailPage.ts    # Sale detail view
│   └── PublicSalePage.ts    # Public token sale
├── tests/
│   ├── sales-*.spec.ts      # Sales flow tests
│   ├── orders-*.spec.ts     # Order flow tests
│   ├── volume-*.spec.ts     # Performance tests
│   └── integration-msw.spec.ts # Fast MSW tests
└── utils/
    └── index.ts             # Test helpers
```

## Debugging

### View Test Screenshots
```bash
ls test-results/
cat test-results/*/error-context.md
```

### Run Single Test
```bash
bun run test:e2e sales-cash.spec.ts --grep "SALE-CASH-001"
```

### Debug with UI
```typescript
test("debug test", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  // Add breakpoints here
  await page.pause(); // Opens Playwright Inspector
});
```
