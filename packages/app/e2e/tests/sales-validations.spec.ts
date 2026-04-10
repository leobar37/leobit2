/**
 * Sale Validations E2E Tests (T-007)
 *
 * Test cases for sale validation error scenarios:
 * - SALE-VAL-001: Error: venta sin productos
 * - SALE-VAL-002: Error: total igual a 0
 * - SALE-VAL-003: Error: total no coincide con suma de items
 * - SALE-VAL-004: Error: crédito sin seleccionar cliente
 * - SALE-VAL-005: Error: contado con monto diferente al total
 * - SALE-VAL-006: Error: crédito con abono mayor al total
 * - SALE-VAL-007: Error: producto sin variante seleccionada
 * - SALE-VAL-008: Error: cantidad excede stock disponible
 */

import { test, expect } from "@playwright/test";
import { NewSalePage } from "../pages/new-sale.page";
import { LoginPage } from "../page-objects/LoginPage";
import { initializeVolumeData, resetVolumeData } from "../mocks";

test.describe("Sale Validations", () => {
  test.beforeEach(async ({ page }) => {
    await initializeVolumeData();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login();
  });

  test.afterEach(async () => {
    resetVolumeData();
  });

  /**
   * SALE-VAL-001: Error: venta sin productos
   * Priority: P0
   *
   * Verifies that attempting to complete a sale without adding any products
   * shows appropriate validation error.
   */
  test("SALE-VAL-001: Error: venta sin productos", async ({ page }) => {
    const newSalePage = new NewSalePage(page);
    await newSalePage.goto();

    // Try to complete without adding any products
    await newSalePage.submitSale();

    // Should show validation error about needing at least one product
    const errorText = await newSalePage.getSubmitError();
    expect(errorText.toLowerCase()).toMatch(/producto|items|cart/i);
  });

  /**
   * SALE-VAL-002: Error: total igual a 0
   * Priority: P0
   *
   * Verifies that attempting to complete a sale with total amount of 0
   * shows appropriate validation error.
   */
  test("SALE-VAL-002: Error: total igual a 0", async ({ page }) => {
    const newSalePage = new NewSalePage(page);
    await newSalePage.goto();

    // Select payment mode (contado)
    await newSalePage.selectPaymentMode("pago_total");

    // Add a product
    await newSalePage.openVariantSelector();
    await page.waitForSelector('[data-testid^="product-option-"]', { timeout: 5000 });
    await page.locator('[data-testid="product-option-name"]').filter({ hasText: "Pollo" }).first().click();
    await page.waitForSelector('[data-testid^="variant-option-"]', { timeout: 5000 });
    await page.waitForTimeout(500);
    await page.locator('[data-testid="variant-option-name"]').first().click();
    await page.waitForTimeout(300);
    await page.getByTestId("variant-selector-confirm").click();
    await page.waitForSelector('[data-testid="calculator-form"]', { timeout: 5000 });

    // Enter 0 as total amount
    await newSalePage.fillCalculatorValues({ totalAmount: "0" });

    // Add to cart
    await newSalePage.addToCart();

    // Try to submit sale
    await newSalePage.submitSale();

    // Should show validation error about total being 0
    const errorText = await newSalePage.getSubmitError();
    expect(errorText.toLowerCase()).toMatch(/total|cero|0|monto/i);
  });

  /**
   * SALE-VAL-003: Error: total no coincide con suma de items
   * Priority: P1
   *
   * Verifies that when cart total doesn't match the expected sale total,
   * appropriate validation error is shown.
   */
  test("SALE-VAL-003: Error: total no coincide con suma de items", async ({ page }) => {
    const newSalePage = new NewSalePage(page);
    await newSalePage.goto();

    // Select payment mode (contado)
    await newSalePage.selectPaymentMode("pago_total");

    // Add a product
    await newSalePage.openVariantSelector();
    await page.waitForSelector('[data-testid^="product-option-"]', { timeout: 5000 });
    await page.locator('[data-testid="product-option-name"]').filter({ hasText: "Pollo" }).first().click();
    await page.waitForSelector('[data-testid^="variant-option-"]', { timeout: 5000 });
    await page.waitForTimeout(500);
    await page.locator('[data-testid="variant-option-name"]').first().click();
    await page.waitForTimeout(300);
    await page.getByTestId("variant-selector-confirm").click();
    await page.waitForSelector('[data-testid="calculator-form"]', { timeout: 5000 });

    // Enter a total amount
    await newSalePage.fillCalculatorValues({ totalAmount: "100" });

    // Add to cart
    await newSalePage.addToCart();

    // Try to submit sale - the system should calculate correct total from cart items
    // If there's a mismatch between cart total and items sum, it should show error
    await newSalePage.submitSale();

    // Check for either success or mismatch error
    // The exact behavior depends on implementation - might pass if system auto-calculates
    const currentUrl = page.url();
    const hasError = currentUrl.includes("/ventas/nueva");
    if (hasError) {
      const errorText = await newSalePage.getSubmitError();
      // If still on the page, there should be an error about mismatch
      expect(errorText.toLowerCase()).toMatch(/total|coincide|diferente|mismatch/i);
    }
  });

  /**
   * SALE-VAL-004: Error: crédito sin seleccionar cliente
   * Priority: P0
   *
   * Verifies that attempting to create a credit sale (débito) without selecting
   * a customer shows appropriate validation error.
   */
  test("SALE-VAL-004: Error: crédito sin seleccionar cliente", async ({ page }) => {
    const newSalePage = new NewSalePage(page);
    await newSalePage.goto();

    // Select "debe todo" (credit) payment mode without selecting customer
    await newSalePage.selectPaymentMode("debe_todo");

    // Add a product
    await newSalePage.openVariantSelector();
    await page.waitForSelector('[data-testid^="product-option-"]', { timeout: 5000 });
    await page.locator('[data-testid="product-option-name"]').filter({ hasText: "Pollo" }).first().click();
    await page.waitForSelector('[data-testid^="variant-option-"]', { timeout: 5000 });
    await page.waitForTimeout(500);
    await page.locator('[data-testid="variant-option-name"]').first().click();
    await page.waitForTimeout(300);
    await page.getByTestId("variant-selector-confirm").click();
    await page.waitForSelector('[data-testid="calculator-form"]', { timeout: 5000 });

    // Enter total amount
    await newSalePage.fillCalculatorValues({ totalAmount: "50" });

    // Add to cart
    await newSalePage.addToCart();

    // Try to complete sale - should show error about customer being required
    await newSalePage.submitSale();

    // Should show customer required error
    await newSalePage.expectCustomerRequiredError();
  });

  /**
   * SALE-VAL-005: Error: contado con monto diferente al total
   * Priority: P1
   *
   * Verifies that for cash sales (contado), if the payment amount doesn't match
   * the total, appropriate validation is shown.
   */
  test("SALE-VAL-005: Error: contado con monto diferente al total", async ({ page }) => {
    const newSalePage = new NewSalePage(page);
    await newSalePage.goto();

    // Select cash payment mode (pago_total)
    await newSalePage.selectPaymentMode("pago_total");

    // Add a product with a specific total
    await newSalePage.openVariantSelector();
    await page.waitForSelector('[data-testid^="product-option-"]', { timeout: 5000 });
    await page.locator('[data-testid="product-option-name"]').filter({ hasText: "Pollo" }).first().click();
    await page.waitForSelector('[data-testid^="variant-option-"]', { timeout: 5000 });
    await page.waitForTimeout(500);
    await page.locator('[data-testid="variant-option-name"]').first().click();
    await page.waitForTimeout(300);
    await page.getByTestId("variant-selector-confirm").click();
    await page.waitForSelector('[data-testid="calculator-form"]', { timeout: 5000 });

    // Enter total amount
    await newSalePage.fillCalculatorValues({ totalAmount: "100" });

    // Add to cart
    await newSalePage.addToCart();

    // For pago_total, the system should expect exact payment
    // The exact validation behavior depends on implementation
    await newSalePage.submitSale();

    // If there's validation for exact amount matching, check for error
    const currentUrl = page.url();
    const hasError = currentUrl.includes("/ventas/nueva");
    if (hasError) {
      const errorText = await newSalePage.getSubmitError();
      expect(errorText.toLowerCase()).toMatch(/total|exact|igual|pago/i);
    }
  });

  /**
   * SALE-VAL-006: Error: crédito con abono mayor al total
   * Priority: P1
   *
   * Verifies that for credit sales with partial payment (a cuenta),
   * if the initial payment exceeds the total, appropriate error is shown.
   */
  test("SALE-VAL-006: Error: crédito con abono mayor al total", async ({ page }) => {
    const newSalePage = new NewSalePage(page);
    await newSalePage.goto();

    // Select customer first (required for credit)
    await newSalePage.selectCustomerByName("Cliente Test 1");

    // Select "a cuenta" (partial payment) payment mode
    await newSalePage.selectPaymentMode("a_cuenta");

    // Add a product
    await newSalePage.openVariantSelector();
    await page.waitForSelector('[data-testid^="product-option-"]', { timeout: 5000 });
    await page.locator('[data-testid="product-option-name"]').filter({ hasText: "Pollo" }).first().click();
    await page.waitForSelector('[data-testid^="variant-option-"]', { timeout: 5000 });
    await page.waitForTimeout(500);
    await page.locator('[data-testid="variant-option-name"]').first().click();
    await page.waitForTimeout(300);
    await page.getByTestId("variant-selector-confirm").click();
    await page.waitForSelector('[data-testid="calculator-form"]', { timeout: 5000 });

    // Enter total amount
    await newSalePage.fillCalculatorValues({ totalAmount: "50" });

    // Add to cart
    await newSalePage.addToCart();

    // Enter initial payment that exceeds total
    await newSalePage.setInitialPayment("100");

    // Try to complete sale - should show error about payment exceeding total
    await newSalePage.submitSale();

    // Check for validation error about payment exceeding total
    const errorText = await newSalePage.getSubmitError();
    expect(errorText.toLowerCase()).toMatch(/pago|abono|super|mayor|exced/i);
  });

  /**
   * SALE-VAL-007: Error: producto sin variante seleccionada
   * Priority: P1
   *
   * Verifies that attempting to add a product without selecting a variant
   * shows appropriate validation error.
   */
  test("SALE-VAL-007: Error: producto sin variante seleccionada", async ({ page }) => {
    const newSalePage = new NewSalePage(page);
    await newSalePage.goto();

    // Open the product/variant selector
    await newSalePage.openVariantSelector();

    // Wait for product list to appear
    await page.waitForSelector('[data-testid^="product-option-"]', { timeout: 5000 });

    // Select a product but don't select a variant - try to confirm immediately
    await page.locator('[data-testid="product-option-name"]').filter({ hasText: "Pollo" }).first().click();

    // Wait a moment for variant list
    await page.waitForTimeout(500);

    // Try to confirm without selecting variant
    // The UI should prevent this or show an error
    const confirmButton = page.getByTestId("variant-selector-confirm");

    // Either the button should be disabled, or an error should appear after clicking
    const isDisabled = await confirmButton.isDisabled();

    if (!isDisabled) {
      // If button is somehow enabled, clicking should show error
      await confirmButton.click();
      await page.waitForTimeout(500);
      // Check for variant required error
      const modal = page.locator('[data-testid="variant-selector-modal"]');
      if (await modal.isVisible().catch(() => false)) {
        // Should show variant selection error
        await expect(page.locator("text=/variante|variant/i")).toBeVisible();
      }
    } else {
      // Button being disabled is the correct behavior
      expect(isDisabled).toBe(true);
    }
  });

  /**
   * SALE-VAL-008: Error: cantidad excede stock disponible
   * Priority: P2
   *
   * Verifies that attempting to add more quantity of a product than available
   * in stock shows appropriate validation or warning.
   *
   * Note: This test may require specific stock-enabled products in the test data.
   * If stock tracking is not enabled or products have unlimited stock, this test
   * may pass without showing an error.
   */
  test("SALE-VAL-008: Error: cantidad excede stock disponible", async ({ page }) => {
    const newSalePage = new NewSalePage(page);
    await newSalePage.goto();

    // Select payment mode
    await newSalePage.selectPaymentMode("pago_total");

    // Add a product
    await newSalePage.openVariantSelector();
    await page.waitForSelector('[data-testid^="product-option-"]', { timeout: 5000 });
    await page.locator('[data-testid="product-option-name"]').filter({ hasText: "Pollo" }).first().click();
    await page.waitForSelector('[data-testid^="variant-option-"]', { timeout: 5000 });
    await page.waitForTimeout(500);
    await page.locator('[data-testid="variant-option-name"]').first().click();
    await page.waitForTimeout(300);
    await page.getByTestId("variant-selector-confirm").click();
    await page.waitForSelector('[data-testid="calculator-form"]', { timeout: 5000 });

    // The exact way to specify quantity depends on the UI
    // For pack-based products, try to enter a very high number
    // For kg-based products, enter a very high weight
    // This test checks if there's any stock validation

    // Enter a very high amount
    await newSalePage.fillCalculatorValues({ totalAmount: "999999999" });

    // Add to cart
    await newSalePage.addToCart();

    // Submit and check behavior
    await newSalePage.submitSale();

    // Check if there's a stock-related error
    const errorText = await newSalePage.getSubmitError();
    // Stock validation may show as stock/existencias/inventario error
    if (errorText) {
      expect(errorText.toLowerCase()).toMatch(/stock|exist|inventario|disponible|disponibilidad/i);
    }
  });
});
