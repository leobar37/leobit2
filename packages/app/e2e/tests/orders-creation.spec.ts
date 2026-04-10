import { test, expect } from "@playwright/test";
import { NewOrderPage } from "../page-objects/NewOrderPage";
import { OrdersListPage } from "../page-objects/OrdersListPage";
import { OrderDetailPage } from "../page-objects/OrderDetailPage";
import { LoginPage } from "../page-objects/LoginPage";
import { initializeVolumeData, resetVolumeData } from "../mocks";
import { today, addDays } from "../utils";

test.describe("Order Creation", () => {
  test.beforeEach(async ({ page }) => {
    initializeVolumeData();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login();
  });

  test.afterEach(() => {
    resetVolumeData();
  });

  test("ORDER-CREATE-001: Crear pedido a crédito sin fecha (error)", async ({ page }) => {
    const newOrderPage = new NewOrderPage(page);
    await newOrderPage.goto();

    // Select customer
    await newOrderPage.selectCustomer("Maria Garcia");

    // Select credit payment (no date selection)
    await newOrderPage.selectPaymentIntent("credito");

    // Add item
    await newOrderPage.addItem("Pollo E2E", "Entero E2E", "5");

    // Try to save - should show error about date required for credit orders
    await newOrderPage.saveOrder();

    // Expect validation error for missing delivery date
    await newOrderPage.expectDeliveryDateRequiredError();
  });

  test("ORDER-CREATE-002: Crear pedido con fecha futura", async ({ page }) => {
    const newOrderPage = new NewOrderPage(page);
    const ordersListPage = new OrdersListPage(page);

    await newOrderPage.goto();

    // Select customer
    await newOrderPage.selectCustomer("Juan Perez");

    // Set future delivery date
    await newOrderPage.setDeliveryDate(addDays(7));

    // Add item
    await newOrderPage.addItem("Pollo E2E", "Entero E2E", "5");

    // Complete order
    await newOrderPage.completeOrder();

    // Verify redirected to orders list
    await newOrderPage.expectOrderSaved();

    // Verify order appears in list
    await expect(ordersListPage.ordersList.first()).toBeVisible();
    await ordersListPage.expectOrderVisible("Juan Perez");
  });

  test("ORDER-CREATE-003: Crear pedido con fecha hoy", async ({ page }) => {
    const newOrderPage = new NewOrderPage(page);
    const ordersListPage = new OrdersListPage(page);

    await newOrderPage.goto();

    // Select customer
    await newOrderPage.selectCustomer("Maria Garcia");

    // Set delivery date to today
    await newOrderPage.setDeliveryDate(today());

    // Add item
    await newOrderPage.addItem("Huevos E2E", "Unidad E2E", "10");

    // Complete order
    await newOrderPage.completeOrder();

    // Verify redirected to orders list
    await newOrderPage.expectOrderSaved();

    // Verify order appears in list
    await ordersListPage.expectOrderVisible("Maria Garcia");
  });

  test("ORDER-CREATE-004: Crear pedido al contado", async ({ page }) => {
    const newOrderPage = new NewOrderPage(page);
    const ordersListPage = new OrdersListPage(page);

    await newOrderPage.goto();

    // Select customer
    await newOrderPage.selectCustomer("Carlos Lopez");

    // Set delivery date
    await newOrderPage.setDeliveryDate(addDays(3));

    // Select contado payment
    await newOrderPage.selectPaymentIntent("contado");

    // Add item
    await newOrderPage.addItem("Pollo E2E", "Entero E2E", "3");

    // Complete order
    await newOrderPage.completeOrder();

    // Verify redirected to orders list
    await newOrderPage.expectOrderSaved();

    // Verify order appears in list with correcto status
    await ordersListPage.expectOrderVisible("Carlos Lopez");
    await ordersListPage.expectOrderStatus("Carlos Lopez", "Borrador");
  });

  test("ORDER-CREATE-005: Crear pedido con múltiples productos", async ({ page }) => {
    const newOrderPage = new NewOrderPage(page);
    const ordersListPage = new OrdersListPage(page);

    await newOrderPage.goto();

    // Select customer
    await newOrderPage.selectCustomer("Ana Martinez");

    // Set delivery date
    await newOrderPage.setDeliveryDate(addDays(5));

    // Add first product
    await newOrderPage.addItem("Pollo E2E", "Entero E2E", "5");

    // Add second product
    await newOrderPage.addItem("Huevos E2E", "Unidad E2E", "20");

    // Add third product
    await newOrderPage.addItem("Menudencias E2E", "Patitas E2E", "3");

    // Verify total calculation
    await expect(page.getByText(/S\/ \d+\.\d{2}/)).toBeVisible();

    // Complete order
    await newOrderPage.completeOrder();

    // Verify redirected to orders list
    await newOrderPage.expectOrderSaved();

    // Verify order appears in list
    await ordersListPage.expectOrderVisible("Ana Martinez");
  });

  test("ORDER-CREATE-006: Crear pedido con precios cotizados", async ({ page }) => {
    const newOrderPage = new NewOrderPage(page);
    const ordersListPage = new OrdersListPage(page);

    await newOrderPage.goto();

    // Select customer
    await newOrderPage.selectCustomer("Rosa Torres");

    // Set delivery date
    await newOrderPage.setDeliveryDate(addDays(10));

    // Select credit payment (allows quoted prices)
    await newOrderPage.selectPaymentIntent("credito");

    // Add item with quoted price
    await newOrderPage.addItem("Pollo E2E", "Entero E2E", "10");

    // Set a custom quoted price
    await newOrderPage.setQuotedPrice("25.00");

    // Complete order
    await newOrderPage.completeOrder();

    // Verify redirected to orders list
    await newOrderPage.expectOrderSaved();

    // Verify order appears in list
    await ordersListPage.expectOrderVisible("Rosa Torres");

    // Navigate to order detail to verify quoted price was saved
    await ordersListPage.clickOrderByCustomer("Rosa Torres");
    const orderDetailPage = new OrderDetailPage(page);
    await orderDetailPage.expectQuotedPriceVisible("25.00");
  });

  test("ORDER-CREATE-007: Crear pedido con fecha de orden específica", async ({ page }) => {
    const newOrderPage = new NewOrderPage(page);
    const ordersListPage = new OrdersListPage(page);

    await newOrderPage.goto();

    // Select customer
    await newOrderPage.selectCustomer("Luis Rodriguez");

    // Set specific order date (different from delivery date)
    await newOrderPage.setOrderDate(addDays(-1)); // Order placed yesterday

    // Set delivery date
    await newOrderPage.setDeliveryDate(addDays(7));

    // Add item
    await newOrderPage.addItem("Pollo E2E", "Entero E2E", "4");

    // Complete order
    await newOrderPage.completeOrder();

    // Verify redirected to orders list
    await newOrderPage.expectOrderSaved();

    // Verify order appears in list
    await ordersListPage.expectOrderVisible("Luis Rodriguez");

    // Navigate to order detail to verify order date
    await ordersListPage.clickOrderByCustomer("Luis Rodriguez");
    const orderDetailPage = new OrderDetailPage(page);
    await orderDetailPage.expectOrderDateVisible(addDays(-1));
  });

  test("ORDER-CREATE-008: Crear pedido con comprobante de adelanto", async ({ page }) => {
    const newOrderPage = new NewOrderPage(page);
    const ordersListPage = new OrdersListPage(page);

    await newOrderPage.goto();

    // Select customer
    await newOrderPage.selectCustomer("Pedro Sanchez");

    // Set delivery date
    await newOrderPage.setDeliveryDate(addDays(14));

    // Select credit payment
    await newOrderPage.selectPaymentIntent("credito");

    // Add item
    await newOrderPage.addItem("Pollo E2E", "Entero E2E", "10");

    // Set advance payment amount
    await newOrderPage.setAdvancePayment("50.00");

    // Complete order
    await newOrderPage.completeOrder();

    // Verify redirected to orders list
    await newOrderPage.expectOrderSaved();

    // Verify order appears in list
    await ordersListPage.expectOrderVisible("Pedro Sanchez");

    // Navigate to order detail to verify advance payment
    await ordersListPage.clickOrderByCustomer("Pedro Sanchez");
    const orderDetailPage = new OrderDetailPage(page);
    await orderDetailPage.expectAdvancePaymentVisible("50.00");
  });
});

