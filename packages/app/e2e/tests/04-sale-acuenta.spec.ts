// @ts-nocheck - E2E test file
import { test, expect } from "@playwright/test";
import { NewSalePage } from "../page-objects/NewSalePage";

test.describe("Sale - Partial Payment (A Cuenta)", () => {
  test("create sale with partial payment and verify partial debt", async ({ page }) => {
    const newSalePage = new NewSalePage(page);
    await newSalePage.goto();

    // Select customer Juan Perez (index 1 in seed)
    await newSalePage.selectCustomer("Juan Perez");

    // Select "a cuenta" mode
    await newSalePage.selectPaymentMode("a_cuenta");

    // Select product
    await newSalePage.selectProductAndVariant("Pollo E2E", "Entero E2E");

    // Enter total and partial amount
    await newSalePage.enterTotalAmount("100");
    // The partial amount input should appear
    await page.fill('input[placeholder="Monto a cuenta"]', "30");

    // Add to cart
    await newSalePage.addToCart();

    // Complete sale
    await newSalePage.completeSale();
    await newSalePage.expectSaleCompleted();

    // Verify debt in cobros
    await page.goto("/cobros");
    await expect(page.getByText("Juan Perez")).toBeVisible();
    await expect(page.getByText(/S\/\s*70\.00/)).toBeVisible();
  });

  test("partial amount cannot exceed total validation", async ({ page }) => {
    const newSalePage = new NewSalePage(page);
    await newSalePage.goto();

    await newSalePage.selectCustomer("Juan Perez");
    await newSalePage.selectPaymentMode("a_cuenta");
    await newSalePage.selectProductAndVariant("Pollo E2E", "Entero E2E");
    await newSalePage.enterTotalAmount("100");

    // Try to enter amount greater than total
    await page.fill('input[placeholder="Monto a cuenta"]', "150");
    await newSalePage.addToCart();
    await newSalePage.completeSale();

    await newSalePage.expectPartialAmountError();
  });
});
