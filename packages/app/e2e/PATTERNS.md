# E2E Testing Patterns

> Reusable patterns and conventions for Playwright E2E tests in Avileo.

## Table of Contents

1. [Page Object Pattern](#1-page-object-pattern)
2. [Test Data Builder Pattern](#2-test-data-builder-pattern)
3. [Test Fixture Pattern](#3-test-fixture-pattern)
4. [MSW Scenario Helpers](#4-msw-scenario-helpers)
5. [Mobile Viewport Testing](#5-mobile-viewport-testing)
6. [Assertion Patterns](#6-assertion-patterns)

---

## 1. Page Object Pattern

Page Objects encapsulate UI interactions and element locators for a specific page or component.

### Structure

```typescript
// page-objects/SalesListPage.ts
import { type Page, type Locator } from "@playwright/test";

export class SalesListPage {
  readonly page: Page;
  readonly url = "/ventas";

  // Locators - group by purpose
  readonly searchInput: Locator;
  readonly addButton: Locator;
  readonly salesList: Locator;
  readonly saleCards: Locator;
  readonly filterTodasButton: Locator;

  // Pagination
  readonly nextPageButton: Locator;
  readonly prevPageButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Initialize locators in constructor
    this.searchInput = page.locator('input[placeholder="Buscar venta..."]');
    this.addButton = page.locator('button:has([data-testid="lucide-plus"])').first();
    this.salesList = page.locator(".space-y-3").first();
    this.saleCards = this.salesList.locator('[class*="cursor-pointer"]');
    // ...
  }

  // Navigation methods
  async goto(): Promise<void> {
    await this.page.goto(this.url);
    await this.page.waitForLoadState("networkidle");
  }

  async expectLoaded(): Promise<void> {
    await this.searchInput.waitFor({ state: "visible" });
  }

  // Interaction methods
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(300);
  }

  async clickAdd(): Promise<void> {
    await this.addButton.click();
  }

  async clickSaleByIndex(index: number): Promise<void> {
    await this.saleCards.nth(index).click();
  }

  // Query methods
  async getSaleCount(): Promise<number> {
    return this.saleCards.count();
  }

  // Expectation helpers
  async expectEmptyState(): Promise<void> {
    await this.emptyState.waitFor({ state: "visible" });
  }
}
```

### Usage in Tests

```typescript
import { test, expect } from "@playwright/test";
import { SalesListPage } from "../page-objects/SalesListPage";
import { NewSalePage } from "../page-objects/NewSalePage";

test("can search and filter sales", async ({ page }) => {
  const salesListPage = new SalesListPage(page);
  
  await salesListPage.goto();
  await salesListPage.expectLoaded();
  
  await salesListPage.search("Juan");
  await expect(salesListPage.saleCards).toHaveCount(3);
  
  await salesListPage.filterByVentas();
});
```

### Best Practices

- **One class per page**: Create separate files for each page/component
- **Group locators by purpose**: Search, filters, actions, content, pagination
- **Use `data-testid` when available**: Prefer stable test IDs over CSS selectors
- **Return `this` for chaining**: Optional fluent interface for complex flows
- **Include URL constants**: Makes navigation explicit and maintainable

---

## 2. Test Data Builder Pattern

Builders provide fluent APIs for constructing test data with sensible defaults.

### Structure

```typescript
// fixtures/test-data.ts

// ============================================================================
// Base Test Data (matches seeder)
// ============================================================================

export const DEMO_USER = {
  email: "demo@avileo.com",
  password: "demo123456",
  name: "Usuario Demo",
};

export const TEST_CUSTOMERS = [
  { id: "cust-1", name: "Juan Perez", dni: "12345678", phone: "+51 999 888 777" },
  { id: "cust-2", name: "Maria Garcia", dni: "87654321", phone: "+51 999 777 666" },
  // ...
];

export const TEST_PRODUCTS = [
  {
    id: "prod-1",
    name: "Pollo Entero",
    unit: "kg" as const,
    variants: [
      { id: "var-1-1", name: "Entero 2kg", sku: "POL-ENT-2KG", price: 25.0 },
      { id: "var-1-2", name: "Entero 2.5kg", sku: "POL-ENT-25KG", price: 30.0 },
    ],
  },
  // ...
];

// ============================================================================
// Scenario Builders
// ============================================================================

export interface SaleScenario {
  productIndex: number;
  variantIndex: number;
  totalAmount: number;
  pricePerKg: string;
  kilos: string;
  tara: string;
  expectedNetWeight: number;
}

export const TEST_SCENARIOS = {
  CASH_SALE: {
    productIndex: 0,
    variantIndex: 0,
    totalAmount: 100,
    pricePerKg: "10",
    kilos: "10.5",
    tara: "0.5",
    expectedNetWeight: 10.0,
  } as SaleScenario,

  CREDIT_SALE: {
    customerIndex: 0,
    productIndex: 1,
    variantIndex: 0,
    totalAmount: 200,
    pricePerKg: "20",
    kilos: "10.5",
    tara: "0.5",
    expectedBalanceDue: 200,
  } as SaleScenario,

  PARTIAL_PAYMENT_SALE: {
    customerIndex: 1,
    productIndex: 0,
    variantIndex: 1,
    totalAmount: 300,
    pricePerKg: "15",
    kilos: "20.5",
    tara: "0.5",
    initialPayment: 50,
    expectedBalanceDue: 250,
  } as SaleScenario,
};
```

### Builder Pattern Example

```typescript
// For complex object construction, use a builder class
export class SaleBuilder {
  private sale = {
    customerId: null,
    saleType: "contado" as const,
    totalAmount: "0",
    amountPaid: "0",
    balanceDue: "0",
    tara: "0",
    items: [] as any[],
  };

  withCustomer(customerId: string): this {
    this.sale.customerId = customerId;
    return this;
  }

  withSaleType(type: "contado" | "credito"): this {
    this.sale.saleType = type;
    return this;
  }

  withTotalAmount(amount: number): this {
    this.sale.totalAmount = amount.toString();
    return this;
  }

  withItem(item: { productId: string; quantity: number; unitPrice: number }): this {
    this.sale.items.push({
      ...item,
      subtotal: item.quantity * item.unitPrice,
    });
    return this;
  }

  build(): typeof this.sale {
    return { ...this.sale };
  }
}

// Usage
const sale = new SaleBuilder()
  .withCustomer("cust-1")
  .withSaleType("credito")
  .withTotalAmount(150)
  .withItem({ productId: "prod-1", quantity: 5, unitPrice: 30 })
  .build();
```

---

## 3. Test Fixture Pattern

Fixtures provide setup and teardown for tests, managing test data lifecycle.

### Structure

```typescript
// fixtures/seed-helper.ts

// ============================================================================
// E2E Credentials (separate from demo user)
// ============================================================================

export const E2E_CREDENTIALS = {
  email: "e2e@avileo.com",
  password: "e2e123456",
};

// ============================================================================
// Volume Data Initialization
// ============================================================================

import { initializeVolumeData, resetVolumeData } from "../mocks";

export interface VolumeConfig {
  customers?: number;
  products?: number;
  sales?: number;
  orders?: number;
}

// Setup before all tests in a describe block
export function setupTestSuite(config?: VolumeConfig) {
  beforeAll(() => {
    initializeVolumeData(config);
  });

  afterEach(() => {
    resetVolumeData();
  });

  afterAll(() => {
    resetVolumeData();
  });
}
```

### Usage with Playwright Test

```typescript
import { test, expect } from "@playwright/test";
import { LoginPage } from "../page-objects/LoginPage";
import { initializeVolumeData, resetVolumeData } from "../mocks";

test.describe("Sales Flow", () => {
  // Setup volume data for all tests
  test.beforeAll(() => {
    initializeVolumeData({ customers: 100, sales: 200 });
  });

  // Reset after each test
  test.afterEach(() => {
    resetVolumeData();
  });

  test("authenticated user can create sale", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login();
    // ... test steps
  });
});
```

### TestFixture Interface Pattern

```typescript
// For typed fixtures with proper cleanup
export interface TestFixture<T> {
  setup(): Promise<T>;
  teardown(data: T): Promise<void>;
}

export class SaleFixture implements TestFixture<Sale> {
  private saleId: string | null = null;

  async setup(): Promise<Sale> {
    // Create test sale via API or UI
    const sale = await createTestSale();
    this.saleId = sale.id;
    return sale;
  }

  async teardown(sale: Sale): Promise<void> {
    if (this.saleId) {
      await deleteTestSale(this.saleId);
      this.saleId = null;
    }
  }
}

// Usage
test("can update sale", async ({ page }) => {
  const fixture = new SaleFixture();
  const sale = await fixture.setup();
  
  try {
    // Test logic
  } finally {
    await fixture.teardown(sale);
  }
});
```

---

## 4. MSW Scenario Helpers

MSW (Mock Service Worker) handlers provide API mocking for isolated E2E tests.

### Structure

```typescript
// mocks/index.ts - Barrel export

import { handlers as baseHandlers } from "./handlers";
import {
  handlers as volumeHandlers,
  initializeVolumeData,
  resetVolumeData,
} from "./volume-handlers";
import { handlers as syncHandlers } from "./sync-handlers";

// Combined handlers for easy setup
export const handlers = [
  ...baseHandlers,
  ...volumeHandlers,
  ...syncHandlers,
];

// Re-export initialization functions
export { initializeVolumeData, resetVolumeData };
export { resetE2EData, getSales, addE2ESale, getCustomers } from "./handlers";
export { resetSyncStore, getPendingOperations } from "./sync-handlers";
```

### Usage in Test Setup

```typescript
import { test, expect } from "@playwright/test";
import { http, HttpResponse } from "msw";
import { initializeVolumeData, resetVolumeData, handlers } from "../mocks";

test.describe("Sales with MSW", () => {
  test.use({
    // Configure MSW for this test
    mswHandlers: handlers,
  });

  test.beforeEach(async () => {
    // Initialize volume data for realistic testing
    initializeVolumeData({ customers: 50, sales: 100 });
  });

  test.afterEach(() => {
    resetVolumeData();
  });

  test("handles high volume", async ({ page }) => {
    // Test with 1000+ pending sync operations
    await page.goto("/ventas");
    // ...
  });
});
```

### Custom Scenario Handlers

```typescript
// Predefined scenarios for specific test cases
export const scenarios = {
  // Empty state scenario
  empty: http.get("/api/sales", () => {
    return HttpResponse.json({ success: true, data: [] });
  }),

  // Error scenario
  serverError: http.get("/api/sales", () => {
    return HttpResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }),

  // Slow response scenario
  slow: http.get("/api/sales", async () => {
    await delay(5000); // 5 second delay
    return HttpResponse.json({ success: true, data: [] });
  }),

  // Conflict scenario for sync testing
  syncConflict: http.post("/api/sync/batch", () => {
    return HttpResponse.json({
      success: true,
      data: {
        results: [{ idempotencyKey: "op-1", success: false, error: "Conflict" }],
      },
    });
  }),
};

// Usage
test("handles empty state", async ({ page }) => {
  await page.route("**/api/sales", (route) => {
    return scenarios.empty(route);
  });
  // ...
});
```

---

## 5. Mobile Viewport Testing

Avileo is mobile-first. Tests should verify responsive behavior across device sizes.

### Viewport Constants

```typescript
// utils/index.ts

export const mobileViewport = {
  /** iPhone 14 - primary target device */
  iphone14: { width: 390, height: 844 },
  
  /** iPhone SE - smaller device */
  iphoneSE: { width: 375, height: 667 },
  
  /** Google Pixel 5 - Android reference */
  pixel5: { width: 393, height: 851 },
};

// Tablet viewport for responsive testing
export const tabletViewport = {
  ipadMini: { width: 768, height: 1024 },
  ipadPro11: { width: 834, height: 1194 },
};

// Desktop for admin flows
export const desktopViewport = {
  hd: { width: 1280, height: 720 },
  fullHd: { width: 1920, height: 1080 },
};
```

### Usage in Tests

```typescript
import { test, expect } from "@playwright/test";
import { mobileViewport } from "../utils";

// Test on specific mobile viewport
test.describe("Mobile Sales Flow", () => {
  test.use({
    viewport: mobileViewport.iphone14,
  });

  test("sales list shows FAB on mobile", async ({ page }) => {
    await page.goto("/ventas");
    const fab = page.locator('[data-testid="add-sale-fab"]');
    await expect(fab).toBeVisible();
  });
});

// Test multiple viewports
test.describe("Responsive Layout", () => {
  for (const [name, viewport] of Object.entries(mobileViewport)) {
    test(`renders correctly on ${name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/ventas");
      // Verify responsive behavior
    });
  }
});
```

### Test Project Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  // Default is desktop
  use: {
    baseURL: "http://localhost:5173",
  },

  // Projects for different device types
  projects: [
    {
      name: "mobile-chrome",
      use: {
        ...devices["iPhone 14"],
        // Or use custom viewport
        // viewport: mobileViewport.iphone14,
      },
    },
    {
      name: "mobile-safari",
      use: {
        ...devices["iPhone 13"],
      },
    },
    {
      name: "tablet-chrome",
      use: {
        ...devices["iPad (gen 7)"],
      },
    },
    {
      name: "desktop-chrome",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
});
```

---

## 6. Assertion Patterns

Custom assertions provide reusable, readable checks for common test scenarios.

### Structure

```typescript
// utils/index.ts

import { expect, type Page } from "@playwright/test";

// ============================================================================
// Currency Helpers
// ============================================================================

export function formatCurrency(amount: number): string {
  return `S/ ${amount.toFixed(2)}`;
}

export function parseCurrency(text: string): number {
  return parseFloat(text.replace(/[^0-9.]/g, "") || "0");
}

// ============================================================================
// Date Helpers
// ============================================================================

export function today(): string {
  return new Date().toISOString().split("T")[0];
}

export function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("es-PE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ============================================================================
// Custom Assertions
// ============================================================================

export const assertions = {
  /**
   * Assert a toast notification appears with specific message
   */
  async expectToast(
    page: Page,
    message: string | RegExp,
    timeout = 5000
  ): Promise<void> {
    const toast = page.getByTestId("toast");
    await toast.waitFor({ state: "visible", timeout });
    if (typeof message === "string") {
      await expect(toast).toContainText(message);
    } else {
      await expect(toast).toMatchText(message);
    }
  },

  /**
   * Assert a locator contains formatted currency amount
   */
  async expectCurrency(
    page: Page,
    locator: Locator,
    amount: number
  ): Promise<void> {
    const formatted = formatCurrency(amount);
    await expect(locator).toContainText(formatted);
  },

  /**
   * Assert a form field shows validation error
   */
  async expectValidationError(
    page: Page,
    field: string,
    message?: string
  ): Promise<void> {
    const error = page.locator(
      `[data-testid="${field}-error"], [data-field-error="${field}"]`
    );
    await expect(error).toBeVisible();
    if (message) {
      await expect(error).toContainText(message);
    }
  },

  /**
   * Assert page has no console errors (except warnings)
   */
  async expectNoConsoleErrors(page: Page): Promise<void> {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });
    await page.reload();
    expect(errors.filter(e => !e.includes("Warning"))).toHaveLength(0);
  },

  /**
   * Assert element is in viewport (not clipped)
   */
  async expectInViewport(page: Page, selector: string): Promise<void> {
    const element = page.locator(selector);
    const box = await element.boundingBox();
    const viewport = page.viewportSize();
    
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
  },
};

// ============================================================================
// Page Assertion Helpers
// ============================================================================

export const pageAssertions = {
  /**
   * Assert URL matches expected path
   */
  async expectUrl(page: Page, path: string | RegExp): Promise<void> {
    if (typeof path === "string") {
      await expect(page).toHaveURL(new URL(path, page.url()).href);
    } else {
      await expect(page).toHaveURL(path);
    }
  },

  /**
   * Assert redirect occurred
   */
  async expectRedirect(
    page: Page,
    from: string,
    to: string
  ): Promise<void> {
    await expect(page).toHaveURL(new URL(to, page.url()).href);
  },
};
```

### Usage in Tests

```typescript
import { test, expect } from "@playwright/test";
import { assertions, formatCurrency } from "../utils";
import { NewSalePage } from "../page-objects/NewSalePage";

test("sale displays correct total", async ({ page }) => {
  const newSalePage = new NewSalePage(page);
  await newSalePage.goto();
  
  // Use custom assertion
  await assertions.expectCurrency(page, newSalePage.totalLocator, 150.00);
  
  // Or directly with expect
  await expect(newSalePage.totalLocator).toContainText("S/ 150.00");
});

test("shows validation error for missing customer", async ({ page }) => {
  const newSalePage = new NewSalePage(page);
  await newSalePage.goto();
  await newSalePage.completeSaleWithoutCustomer();
  
  await assertions.expectValidationError(page, "customer", "Cliente es requerido");
});

test("displays toast on save", async ({ page }) => {
  await completeForm(page);
  await assertions.expectToast(page, /guardado exitosamente/i);
});
```

---

## Quick Reference

### Import Aliases in E2E

```typescript
// Page Objects
import { SalesListPage } from "../page-objects/SalesListPage";

// Test Data & Fixtures
import { TEST_CUSTOMERS, TEST_PRODUCTS } from "../fixtures/test-data";
import { initializeVolumeData, resetVolumeData } from "../mocks";

// Utilities & Assertions
import { assertions, mobileViewport, formatCurrency } from "../utils";
```

### Common Test Setup Pattern

```typescript
import { test, expect } from "@playwright/test";
import { LoginPage } from "../page-objects/LoginPage";
import { initializeVolumeData, resetVolumeData } from "../mocks";

test.describe("Feature Name", () => {
  test.beforeAll(() => {
    initializeVolumeData();
  });

  test.afterEach(() => {
    resetVolumeData();
  });

  test.afterAll(() => {
    resetVolumeData();
  });

  test("test case description", async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login();

    // Act
    // ...

    // Assert
    // ...
  });
});
```

---

## Related Documentation

- [AGENTS.md](./AGENTS.md) - E2E testing overview
- [App AGENTS.md](../../AGENTS.md) - Frontend conventions
- [Playwright Docs](https://playwright.dev/docs/intro) - Official Playwright documentation
- [MSW Docs](https://mswjs.io/docs/) - Mock Service Worker documentation