test.describe("Order Validations", () => {
  test.beforeEach(async ({ page }) => {
    initializeVolumeData();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login();
  });

  test.afterEach(() => {
    resetVolumeData();
  });

  test("ORDER-VAL-001: Error: fecha pasada no permitida", async ({ page }) => {
    const newOrderPage = new NewOrderPage(page);

    await newOrderPage.goto();

    // Select customer
    await newOrderPage.selectCustomer("Elena Vargas");

    // Try to set past delivery date
    await newOrderPage.setDeliveryDate(addDays(-5));

    // Try to complete order
    await newOrderPage.completeOrder();

    // Expect validation error for past date
    await newOrderPage.expectPastDateError();
  });

  test("ORDER-VAL-002: Error: fecha inválida", async ({ page }) => {
    const newOrderPage = new NewOrderPage(page);

    await newOrderPage.goto();

    // Select customer
    await newOrderPage.selectCustomer("Fernando Diaz");

    // Try to set invalid date (empty or malformed)
    await newOrderPage.setDeliveryDate("");

    // Try to complete order
    await newOrderPage.completeOrder();

    // Expect validation error for invalid date
    await newOrderPage.expectInvalidDateError();
  });

  test("ORDER-VAL-003: Error: cliente requerido", async ({ page }) => {
    const newOrderPage = new NewOrderPage(page);

    await newOrderPage.goto();

    // Set delivery date but don't select customer
    await newOrderPage.setDeliveryDate(addDays(3));

    // Add item
    await newOrderPage.addItem("Pollo E2E", "Entero E2E", "2");

    // Try to complete order - save button should be disabled
    await expect(newOrderPage.saveOrderButton).toBeDisabled();
  });
});
