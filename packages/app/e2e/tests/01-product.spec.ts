import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { NewProductPage } from "../page-objects/NewProductPage";
import { ProductDetailPage } from "../page-objects/ProductDetailPage";
import { LoginPage } from "../page-objects/LoginPage";

function uniqueName(prefix: string) {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

async function getAuthHeaders(page: Page) {
  return page.evaluate(() => ({
    token: localStorage.getItem("bearer_token"),
    businessId: localStorage.getItem("current_business_id"),
  }));
}

async function apiRequest<T>(
  request: APIRequestContext,
  page: Page,
  path: string,
  body: unknown,
) {
  const { token, businessId } = await getAuthHeaders(page);
  const apiOrigins = [
    "http://127.0.0.1:5201",
    "http://127.0.0.1:3000",
    "http://localhost:5201",
    "http://localhost:3000",
  ];
  let lastError = "Request failed";

  for (const apiOrigin of apiOrigins) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      if (businessId) {
        headers["x-business-id"] = businessId;
      }

      const response = await request.post(`${apiOrigin}${path}`, {
        data: body,
        headers,
        failOnStatusCode: false,
      });

      const json = await response.json().catch(() => null);
      if (response.ok() && json?.success) {
        return json.data as T;
      }

      lastError = JSON.stringify(json ?? { status: response.status(), apiOrigin });
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  throw new Error(lastError);
}

async function createCategory(
  request: APIRequestContext,
  page: Page,
  name: string,
  color = "#f97316",
) {
  return apiRequest<{ id: string; name: string; color: string }>(request, page, "/product-categories", {
    name,
    color,
  });
}

test.describe("Product Management", () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login();
  });

  test("creates a product with category and filters products by category", async ({ page, request }) => {
    const productName = uniqueName("Producto categoría huevo");
    const categoryName = uniqueName("Categoría huevo");
    await createCategory(request, page, categoryName, "#eab308");

    const newProductPage = new NewProductPage(page);

    await newProductPage.goto();
    await newProductPage.fillForm({
      name: productName,
      categoryName,
      unit: "unidad",
      basePrice: "2.50",
    });
    await newProductPage.save();

    const productId = await newProductPage.getSavedProductId();
    expect(productId).toBeTruthy();

    const productDetailPage = new ProductDetailPage(page);
    await productDetailPage.expectCategoryBadge(categoryName);

    await page.goto("/productos");
    await page.getByTestId("products-category-filter-chip").filter({ hasText: categoryName }).click();

    await expect(page.getByText(productName, { exact: true })).toBeVisible();
    await expect(page.getByText("Pollo Entero", { exact: true })).toHaveCount(0);
  });

  test("clears product category and shows it under uncategorized filter", async ({ page, request }) => {
    const productName = uniqueName("Producto sin categoría E2E");
    const categoryName = uniqueName("Categoría otro");
    await createCategory(request, page, categoryName, "#6b7280");

    const newProductPage = new NewProductPage(page);

    await newProductPage.goto();
    await newProductPage.fillForm({
      name: productName,
      categoryName,
      unit: "kg",
      basePrice: "12.00",
    });
    await newProductPage.save();

    const productId = await newProductPage.getSavedProductId();
    expect(productId).toBeTruthy();

    const productDetailPage = new ProductDetailPage(page);
    await productDetailPage.clearCategory();
    await productDetailPage.saveProductChanges();
    await productDetailPage.expectCategoryBadge("Sin categoría");

    await page.goto("/productos");
    await page.getByTestId("products-category-filter-chip").filter({ hasText: "Sin categoría" }).click();
    await expect(page.getByText(productName, { exact: true })).toBeVisible();

    await page.getByTestId("products-category-filter-chip").filter({ hasText: categoryName }).click();
    await expect(page.getByText(productName, { exact: true })).toHaveCount(0);
  });

  test("creates a variant for a product", async ({ page, request }) => {
    const productName = uniqueName("Producto variante E2E");
    const categoryName = uniqueName("Categoría pollo");
    await createCategory(request, page, categoryName);

    const newProductPage = new NewProductPage(page);

    await newProductPage.goto();
    await newProductPage.fillForm({
      name: productName,
      categoryName,
      unit: "kg",
      basePrice: "20.00",
    });
    await newProductPage.save();

    const productId = await newProductPage.getSavedProductId();
    expect(productId).toBeTruthy();

    const productDetailPage = new ProductDetailPage(page);
    await productDetailPage.goto(productId!);
    await productDetailPage.addVariant({
      name: "Entero E2E",
      sku: "E2E-ENT",
      unitQuantity: "2.5",
      price: "50.00",
    });

    await productDetailPage.expectVariantSaved("Entero E2E");
  });

  test("validates variant name before saving", async ({ page, request }) => {
    const productName = uniqueName("Producto validación variante");
    const categoryName = uniqueName("Categoría validación");
    await createCategory(request, page, categoryName);

    const newProductPage = new NewProductPage(page);

    await newProductPage.goto();
    await newProductPage.fillForm({
      name: productName,
      categoryName,
      unit: "kg",
      basePrice: "18.00",
    });
    await newProductPage.save();

    const productId = await newProductPage.getSavedProductId();
    expect(productId).toBeTruthy();

    const productDetailPage = new ProductDetailPage(page);
    await productDetailPage.goto(productId!);
    await productDetailPage.enableVariants();
    await productDetailPage.addVariantButton.click();
    await productDetailPage.variantNameInput.fill("");
    await productDetailPage.saveVariantButton.click();

    await productDetailPage.expectValidationError("name");
  });
});
