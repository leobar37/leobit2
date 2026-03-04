import { test, expect } from "@playwright/test";
import { NewProductPage } from "../page-objects/NewProductPage";
import { ProductDetailPage } from "../page-objects/ProductDetailPage";

test.describe("Product Management", () => {
  let productId: string;

  test("create product - happy path", async ({ page }) => {
    const newProductPage = new NewProductPage(page);
    await newProductPage.goto();

    await newProductPage.fillForm({
      name: "Pollo E2E",
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
    await expect(page.getByText("Pollo E2E")).toBeVisible();
  });

  test("create product - validation errors", async ({ page }) => {
    const newProductPage = new NewProductPage(page);
    await newProductPage.goto();

    // Try to save with empty name
    await newProductPage.nameInput.fill("");
    await newProductPage.saveButton.click();
    await newProductPage.expectValidationError("name");

    // Fill name but clear price
    await newProductPage.nameInput.fill("Test Product");
    await newProductPage.basePriceInput.fill("");
    await newProductPage.saveButton.click();
    await newProductPage.expectValidationError("basePrice");
  });

  test("create variant - happy path", async ({ page }) => {
    // First create product if not done
    const newProductPage = new NewProductPage(page);
    await newProductPage.goto();
    await newProductPage.fillForm({
      name: "Pollo E2E Variant Test",
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
    // Navigate to existing product
    await page.goto("/productos");
    await page.click("text=Pollo E2E");

    const productDetailPage = new ProductDetailPage(page);

    // Try to save with empty name
    await page.getByRole("button", { name: /agregar variante/i }).click();
    await productDetailPage.variantNameInput.fill("");
    await productDetailPage.saveVariantButton.click();
    await productDetailPage.expectValidationError("name");
  });
});
