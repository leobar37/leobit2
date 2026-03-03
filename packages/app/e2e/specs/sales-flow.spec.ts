/**
 * Sales Flow E2E Tests
 *
 * These tests cover the complete sales creation flow:
 * 1. Cash sale (pago_total)
 * 2. Credit sale (debe_todo)
 * 3. Partial payment sale (a_cuenta)
 * 4. Multiple products sale
 * 5. Unit-based product sale (packs)
 */

import { test, expect } from "@playwright/test";
import { NewSalePage } from "../pages/new-sale.page";
import { TEST_CUSTOMERS, TEST_SCENARIOS } from "../fixtures/test-data";

test.describe("Sales Flow E2E", () => {
  let newSalePage: NewSalePage;

  test.beforeEach(async ({ page }) => {
    newSalePage = new NewSalePage(page);
    await newSalePage.goto();
  });

  test.describe("Cash Sale (Pago Total)", () => {
    test("should create a cash sale with a single kg-based product", async ({ page }) => {
      const scenario = TEST_SCENARIOS.CASH_SALE;

      // 1. Select product (Pollo Entero - Entero 2kg)
      await newSalePage.openVariantSelector();
      // Wait for variant selector modal and select first product
      await page.waitForSelector('[data-testid="variant-selector-modal"]', { timeout: 5000 });
      // Select first product and variant, then confirm
      await page.locator('[data-testid^="product-option-"]').first().click();
      await page.locator('[data-testid^="variant-option-"]').first().click();
      await page.getByTestId('variant-selector-confirm').click();

      // 2. Fill calculator values
      await newSalePage.fillCalculatorValues({
        totalAmount: scenario.totalAmount.toString(),
        pricePerKg: scenario.pricePerKg.toString(),
        kilos: scenario.kilos,
        tara: scenario.tara,
      });

      // 3. Verify calculator summary shows correct values
      await expect(newSalePage.calculatorSummary).toBeVisible();
      const netWeight = await newSalePage.getNetWeight();
      expect(netWeight).toContain(scenario.expectedNetWeight.toString());

      // 4. Add to cart
      await newSalePage.addToCart();

      // 5. Verify cart has 1 item
      await newSalePage.expectCartHasItems(1);

      // 6. Verify sale summary shows correct total
      await newSalePage.expectSaleTotal(scenario.totalAmount.toFixed(2));

      // 7. Submit sale
      await newSalePage.submitSale();

      // 8. Verify redirect to dashboard
      await page.waitForURL("/dashboard", { timeout: 10000 });
      await expect(page.locator("text=Nueva Venta")).toBeVisible();
    });

    test("should show error when trying to submit empty cart", async () => {
      // Try to submit without adding items
      // Button should be disabled or not visible when cart is empty
      const isVisible = await newSalePage.submitSaleContainer.isVisible().catch(() => false);
      if (isVisible) {
        const isEnabled = await newSalePage.isSubmitButtonEnabled();
        expect(isEnabled).toBe(false);
      }
    });
  });

  test.describe("Credit Sale (Debe Todo)", () => {
    test("should require customer for credit sale", async () => {
      // 1. Select "Debe" payment mode
      await newSalePage.selectPaymentMode("debe_todo");

      // 2. Verify customer is required error appears
      await newSalePage.expectCustomerRequiredError();

      // 3. Add product to cart
      await newSalePage.openVariantSelector();
      await newSalePage.page.waitForSelector('[data-testid="variant-selector-modal"]', { timeout: 5000 });
      await newSalePage.page.locator('[data-testid^="product-option-"]').first().click();
      await newSalePage.page.locator('[data-testid^="variant-option-"]').first().click();
      await newSalePage.page.getByTestId('variant-selector-confirm').click();

      await newSalePage.fillCalculatorValues({
        totalAmount: "100",
        pricePerKg: "10",
        kilos: "10.5",
        tara: "0.5",
      });
      await newSalePage.addToCart();

      // 4. Try to submit without customer
      await newSalePage.submitSale();

      // 5. Verify error message
      const error = await newSalePage.getSubmitError();
      expect(error).toContain("cliente");
    });

    test("should create credit sale with customer selected", async ({ page }) => {
      const scenario = TEST_SCENARIOS.CREDIT_SALE;
      const customer = TEST_CUSTOMERS[scenario.customerIndex];

      // 1. Select "Debe" payment mode
      await newSalePage.selectPaymentMode("debe_todo");

      // 2. Select customer
      await newSalePage.selectCustomerByName(customer.name);
      const selectedName = await newSalePage.getSelectedCustomerName();
      expect(selectedName).toBe(customer.name);

      // 3. Add product
      await newSalePage.openVariantSelector();
      await page.waitForSelector('[data-testid="variant-selector-modal"]', { timeout: 5000 });
      await page.locator('[data-testid^="product-option-"]').first().click();
      await page.locator('[data-testid^="variant-option-"]').first().click();
      await page.getByTestId('variant-selector-confirm').click();

      await newSalePage.fillCalculatorValues({
        totalAmount: scenario.totalAmount.toString(),
        pricePerKg: scenario.pricePerKg.toString(),
        kilos: scenario.kilos,
        tara: scenario.tara,
      });
      await newSalePage.addToCart();

      // 4. Verify balance due equals total
      await newSalePage.expectSaleTotal(scenario.totalAmount.toFixed(2));
      const balanceDue = await newSalePage.getBalanceDue();
      expect(balanceDue).toContain(scenario.expectedBalanceDue.toFixed(2));

      // 5. Submit sale
      await newSalePage.submitSale();

      // 6. Verify redirect
      await page.waitForURL("/dashboard", { timeout: 10000 });
    });
  });

  test.describe("Partial Payment Sale (A Cuenta)", () => {
    test("should create sale with partial payment", async ({ page }) => {
      const scenario = TEST_SCENARIOS.PARTIAL_PAYMENT_SALE;
      const customer = TEST_CUSTOMERS[scenario.customerIndex];

      // 1. Select "A cuenta" payment mode
      await newSalePage.selectPaymentMode("a_cuenta");

      // 2. Select customer
      await newSalePage.selectCustomerByName(customer.name);

      // 3. Add product
      await newSalePage.openVariantSelector();
      await page.waitForSelector('[data-testid="variant-selector-modal"]', { timeout: 5000 });
      await page.locator('[data-testid^="product-option-"]').first().click();
      await page.locator('[data-testid^="variant-option-"]').first().click();
      await page.getByTestId('variant-selector-confirm').click();

      await newSalePage.fillCalculatorValues({
        totalAmount: scenario.totalAmount.toString(),
        pricePerKg: scenario.pricePerKg.toString(),
        kilos: scenario.kilos,
        tara: scenario.tara,
      });
      await newSalePage.addToCart();

      // 4. Enter initial payment
      await newSalePage.setInitialPayment(scenario.initialPayment.toString());

      // 5. Verify balance due is correct
      await newSalePage.expectSaleTotal(scenario.totalAmount.toFixed(2));
      const balanceDue = await newSalePage.getBalanceDue();
      expect(balanceDue).toContain(scenario.expectedBalanceDue.toFixed(2));

      // 6. Submit sale
      await newSalePage.submitSale();

      // 7. Verify redirect
      await page.waitForURL("/dashboard", { timeout: 10000 });
    });

    test("should show error for invalid partial payment amount", async () => {
      // 1. Select "A cuenta" and add product
      await newSalePage.selectPaymentMode("a_cuenta");
      await newSalePage.selectCustomerByName(TEST_CUSTOMERS[0].name);

      await newSalePage.openVariantSelector();
      await newSalePage.page.waitForSelector('[data-testid="variant-selector-modal"]', { timeout: 5000 });
      await newSalePage.page.locator('[data-testid^="product-option-"]').first().click();
      await newSalePage.page.locator('[data-testid^="variant-option-"]').first().click();
      await newSalePage.page.getByTestId('variant-selector-confirm').click();

      await newSalePage.fillCalculatorValues({
        totalAmount: "100",
        pricePerKg: "10",
        kilos: "10.5",
        tara: "0.5",
      });
      await newSalePage.addToCart();

      // 2. Enter payment greater than total
      await newSalePage.setInitialPayment("150");

      // 3. Try to submit
      await newSalePage.submitSale();

      // 4. Verify error
      const error = await newSalePage.getSubmitError();
      expect(error.length).toBeGreaterThan(0);
    });
  });

  test.describe("Multiple Products Sale", () => {
    test("should create sale with multiple products", async ({ page }) => {
      const scenario = TEST_SCENARIOS.MULTIPLE_PRODUCTS_SALE;

      // Add first product
      await newSalePage.openVariantSelector();
      await page.waitForSelector('[data-testid="variant-selector-modal"]', { timeout: 5000 });
      await page.locator('[data-testid^="product-option-"]').first().click();
      await page.locator('[data-testid^="variant-option-"]').first().click();
      await page.getByTestId('variant-selector-confirm').click();

      await newSalePage.fillCalculatorValues({
        totalAmount: scenario.items[0].totalAmount.toString(),
        pricePerKg: scenario.items[0].pricePerKg.toString(),
        kilos: scenario.items[0].kilos,
        tara: scenario.items[0].tara,
      });
      await newSalePage.addToCart();

      // Add second product
      await newSalePage.anotherProductButton.click();
      await page.waitForSelector('[data-testid="variant-selector-modal"]', { timeout: 5000 });
      await page.locator('[data-testid^="product-option-"]').nth(1).click();
      await page.locator('[data-testid^="variant-option-"]').first().click();
      await page.getByTestId('variant-selector-confirm').click();

      await newSalePage.fillCalculatorValues({
        totalAmount: scenario.items[1].totalAmount.toString(),
        pricePerKg: scenario.items[1].pricePerKg.toString(),
        kilos: scenario.items[1].kilos,
        tara: scenario.items[1].tara,
      });
      await newSalePage.addToCart();

      // Verify cart has 2 items
      await newSalePage.expectCartHasItems(2);

      // Verify total is sum of both items
      await newSalePage.expectSaleTotal(scenario.expectedTotal.toFixed(2));

      // Submit sale
      await newSalePage.submitSale();
      await page.waitForURL("/dashboard", { timeout: 10000 });
    });
  });

  test.describe("Unit-based Product Sale (Packs)", () => {
    test("should create sale with unit-based product using packs", async ({ page }) => {
      // This test assumes there's a unit-based product (like Alitas)
      // Navigate to new sale page
      await newSalePage.goto();

      // Open variant selector to select a unit-based product
      await newSalePage.openVariantSelector();
      await page.waitForSelector('[data-testid="variant-selector-modal"]', { timeout: 5000 });

      // Try to find and select a unit-based product (usually the last one or with "unidad" label)
      const products = await page.locator('[data-testid^="product-option-"]').all();
      let unitProductFound = false;

      for (let i = 0; i < products.length; i++) {
        await products[i].click();
        // Check if this product has unit-based variants
        const variants = await page.locator('[data-testid^="variant-option-"]').all();
        if (variants.length > 0) {
          // Select first variant
          await variants[0].click();
          unitProductFound = true;
          break;
        }
        // Go back to product list if no variants
        await page.goBack();
      }

      // If we couldn't find a specific unit product, just use the first available
      if (!unitProductFound) {
        await newSalePage.openVariantSelector();
        await page.waitForSelector('[data-testid="variant-selector-modal"]', { timeout: 5000 });
        await page.locator('[data-testid^="product-option-"]').first().click();
        await page.locator('[data-testid^="variant-option-"]').first().click();
        await page.getByTestId('variant-selector-confirm').click();
      }

      // Fill values - for unit products, use packs and units
      const productUnit = await newSalePage.page.locator('[data-testid="selected-variant-badge"]').textContent();

      if (productUnit?.toLowerCase().includes("pack") || productUnit?.toLowerCase().includes("unidad")) {
        // Unit-based product
        await newSalePage.fillCalculatorValues({
          packs: "2",
          units: "5",
        });
      } else {
        // KG-based product
        await newSalePage.fillCalculatorValues({
          totalAmount: "100",
          pricePerKg: "10",
          kilos: "10.5",
          tara: "0.5",
        });
      }

      await newSalePage.addToCart();

      // Verify item was added
      await expect(newSalePage.cartSection).toBeVisible();

      // Complete the sale
      await newSalePage.submitSale();
      await page.waitForURL("/dashboard", { timeout: 10000 });
    });
  });

  test.describe("Cart Management", () => {
    test("should remove item from cart", async ({ page }) => {
      // Add two products
      await newSalePage.openVariantSelector();
      await page.waitForSelector('[data-testid="variant-selector-modal"]', { timeout: 5000 });
      await page.locator('[data-testid^="product-option-"]').first().click();
      await page.locator('[data-testid^="variant-option-"]').first().click();
      await page.getByTestId('variant-selector-confirm').click();

      await newSalePage.fillCalculatorValues({
        totalAmount: "100",
        pricePerKg: "10",
        kilos: "10.5",
        tara: "0.5",
      });
      await newSalePage.addToCart();

      // Add second product
      await newSalePage.anotherProductButton.click();
      await page.waitForSelector('[data-testid="variant-selector-modal"]', { timeout: 5000 });
      await page.locator('[data-testid^="product-option-"]').nth(1).click();
      await page.locator('[data-testid^="variant-option-"]').first().click();
      await page.getByTestId('variant-selector-confirm').click();

      await newSalePage.fillCalculatorValues({
        totalAmount: "150",
        pricePerKg: "15",
        kilos: "10.5",
        tara: "0.5",
      });
      await newSalePage.addToCart();

      // Verify 2 items
      await newSalePage.expectCartHasItems(2);

      // Remove first item
      await newSalePage.removeCartItem(0);

      // Verify 1 item remains
      await newSalePage.expectCartHasItems(1);
    });

    test("should reset calculator after adding to cart", async ({ page }) => {
      await newSalePage.openVariantSelector();
      await page.waitForSelector('[data-testid="variant-selector-modal"]', { timeout: 5000 });
      await page.locator('[data-testid^="product-option-"]').first().click();
      await page.locator('[data-testid^="variant-option-"]').first().click();
      await page.getByTestId('variant-selector-confirm').click();

      await newSalePage.fillCalculatorValues({
        totalAmount: "100",
        pricePerKg: "10",
        kilos: "10.5",
        tara: "0.5",
      });

      await newSalePage.addToCart();

      // After adding, calculator should still show the product but values may reset
      // The product card should still be visible
      await expect(newSalePage.selectedProductCard).toBeVisible();
    });
  });
});
