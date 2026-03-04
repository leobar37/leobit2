import { test, expect } from "@playwright/test";
import { NewOrderPage } from "../page-objects/NewOrderPage";

test.describe("Order Flow", () => {
  test("create order with cash payment intent", async ({ page }) => {
    const newOrderPage = new NewOrderPage(page);
    await newOrderPage.goto();

    // Select customer
    await newOrderPage.selectCustomer("Maria Garcia");

    // Select delivery date (tomorrow)
    await newOrderPage.selectDeliveryDate("tomorrow");

    // Select payment intent
    await newOrderPage.selectPaymentIntent("contado");

    // Add item
    await newOrderPage.addItem("Pollo E2E", "Entero E2E", "5");

    // Verify total calculation (5 * 50 = 250)
    await expect(page.getByText("S/ 250.00")).toBeVisible();

    // Save order
    await newOrderPage.saveOrder();
    await newOrderPage.expectOrderSaved();

    // Verify order appears in list
    await expect(page.getByText("Maria Garcia")).toBeVisible();
    await expect(page.getByText(/pendiente/i)).toBeVisible();
  });

  test("create order with credit payment intent", async ({ page }) => {
    const newOrderPage = new NewOrderPage(page);
    await newOrderPage.goto();

    await newOrderPage.selectCustomer("Juan Perez");
    await newOrderPage.selectDeliveryDate("tomorrow");
    await newOrderPage.selectPaymentIntent("credito");
    await newOrderPage.addItem("Pollo E2E", "Entero E2E", "3");

    await newOrderPage.saveOrder();
    await newOrderPage.expectOrderSaved();

    // Verify credit indicator
    await expect(page.getByText("Juan Perez")).toBeVisible();
  });

  test("order requires customer validation", async ({ page }) => {
    const newOrderPage = new NewOrderPage(page);
    await newOrderPage.goto();

    // Try to save without customer
    await newOrderPage.selectDeliveryDate("tomorrow");
    await newOrderPage.selectPaymentIntent("contado");

    // Save button should be disabled
    await expect(newOrderPage.saveOrderButton).toBeDisabled();
  });

  test("order requires items validation", async ({ page }) => {
    const newOrderPage = new NewOrderPage(page);
    await newOrderPage.goto();

    await newOrderPage.selectCustomer("Maria Garcia");
    await newOrderPage.selectDeliveryDate("tomorrow");
    await newOrderPage.selectPaymentIntent("contado");

    // Try to save without items
    await expect(newOrderPage.saveOrderButton).toBeDisabled();
  });
});
