import { test, expect } from "@playwright/test";
import { LoginPage } from "../page-objects/LoginPage";
import { NewOrderPage } from "../page-objects/NewOrderPage";
import { OrdersListPage } from "../page-objects/OrdersListPage";
import { OrderDetailPage } from "../page-objects/OrderDetailPage";

test.describe("Order to Sale Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login();
    await expect(page).toHaveURL("/dashboard");
  });

  test("TC-ORDER-001: Create order and verify draft status", async ({ page }) => {
    const newOrderPage = new NewOrderPage(page);
    const ordersListPage = new OrdersListPage(page);

    // Create new order
    await newOrderPage.goto();
    await newOrderPage.selectCustomer("Maria Garcia");
    await newOrderPage.selectDeliveryDate("tomorrow");
    await newOrderPage.selectPaymentIntent("contado");
    await newOrderPage.addItem("Huevos", "Unidad", "10");
    await newOrderPage.saveOrder();
    await newOrderPage.expectOrderSaved();

    // Verify order appears in list with draft status
    await ordersListPage.expectOrderVisible("Maria Garcia");
    await ordersListPage.expectOrderStatus("Maria Garcia", "Borrador");
  });

  test("TC-ORDER-002: Confirm order and verify status change", async ({ page }) => {
    const ordersListPage = new OrdersListPage(page);
    const orderDetailPage = new OrderDetailPage(page);

    // Navigate to existing draft order (seeded)
    await ordersListPage.goto();
    await ordersListPage.filterByStatus("Borradores");
    await ordersListPage.clickOrderByCustomer("Maria Garcia");

    // Verify initial status
    await orderDetailPage.expectStatus("Borrador");
    await orderDetailPage.expectConfirmButtonVisible();

    // Confirm order
    await orderDetailPage.confirmOrder();

    // Verify status changed to confirmed
    await orderDetailPage.expectStatus("Confirmado");
    await orderDetailPage.expectConfirmButtonHidden();
  });

  test("TC-ORDER-003: Deliver confirmed order and verify sale creation", async ({ page }) => {
    const ordersListPage = new OrdersListPage(page);
    const orderDetailPage = new OrderDetailPage(page);

    // Navigate to confirmed order with today's date (seeded)
    await ordersListPage.goto();
    await ordersListPage.filterByStatus("Confirmados");
    await ordersListPage.clickOrderByCustomer("Juan Perez");

    // Verify order is ready to deliver
    await orderDetailPage.expectStatus("Confirmado");
    await orderDetailPage.expectDeliverButtonVisible();

    // Deliver order
    await orderDetailPage.deliverOrder();

    // Verify notification and redirect
    await orderDetailPage.expectSaleCreatedNotification();
    await orderDetailPage.clickViewSaleButton();
    await orderDetailPage.expectRedirectToSale();

    // Verify we're on the sale detail page
    await expect(page.getByText("Detalle de venta")).toBeVisible();
  });

  test("TC-ORDER-004: Deliver order with adjusted quantities", async ({ page }) => {
    const newOrderPage = new NewOrderPage(page);
    const orderDetailPage = new OrderDetailPage(page);

    // Create and confirm order
    await newOrderPage.goto();
    await newOrderPage.selectCustomer("Juan Perez");
    await newOrderPage.selectDeliveryDate("today");
    await newOrderPage.selectPaymentIntent("credito");
    await newOrderPage.addItem("Menudencias", "Mollejas", "5");
    await newOrderPage.saveOrder();
    await newOrderPage.expectOrderSaved();

    // Navigate to order detail
    await orderDetailPage.goto(page.url().split("/").pop() || "");

    // Confirm order first
    if (await orderDetailPage.confirmButton.isVisible()) {
      await orderDetailPage.confirmOrder();
    }

    // Deliver with partial quantity
    await orderDetailPage.deliverOrder({
      adjustQuantities: [{ itemId: "", quantity: 3 }], // Deliver only 3 of 5
    });

    // Verify sale was created
    await orderDetailPage.expectSaleCreatedNotification();
  });

  test("TC-ORDER-005: Deliver order with price adjustment", async ({ page }) => {
    const newOrderPage = new NewOrderPage(page);
    const orderDetailPage = new OrderDetailPage(page);

    // Create and confirm order
    await newOrderPage.goto();
    await newOrderPage.selectCustomer("Maria Garcia");
    await newOrderPage.selectDeliveryDate("today");
    await newOrderPage.selectPaymentIntent("contado");
    await newOrderPage.addItem("Huevos", "Maple (30un)", "2");
    await newOrderPage.saveOrder();
    await newOrderPage.expectOrderSaved();

    // Navigate to order detail
    const orderId = page.url().split("/").pop() || "";
    await orderDetailPage.goto(orderId);

    // Confirm order first
    if (await orderDetailPage.confirmButton.isVisible()) {
      await orderDetailPage.confirmOrder();
    }

    // Deliver with adjusted price
    await orderDetailPage.deliverOrder({
      adjustQuantities: [{ itemId: "", quantity: 2, price: 20 }], // Change price from 21 to 20
    });

    // Verify sale was created with new price
    await orderDetailPage.expectSaleCreatedNotification();
    await orderDetailPage.clickViewSaleButton();

    // Verify the sale total reflects the new price
    await expect(page.getByText("S/ 40.00")).toBeVisible();
  });
});
