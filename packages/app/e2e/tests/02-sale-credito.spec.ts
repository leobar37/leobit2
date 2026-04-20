// @ts-nocheck - E2E test file
import { test, expect } from "@playwright/test";
import { NewSalePage } from "../page-objects/NewSalePage";

test.describe("Sale - Credit Flow", () => {
  test("create sale with credit and verify debt", async ({ page }) => {
    const newSalePage = new NewSalePage(page);
    await newSalePage.goto();

    // Select customer Maria Garcia (index 0 in seed)
    await newSalePage.selectCustomer("Maria Garcia");

    // Select credit mode
    await newSalePage.selectPaymentMode("credito");

    // Select product and variant (Pollo E2E -> Entero E2E)
    await newSalePage.selectProductAndVariant("Pollo E2E", "Entero E2E");

    // Enter total amount
    await newSalePage.enterTotalAmount("100");

    // Add to cart
    await newSalePage.addToCart();

    // Complete sale
    await newSalePage.completeSale();
    await newSalePage.expectSaleCompleted();

    // Navigate to cobros and verify debt
    await page.goto("/cobros");
    await expect(page.getByText("Maria Garcia")).toBeVisible();
    await expect(page.getByText("S/ 100.00")).toBeVisible();
  });

  test("credit sale requires customer validation", async ({ page }) => {
    const newSalePage = new NewSalePage(page);
    await newSalePage.goto();

    // Select credit mode without customer
    await newSalePage.selectPaymentMode("credito");

    // Try to add product
    await newSalePage.selectProductAndVariant("Pollo E2E", "Entero E2E");
    await newSalePage.enterTotalAmount("50");
    await newSalePage.addToCart();

    // Try to complete sale
    await newSalePage.completeSale();
    await newSalePage.expectCreditError();
  });
});
