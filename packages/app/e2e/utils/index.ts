/**
 * E2E Test Utilities Library
 *
 * Reusable helpers for E2E tests in Avileo.
 */

import { expect } from "@playwright/test";

/**
 * Mobile viewport helpers
 */
export const mobileViewport = {
  iphone14: { width: 390, height: 844 },
  iphoneSE: { width: 375, height: 667 },
  pixel5: { width: 393, height: 851 },
};

/**
 * Currency formatting helpers
 */
export function formatCurrency(amount: number): string {
  return `S/ ${amount.toFixed(2)}`;
}

export function parseCurrency(text: string): number {
  return parseFloat(text.replace(/[^0-9.]/g, "") || "0");
}

/**
 * Date helpers
 */
export function today(): string {
  return new Date().toISOString().split("T")[0];
}

export function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

/**
 * Custom assertions
 */
export const assertions = {
  async expectToast(
    page: any,
    message: string | RegExp
  ): Promise<void> {
    const toast = page.getByTestId("toast");
    await toast.waitFor({ state: "visible", timeout: 5000 });
    if (typeof message === "string") {
      await expect(toast).toContainText(message);
    }
  },

  async expectCurrency(
    page: any,
    locator: any,
    amount: number
  ): Promise<void> {
    const formatted = formatCurrency(amount);
    await expect(locator).toContainText(formatted);
  },

  async expectValidationError(
    page: any,
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
};

/**
 * Test data scenarios
 */
export const TEST_SCENARIOS = {
  // Sale scenarios
  cashSale: { paymentMode: "pago_total", saleType: "contado" },
  creditFull: { paymentMode: "debe_todo", saleType: "credito" },
  creditPartial: {
    paymentMode: "a_cuenta",
    saleType: "credito",
    amountPaid: 50,
  },

  // Order scenarios
  draftOrder: { status: "draft", hasItems: true },
  confirmedOrder: { status: "confirmed", hasItems: true },
  deliveredOrder: { status: "delivered", hasItems: true },

  // Volume scenarios
  light: {
    customers: 10,
    products: 5,
    sales: 20,
    orders: 10,
  },
  medium: {
    customers: 100,
    products: 20,
    sales: 200,
    orders: 50,
  },
  heavy: {
    customers: 1000,
    products: 100,
    sales: 500,
    orders: 200,
  },
};
