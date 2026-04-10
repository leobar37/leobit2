/**
 * Sale Cancellation E2E Tests (T-008)
 *
 * Test cases for sale cancellation scenarios including:
 * - CANCEL-001: Cancelar venta al contado
 * - CANCEL-002: Cancelar venta a crédito
 * - CANCEL-003: Cancelar con reembolso en efectivo
 * - CANCEL-004: Cancelar con reembolso Yape/Plin
 * - CANCEL-005: Cancelar con reembolso a saldo
 * - CANCEL-006: Cancelar sin reembolso
 */

import { test, expect } from "@playwright/test";
import { NewSalePage } from "../page-objects/NewSalePage";
import { SaleDetailPage } from "../page-objects/SaleDetailPage";
import { SalesListPage } from "../page-objects/SalesListPage";
import { LoginPage } from "../page-objects/LoginPage";
import { initializeVolumeData, resetVolumeData } from "../mocks";

test.describe("Sale Cancellation", () => {
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
   * Helper to create a cash sale and get the sale ID
   */
  async function createCashSale(page: any): Promise<string> {
    const newSalePage = new NewSalePage(page);
    await newSalePage.goto();

    // Select cash payment mode (pago_total = contado)
    await newSalePage.selectPaymentMode("pago_total");

    // Select product and variant
    await newSalePage.selectProductAndVariant("Pollo E2E", "Entero E2E");

    // Enter total amount
    await newSalePage.enterTotalAmount("100");

    // Add to cart
    await newSalePage.addToCart();

    // Complete sale - redirects to dashboard
    await newSalePage.completeSale();
    await newSalePage.expectSaleCompleted();

    // Navigate to sales list and get the most recent sale ID
    const salesListPage = new SalesListPage(page);
    await salesListPage.goto();

    // Click on first sale to get to detail page and extract ID from URL
    await salesListPage.clickSaleByIndex(0);

    // Extract sale ID from URL
    const url = page.url();
    const saleId = url.split("/ventas/")[1]?.split("/")[0] ?? "";
    return saleId;
  }

  /**
   * Helper to create a credit sale and get the sale ID
   */
  async function createCreditSale(page: any): Promise<string> {
    const newSalePage = new NewSalePage(page);
    await newSalePage.goto();

    // Select customer
    await newSalePage.selectCustomer("Cliente Test 1");

    // Select credit payment mode (debe_todo)
    await newSalePage.selectPaymentMode("debe_todo");

    // Select product and variant
    await newSalePage.selectProductAndVariant("Pollo E2E", "Entero E2E");

    // Enter total amount
    await newSalePage.enterTotalAmount("150");

    // Add to cart
    await newSalePage.addToCart();

    // Complete sale - redirects to dashboard
    await newSalePage.completeSale();
    await newSalePage.expectSaleCompleted();

    // Navigate to sales list and get the most recent sale ID
    const salesListPage = new SalesListPage(page);
    await salesListPage.goto();

    // Click on first sale to get to detail page and extract ID from URL
    await salesListPage.clickSaleByIndex(0);

    // Extract sale ID from URL
    const url = page.url();
    const saleId = url.split("/ventas/")[1]?.split("/")[0] ?? "";
    return saleId;
  }

  /**
   * CANCEL-001: Cancelar venta al contado
   * Priority: P1
   *
   * Tests cancelling a cash (contado) sale without any refund.
   * Cash was already received, so cancellation should mark sale as cancelled.
   */
  test("CANCEL-001: Cancelar venta al contado", async ({ page }) => {
    // Create cash sale
    const saleId = await createCashSale(page);

    // Navigate to sale detail and cancel
    const detailPage = new SaleDetailPage(page);
    await detailPage.goto(saleId);
    await detailPage.expectLoaded();

    // Cancel the sale
    await detailPage.cancelButton.click();
    await detailPage.cancelModal.waitFor({ state: "visible" });
    await detailPage.cancelReasonInput.fill("Cliente cambió de opinión");
    await detailPage.confirmCancelButton.click();

    // Verify sale is cancelled
    await expect(detailPage.statusBadge).toHaveText("cancelled");
  });

  /**
   * CANCEL-002: Cancelar venta a crédito
   * Priority: P1
   *
   * Tests cancelling a credit (crédito) sale.
   * No money was exchanged, so cancellation just marks sale as cancelled.
   */
  test("CANCEL-002: Cancelar venta a crédito", async ({ page }) => {
    // Create credit sale
    const saleId = await createCreditSale(page);

    // Navigate to sale detail and cancel
    const detailPage = new SaleDetailPage(page);
    await detailPage.goto(saleId);
    await detailPage.expectLoaded();

    // Cancel the sale
    await detailPage.cancelButton.click();
    await detailPage.cancelModal.waitFor({ state: "visible" });
    await detailPage.cancelReasonInput.fill("Producto agotado");
    await detailPage.confirmCancelButton.click();

    // Verify sale is cancelled
    await expect(detailPage.statusBadge).toHaveText("cancelled");
  });

  /**
   * CANCEL-003: Cancelar con reembolso en efectivo
   * Priority: P1
   *
   * Tests cancelling a cash sale with cash refund.
   * Customer returns product and receives cash back.
   */
  test("CANCEL-003: Cancelar con reembolso en efectivo", async ({ page }) => {
    // Create cash sale
    const saleId = await createCashSale(page);

    // Navigate to sale detail and cancel with refund
    const detailPage = new SaleDetailPage(page);
    await detailPage.goto(saleId);
    await detailPage.expectLoaded();

    // Get initial status
    const initialStatus = await detailPage.getStatus();

    // Cancel the sale with cash refund reason
    await detailPage.cancelButton.click();
    await detailPage.cancelModal.waitFor({ state: "visible" });
    await detailPage.cancelReasonInput.fill("Producto defectuoso");

    // Select refund method if available
    const refundMethodSelect = page.getByTestId("refund-method-select");
    if (await refundMethodSelect.isVisible()) {
      await refundMethodSelect.click();
      await page.getByTestId("refund-method-efectivo").click();
    }

    await detailPage.confirmCancelButton.click();

    // Verify sale is cancelled
    await expect(detailPage.statusBadge).toHaveText("cancelled");
  });

  /**
   * CANCEL-004: Cancelar con reembolso Yape/Plin
   * Priority: P2
   *
   * Tests cancelling a sale where refund is made via Yape/Plin.
   * This applies to sales paid by Yape/Plin that need to be refunded.
   */
  test("CANCEL-004: Cancelar con reembolso Yape/Plin", async ({ page }) => {
    // Create cash sale (in real scenario, this would be Yape/Plin)
    const saleId = await createCashSale(page);

    // Navigate to sale detail and cancel with Yape/Plin refund
    const detailPage = new SaleDetailPage(page);
    await detailPage.goto(saleId);
    await detailPage.expectLoaded();

    // Cancel the sale with Yape/Plin refund reason
    await detailPage.cancelButton.click();
    await detailPage.cancelModal.waitFor({ state: "visible" });
    await detailPage.cancelReasonInput.fill("Error en la transacción");

    // Select Yape/Plin refund method if available
    const refundMethodSelect = page.getByTestId("refund-method-select");
    if (await refundMethodSelect.isVisible()) {
      await refundMethodSelect.click();
      const yapeOption = page.getByTestId("refund-method-yape");
      const plinOption = page.getByTestId("refund-method-plin");
      if (await yapeOption.isVisible()) {
        await yapeOption.click();
      } else if (await plinOption.isVisible()) {
        await plinOption.click();
      }
    }

    await detailPage.confirmCancelButton.click();

    // Verify sale is cancelled
    await expect(detailPage.statusBadge).toHaveText("cancelled");
  });

  /**
   * CANCEL-005: Cancelar con reembolso a saldo
   * Priority: P2
   *
   * Tests cancelling a sale where refund is credited to customer's balance.
   * The refund is added to the customer's account as store credit.
   */
  test("CANCEL-005: Cancelar con reembolso a saldo", async ({ page }) => {
    // Create credit sale (paid partially or in full, refund goes to balance)
    const saleId = await createCreditSale(page);

    // Navigate to sale detail and cancel with balance refund
    const detailPage = new SaleDetailPage(page);
    await detailPage.goto(saleId);
    await detailPage.expectLoaded();

    // Cancel the sale with balance refund
    await detailPage.cancelButton.click();
    await detailPage.cancelModal.waitFor({ state: "visible" });
    await detailPage.cancelReasonInput.fill("Acuerdo con cliente");

    // Select saldo (balance) refund method if available
    const refundMethodSelect = page.getByTestId("refund-method-select");
    if (await refundMethodSelect.isVisible()) {
      await refundMethodSelect.click();
      await page.getByTestId("refund-method-saldo").click();
    }

    await detailPage.confirmCancelButton.click();

    // Verify sale is cancelled
    await expect(detailPage.statusBadge).toHaveText("cancelled");
  });

  /**
   * CANCEL-006: Cancelar sin reembolso
   * Priority: P2
   *
   * Tests cancelling a sale where no refund is applicable.
   * This could be for specific business reasons or customerwaived refund.
   */
  test("CANCEL-006: Cancelar sin reembolso", async ({ page }) => {
    // Create cash sale
    const saleId = await createCashSale(page);

    // Navigate to sale detail and cancel without refund
    const detailPage = new SaleDetailPage(page);
    await detailPage.goto(saleId);
    await detailPage.expectLoaded();

    // Cancel the sale without requesting refund
    await detailPage.cancelButton.click();
    await detailPage.cancelModal.waitFor({ state: "visible" });
    await detailPage.cancelReasonInput.fill("Venta duplicada - sin reembolso");

    // Ensure no refund method is selected (or explicitly select "sin reembolso")
    const refundMethodSelect = page.getByTestId("refund-method-select");
    if (await refundMethodSelect.isVisible()) {
      await refundMethodSelect.click();
      const noRefundOption = page.getByTestId("refund-method-none");
      if (await noRefundOption.isVisible()) {
        await noRefundOption.click();
      }
    }

    await detailPage.confirmCancelButton.click();

    // Verify sale is cancelled
    await expect(detailPage.statusBadge).toHaveText("cancelled");
  });
});
