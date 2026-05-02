import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { LoginPage } from "../page-objects/LoginPage";
import { NewSalePage } from "../page-objects/NewSalePage";

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
  color: string,
) {
  return apiRequest<{ id: string; name: string }>(request, page, "/product-categories", {
    name,
    color,
  });
}

async function createProduct(
  request: APIRequestContext,
  page: Page,
  input: { name: string; categoryId: string | null; unit: "kg" | "unidad"; basePrice: string },
) {
  return apiRequest(request, page, "/products", {
    ...input,
    isActive: true,
  });
}

test.describe("Sale - Product Filters", () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login();
  });

  test("filters POS products by unit and category chips", async ({ page, request }) => {
    test.setTimeout(180000);
    const eggCategory = await createCategory(request, page, `POS Huevo ${Date.now()}`, "#eab308");
    const chickenCategory = await createCategory(request, page, `POS Pollo ${Date.now()}`, "#f97316");

    const products = Array.from({ length: 9 }, (_, index) => ({
      name: `Filtro POS ${Date.now()}-${index}`,
      categoryId: index === 8 ? null : index % 2 === 0 ? eggCategory.id : chickenCategory.id,
      unit: index % 2 === 0 ? "unidad" : "kg",
      basePrice: index % 2 === 0 ? "1.20" : "13.50",
    }));

    for (const product of products) {
      await createProduct(request, page, product);
    }

    const newSalePage = new NewSalePage(page);
    await newSalePage.goto();

    await newSalePage.selectProductFilter("Por unidad");
    await newSalePage.expectProductOptionVisible(products[0].name);
    await newSalePage.expectProductOptionHidden(products[1].name);

    await newSalePage.selectProductFilter(chickenCategory.name);
    await newSalePage.expectProductOptionVisible(products[1].name);
    await newSalePage.expectProductOptionHidden(products[0].name);

    await newSalePage.selectProductFilter("Sin categoría");
    await newSalePage.expectProductOptionVisible(products[8].name);

    await newSalePage.selectProductFilter("Por unidad");
    await newSalePage.expectProductOptionVisible(products[0].name);
  });
});
