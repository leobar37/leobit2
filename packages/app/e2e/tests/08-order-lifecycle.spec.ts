import { test, expect } from "@playwright/test";
import { LoginPage } from "../page-objects/LoginPage";
import { NewOrderPage } from "../page-objects/NewOrderPage";
import { OrdersListPage } from "../page-objects/OrdersListPage";
import { OrderDetailPage } from "../page-objects/OrderDetailPage";

test.describe("Order Lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login();
    await expect(page).toHaveURL("/dashboard");
  });

  test("TC-ORDER-006: Cancel draft order", async ({ page }) => {
    const newOrderPage = new NewOrderPage(page);
    const ordersListPage = new OrdersListPage(page);
    const orderDetailPage = new OrderDetailPage(page);

    // Create new order
    await newOrderPage.goto();
    await newOrderPage.selectCustomer("Juan Perez");
    await newOrderPage.selectDeliveryDate("tomorrow");
    await newOrderPage.selectPaymentIntent("credito");
    await newOrderPage.addItem("Menudencias", "Patitas", "3");
    await newOrderPage.saveOrder();
    await newOrderPage.expectOrderSaved();

    // Navigate to order detail
    await ordersListPage.clickOrderByCustomer("Juan Perez");

    // Verify cancel button is visible
    await orderDetailPage.expectCancelButtonVisible();

    // Cancel order
    await orderDetailPage.cancelOrder();

    // Verify status changed to cancelled
    await orderDetailPage.expectStatus("Cancelado");

    // Verify action buttons are hidden
    await orderDetailPage.expectConfirmButtonHidden();
    await orderDetailPage.expectDeliverButtonHidden();
    await orderDetailPage.expectCancelButtonHidden();
  });

  test("TC-ORDER-007: Cannot deliver order before confirmation", async ({ page }) => {
    const newOrderPage = new NewOrderPage(page);
    const orderDetailPage = new OrderDetailPage(page);

    // Create new order with today's date
    await newOrderPage.goto();
    await newOrderPage.selectCustomer("Maria Garcia");
    await newOrderPage.selectDeliveryDate("today");
    await newOrderPage.selectPaymentIntent("contado");
    await newOrderPage.addItem("Huevos", "Unidad", "20");
    await newOrderPage.saveOrder();
    await newOrderPage.expectOrderSaved();

    // Navigate to order detail
    const orderId = page.url().split("/").pop() || "";
    await orderDetailPage.goto(orderId);

    // Verify order is in draft status
    await orderDetailPage.expectStatus("Borrador");

    // Verify deliver button is NOT visible (only confirm should be visible)
    await orderDetailPage.expectDeliverButtonHidden();
    await orderDetailPage.expectConfirmButtonVisible();
  });

  test("TC-ORDER-008: Cannot deliver order with future delivery date", async ({ page }) => {
    const ordersListPage = new OrdersListPage(page);
    const orderDetailPage = new OrderDetailPage(page);

    // Navigate to confirmed order with future date (seeded)
    await ordersListPage.goto();
    await ordersListPage.filterByStatus("Confirmados");
    
    // Look for order with future date (Maria Garcia's second order)
    const orderCards = await page.getByTestId("order-card").all();
    let futureOrderFound = false;
    
    for (const card of orderCards) {
      const customerName = await card.getByTestId("order-card-customer").textContent();
      if (customerName?.includes("Maria Garcia")) {
        // Check if it has "Listo para entregar" badge (should NOT have it)
        const readyBadge = card.locator('[data-testid="order-card-ready-badge"]');
        const hasReadyBadge = await readyBadge.isVisible().catch(() => false);
        
        if (!hasReadyBadge) {
          await card.click();
          futureOrderFound = true;
          break;
        }
      }
    }

    if (!futureOrderFound) {
      // Skip test if no future order found
      console.log("No future-dated order found in seed data - skipping test");
      return;
    }

    // Verify order is confirmed
    await orderDetailPage.expectStatus("Confirmado");

    // Verify deliver button is NOT visible (because delivery date is in the future)
    await orderDetailPage.expectDeliverButtonHidden();
  });

  test("TC-ORDER-009: Cannot cancel delivered order", async ({ page }) => {
    const newOrderPage = new NewOrderPage(page);
    const orderDetailPage = new OrderDetailPage(page);

    // Create, confirm and deliver order
    await newOrderPage.goto();
    await newOrderPage.selectCustomer("Juan Perez");
    await newOrderPage.selectDeliveryDate("today");
    await newOrderPage.selectPaymentIntent("contado");
    await newOrderPage.addItem("Menudencias", "Alas", "2");
    await newOrderPage.saveOrder();
    await newOrderPage.expectOrderSaved();

    // Navigate to order detail
    const orderId = page.url().split("/").pop() || "";
    await orderDetailPage.goto(orderId);

    // Confirm order
    await orderDetailPage.confirmOrder();

    // Deliver order
    await orderDetailPage.deliverOrder();
    await orderDetailPage.expectSaleCreatedNotification();

    // Navigate back to order detail
    await orderDetailPage.goto(orderId);

    // Verify status is delivered
    await orderDetailPage.expectStatus("Entregado");

    // Verify cancel button is NOT visible
    await orderDetailPage.expectCancelButtonHidden();
  });

  test("TC-ORDER-010: Partial delivery of order items", async ({ page }) => {
    const newOrderPage = new NewOrderPage(page);
    const orderDetailPage = new OrderDetailPage(page);

    // Create order with multiple items
    await newOrderPage.goto();
    await newOrderPage.selectCustomer("Maria Garcia");
    await newOrderPage.selectDeliveryDate("today");
    await newOrderPage.selectPaymentIntent("credito");
    
    // Add first item
    await newOrderPage.addItem("Huevos", "Unidad", "10");
    
    // Add second item
    await newOrderPage.addItem("Menudencias", "Mollejas", "3");
    
    await newOrderPage.saveOrder();
    await newOrderPage.expectOrderSaved();

    // Navigate to order detail
    const orderId = page.url().split("/").pop() || "";
    await orderDetailPage.goto(orderId);

    // Confirm order
    await orderDetailPage.confirmOrder();

    // Deliver with partial quantities - deliver only first item
    await orderDetailPage.deliverOrder({
      adjustQuantities: [
        { itemId: "", quantity: 10 }, // Full delivery of first item
        { itemId: "", quantity: 0 },  // No delivery of second item
      ],
    });

    // Verify sale was created
    await orderDetailPage.expectSaleCreatedNotification();
    await orderDetailPage.clickViewSaleButton();

    // Verify sale only contains the delivered item
    await expect(page.getByText("Huevos")).toBeVisible();
    await expect(page.getByText("Menudencias")).not.toBeVisible();
  });

  test("TC-ORDER-011: Order validation - requires customer", async ({ page }) => {
    const newOrderPage = new NewOrderPage(page);

    await newOrderPage.goto();
    // Don't select customer
    await newOrderPage.selectDeliveryDate("tomorrow");
    await newOrderPage.selectPaymentIntent("contado");

    // Save button should be disabled
    await expect(newOrderPage.saveOrderButton).toBeDisabled();
  });

  test("TC-ORDER-012: Order validation - requires items", async ({ page }) => {
    const newOrderPage = new NewOrderPage(page);

    await newOrderPage.goto();
    await newOrderPage.selectCustomer("Maria Garcia");
    await newOrderPage.selectDeliveryDate("tomorrow");
    await newOrderPage.selectPaymentIntent("contado");
    // Don't add items

    // Save button should be disabled
    await expect(newOrderPage.saveOrderButton).toBeDisabled();
  });
});
