// @ts-nocheck - E2E test file
/**
 * Credit Sales E2E Tests (T-006)
 *
 * Test cases for credit (crédito) sale flows including:
 * - SALE-CRED-001: Crédito sin abono (debe todo)
 * - SALE-CRED-002: Crédito con abono parcial (a cuenta)
 * - SALE-CRED-003: Crédito con abono total (pago total)
 * - SALE-CRED-004: Validación: crédito sin cliente muestra error
 * - SALE-CRED-005: Verificar deuda en página de cobros
 */

import { test, expect } from "@playwright/test";
import { NewSalePage } from "../page-objects/NewSalePage";
import { CobrosPage } from "../page-objects/CobrosPage";
import { SalesListPage } from "../page-objects/SalesListPage";
import { SaleDetailPage } from "../page-objects/SaleDetailPage";
import { LoginPage } from "../page-objects/LoginPage";

test.describe("Credit Sales (Crédito)", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login();
  });

  /**
   * SALE-CRED-001: Crédito sin abono (debe todo)
   * Priority: P0
   *
   * Creates a credit sale (no initial payment) and verifies:
   * - Sale is created successfully
   * - Balance due equals total amount
   */
  test("SALE-CRED-001: Crédito sin abono (debe todo)", async ({ page }) => {
    const newSalePage = new NewSalePage(page);
    await newSalePage.goto();

    // Select customer - using first seeded customer
    await newSalePage.selectCustomer("Cliente Test 1");

    // Select "debe todo" payment mode (credit with no payment)
    await newSalePage.selectPaymentMode("debe_todo");

    // Select product and variant
    await newSalePage.selectProductAndVariant("Pollo E2E", "Entero E2E");

    // Enter total amount
    await newSalePage.enterTotalAmount("100");

    // Add to cart
    await newSalePage.addToCart();

    // Complete sale
    await newSalePage.completeSale();
    await newSalePage.expectSaleCompleted();

    // Verify we're redirected to dashboard
    await expect(page).toHaveURL("/dashboard");

    // Navigate to cobros to verify the debt was created
    const cobrosPage = new CobrosPage(page);
    await cobrosPage.goto();

    // The customer should appear in the debtors list with full amount owed
    await expect(page.getByText("Cliente Test 1")).toBeVisible();
    await expect(page.getByText(/S\/\s*100\.00/)).toBeVisible();
  });

  /**
   * SALE-CRED-002: Crédito con abono parcial (a cuenta)
   * Priority: P0
   *
   * Creates a credit sale with partial payment and verifies:
   * - Sale is created with partial payment
   * - Remaining balance is correctly calculated
   */
  test("SALE-CRED-002: Crédito con abono parcial (a cuenta)", async ({ page }) => {
    const newSalePage = new NewSalePage(page);
    await newSalePage.goto();

    // Select customer
    await newSalePage.selectCustomer("Cliente Test 2");

    // Select "a cuenta" payment mode (partial payment)
    await newSalePage.selectPaymentMode("a_cuenta");

    // Select product and variant
    await newSalePage.selectProductAndVariant("Pollo E2E", "Entero E2E");

    // Enter total amount
    await newSalePage.enterTotalAmount("100");

    // Enter partial amount paid (30 soles)
    await page.fill('input[placeholder="Monto a cuenta"]', "30");

    // Add to cart
    await newSalePage.addToCart();

    // Complete sale
    await newSalePage.completeSale();
    await newSalePage.expectSaleCompleted();

    // Verify partial payment was recorded
    // Navigate to cobros to verify remaining debt
    const cobrosPage = new CobrosPage(page);
    await cobrosPage.goto();

    // The customer should appear with remaining debt of 70 (100 - 30)
    await expect(page.getByText("Cliente Test 2")).toBeVisible();
    await expect(page.getByText(/S\/\s*70\.00/)).toBeVisible();
  });

  /**
   * SALE-CRED-003: Crédito con abono total (pago total)
   * Priority: P1
   *
   * Creates a credit sale that is immediately paid in full and verifies:
   * - Sale is created with payment type "pago_total"
   * - No debt is created (balance is zero)
   */
  test("SALE-CRED-003: Crédito con abono total (pago total)", async ({ page }) => {
    const newSalePage = new NewSalePage(page);
    await newSalePage.goto();

    // Select customer
    await newSalePage.selectCustomer("Cliente Test 3");

    // Select "pago_total" payment mode (full payment at time of sale)
    await newSalePage.selectPaymentMode("pago_total");

    // Select product and variant
    await newSalePage.selectProductAndVariant("Pollo E2E", "Entero E2E");

    // Enter total amount
    await newSalePage.enterTotalAmount("50");

    // Add to cart
    await newSalePage.addToCart();

    // Complete sale - should show as fully paid
    await newSalePage.completeSale();
    await newSalePage.expectSaleCompleted();

    // Navigate to cobros - customer should NOT appear in debtors list
    // since the sale was fully paid
    const cobrosPage = new CobrosPage(page);
    await cobrosPage.goto();

    // Check for empty state or that customer doesn't appear as debtor
    const customerDebtorRow = page.locator('[data-testid^="cliente-deuda-row-"]');
    await expect(customerDebtorRow).toHaveCount(0);

    // Or verify the "all clear" message if no debts
    await expect(page.getByText("¡Todas las cuentas al día!")).toBeVisible();
  });

  /**
   * SALE-CRED-004: Validación: crédito sin cliente muestra error
   * Priority: P0
   *
   * Verifies that attempting to create a credit sale without selecting
   * a customer shows appropriate validation error.
   */
  test("SALE-CRED-004: Validación: crédito sin cliente muestra error", async ({ page }) => {
    const newSalePage = new NewSalePage(page);
    await newSalePage.goto();

    // Select "debe_todo" payment mode without selecting a customer
    await newSalePage.selectPaymentMode("debe_todo");

    // Select product and variant
    await newSalePage.selectProductAndVariant("Pollo E2E", "Entero E2E");

    // Enter total amount
    await newSalePage.enterTotalAmount("50");

    // Add to cart
    await newSalePage.addToCart();

    // Try to complete sale
    await newSalePage.completeSale();

    // Should show credit error - customer is required for credit sales
    await newSalePage.expectCreditError();
  });

  /**
   * SALE-CRED-005: Verificar deuda en página de cobros
   * Priority: P1
   *
   * Creates multiple credit sales and verifies:
   * - Debts are correctly aggregated on cobros page
   * - Customer total debt reflects all unpaid sales
   */
  test("SALE-CRED-005: Verificar deuda en página de cobros", async ({ page }) => {
    // Create first credit sale
    const newSalePage1 = new NewSalePage(page);
    await newSalePage1.goto();

    await newSalePage1.selectCustomer("Cliente Test 4");
    await newSalePage1.selectPaymentMode("debe_todo");
    await newSalePage1.selectProductAndVariant("Pollo E2E", "Entero E2E");
    await newSalePage1.enterTotalAmount("80");
    await newSalePage1.addToCart();
    await newSalePage1.completeSale();
    await newSalePage1.expectSaleCompleted();

    // Create second credit sale for same customer
    const newSalePage2 = new NewSalePage(page);
    await newSalePage2.goto();

    await newSalePage2.selectCustomer("Cliente Test 4");
    await newSalePage2.selectPaymentMode("debe_todo");
    await newSalePage2.selectProductAndVariant("Pollo E2E", "Entero E2E");
    await newSalePage2.enterTotalAmount("120");
    await newSalePage2.addToCart();
    await newSalePage2.completeSale();
    await newSalePage2.expectSaleCompleted();

    // Navigate to cobros and verify aggregated debt
    const cobrosPage = new CobrosPage(page);
    await cobrosPage.goto();

    // Customer should appear with total debt of 200 (80 + 120)
    await expect(page.getByText("Cliente Test 4")).toBeVisible();
    await expect(page.getByText(/S\/\s*200\.00/)).toBeVisible();

    // Click on the customer to view debt details
    await page.click('[data-testid^="cliente-deuda-row-"]');

    // Should see individual sales or total
    // The exact implementation depends on UI - checking for visibility
    await expect(page.getByText(/200|80|120/)).toBeVisible();
  });
});
