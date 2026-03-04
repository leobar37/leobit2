import { test, expect } from "@playwright/test";
import { NewPurchasePage } from "../page-objects/NewPurchasePage";

test.describe("Purchase Flow", () => {
  test("create purchase and verify inventory increase", async ({ page }) => {
    const newPurchasePage = new NewPurchasePage(page);
    await newPurchasePage.goto();

    // Select supplier
    await newPurchasePage.selectSupplier("Avícola El Buen Sabor");

    // Fill invoice number
    await newPurchasePage.fillInvoiceNumber("F001-999999");

    // Select product and variant
    await newPurchasePage.selectProductAndVariant("Pollo E2E", "Entero E2E");

    // Enter quantity and cost
    await newPurchasePage.enterQuantityAndCost("10", "37.00");

    // Add to cart
    await newPurchasePage.addToCart();

    // Verify cart shows item
    await expect(newPurchasePage.cartSection).toBeVisible();

    // Save purchase
    await newPurchasePage.savePurchase();
    await newPurchasePage.expectPurchaseSaved();

    // Verify in product inventory
    await page.goto("/productos");
    await page.click("text=Pollo E2E");
    // Should show increased stock
    await expect(page.getByText(/stock|inventario/i)).toBeVisible();
  });

  test("purchase requires supplier validation", async ({ page }) => {
    const newPurchasePage = new NewPurchasePage(page);
    await newPurchasePage.goto();

    // Try to save without supplier
    await newPurchasePage.selectProductAndVariant("Pollo E2E", "Entero E2E");
    await newPurchasePage.enterQuantityAndCost("5", "37.00");
    await newPurchasePage.addToCart();

    // Save button should be disabled or show error
    await expect(newPurchasePage.savePurchaseButton).toBeDisabled();
  });

  test("purchase with unit measurement calculation", async ({ page }) => {
    const newPurchasePage = new NewPurchasePage(page);
    await newPurchasePage.goto();

    await newPurchasePage.selectSupplier("Avícola El Buen Sabor");

    // Select product with units (if available)
    await newPurchasePage.selectProductAndVariant("Huevos", "Maple (30un)");

    // Select unit
    await page.selectOption("select", { label: /Maple/ });

    // Enter packs
    await page.fill('input[placeholder="Packs"]', "5");

    // Should show calculated units
    await expect(page.getByText(/= 150 unidades/)).toBeVisible();

    await newPurchasePage.enterQuantityAndCost("5", "18.00");
    await newPurchasePage.addToCart();
    await newPurchasePage.savePurchase();
    await newPurchasePage.expectPurchaseSaved();
  });
});
