import { test, expect } from "@playwright/test";
import { NewProductPage } from "../page-objects/NewProductPage";
import { ProductDetailPage } from "../page-objects/ProductDetailPage";
import { LoginPage } from "../page-objects/LoginPage";

// Generate unique product name using timestamp
const timestamp = Date.now();
const PRODUCT_NAME = `Pollo E2E ${timestamp}`;
const PRODUCT_NAME_VARIANT = `Pollo E2E Variant ${timestamp}`;

test.describe("Product Management", () => {
  let productId: string;

  test("login and create product - happy path", async ({ page }) => {
    // Login first (like a real user)
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login();

    // Then create product
    const newProductPage = new NewProductPage(page);
    await newProductPage.goto();

    await newProductPage.fillForm({
      name: PRODUCT_NAME,
      type: "pollo",
      unit: "kg",
      basePrice: "20.00",
    });

    await newProductPage.save();
    await newProductPage.expectSaved();

    // Extract product ID from URL for variant test
    const url = page.url();
    const match = url.match(/\/productos\/(.+)$/);
    if (match) {
      productId = match[1];
    }

    // Verify product appears in list
    await expect(page.getByText(PRODUCT_NAME)).toBeVisible();
  });

  test("create product - validation errors", async ({ page }) => {
    const newProductPage = new NewProductPage(page);
    await newProductPage.goto();

    // Clear the form and verify save button is disabled
    await newProductPage.nameInput.fill("");
    await newProductPage.basePriceInput.fill("");
    
    // Verify save button is disabled when form is invalid
    await expect(newProductPage.saveButton).toBeDisabled();

    // Fill name but keep price empty - button should still be disabled
    await newProductPage.nameInput.fill("Test Product");
    await expect(newProductPage.saveButton).toBeDisabled();

    // Fill price - now button should be enabled
    await newProductPage.basePriceInput.fill("20.00");
    await expect(newProductPage.saveButton).toBeEnabled();
  });

  test("create variant - happy path", async ({ page }) => {
    // First create product if not done
    const newProductPage = new NewProductPage(page);
    await newProductPage.goto();
    await newProductPage.fillForm({
      name: PRODUCT_NAME_VARIANT,
      type: "pollo",
      unit: "kg",
      basePrice: "20.00",
    });
    await newProductPage.save();
    await newProductPage.expectSaved();

    // Get product ID and navigate to detail
    const url = page.url();
    const match = url.match(/\/productos\/(.+)$/);
    const pid = match ? match[1] : "";

    const productDetailPage = new ProductDetailPage(page);
    await productDetailPage.goto(pid);

    await productDetailPage.addVariant({
      name: "Entero E2E",
      sku: "E2E-ENT",
      unitQuantity: "2.5",
      price: "50.00",
    });

    await productDetailPage.expectVariantSaved("Entero E2E");
  });

  test("create variant - validation errors", async ({ page }) => {
    // Navigate to the product created in the first test
    await page.goto("/productos");
    await page.click(`text=${PRODUCT_NAME}`);

    const productDetailPage = new ProductDetailPage(page);

    // Try to save with empty name
    await productDetailPage.addVariantButton.click();
    await productDetailPage.variantNameInput.fill("");
    await productDetailPage.saveVariantButton.click();
    await productDetailPage.expectValidationError("name");
  });
});
