import type { Page, Locator } from "@playwright/test";

export class ProductDetailPage {
  readonly categorySelectTrigger: Locator;
  readonly categorySearchInput: Locator;
  readonly categoryOptionNone: Locator;
  readonly categoryOptions: Locator;
  readonly categoryCreateButton: Locator;
  readonly categoryCreateDialog: Locator;
  readonly categoryCreateNameInput: Locator;
  readonly categoryCreateSaveButton: Locator;
  readonly saveProductButton: Locator;
  readonly showVariantsToggle: Locator;
  readonly variantNameInput: Locator;
  readonly variantSkuInput: Locator;
  readonly variantUnitQuantityInput: Locator;
  readonly variantPriceInput: Locator;
  readonly saveVariantButton: Locator;
  readonly addVariantButton: Locator;

  constructor(private page: Page) {
    this.categorySelectTrigger = page.getByTestId("product-category-select-trigger");
    this.categorySearchInput = page.getByTestId("product-category-search-input");
    this.categoryOptionNone = page.getByTestId("product-category-option-none");
    this.categoryOptions = page.getByTestId("product-category-option");
    this.categoryCreateButton = page.getByTestId("product-category-create-button");
    this.categoryCreateDialog = page.getByTestId("product-category-create-dialog");
    this.categoryCreateNameInput = this.categoryCreateDialog.getByPlaceholder("Nombre de la categoría");
    this.categoryCreateSaveButton = this.categoryCreateDialog.getByTestId("product-category-save-button");
    this.saveProductButton = page.getByTestId("save-product-button");
    this.showVariantsToggle = page.locator("#showVariants");
    this.variantNameInput = page.getByTestId("variant-name-input");
    this.variantSkuInput = page.getByTestId("variant-sku-input");
    this.variantUnitQuantityInput = page.getByTestId("variant-unitquantity-input");
    this.variantPriceInput = page.getByTestId("variant-price-input");
    this.saveVariantButton = page.getByTestId("save-variant-button");
    this.addVariantButton = page.getByTestId("add-variant-button");
  }

  async goto(productId: string) {
    await this.page.goto(`/productos/${productId}`);
  }

  async openCategorySelector() {
    await this.categorySelectTrigger.click({ force: true });
  }

  async selectCategory(categoryName: string) {
    await this.openCategorySelector();
    await this.categorySearchInput.fill(categoryName);
    const categoryOption = this.categoryOptions.filter({ hasText: categoryName }).first();
    if ((await categoryOption.count()) > 0) {
      await categoryOption.click({ force: true });
      return;
    }

    await this.categoryCreateButton.evaluate((element: HTMLElement) => element.click());
    await this.categoryCreateDialog.waitFor();
    await this.categoryCreateNameInput.fill(categoryName);
    await this.categoryCreateSaveButton.evaluate((element: HTMLElement) => element.click());
    await this.page.waitForLoadState("networkidle");
  }

  async clearCategory() {
    await this.openCategorySelector();
    await this.categoryOptionNone.click({ force: true });
  }

  async saveProductChanges() {
    await this.saveProductButton.click();
    await this.page.waitForURL(/\/productos\/[^/]+$/);
  }

  async expectCategoryBadge(label: string) {
    await this.page.getByText(label, { exact: true }).waitFor();
  }

  async enableVariants() {
    if (!(await this.showVariantsToggle.isChecked())) {
      await this.page.locator('label:has(#showVariants)').click();
    }
    await this.addVariantButton.waitFor();
  }

  async addVariant(data: { name: string; sku: string; unitQuantity: string; price: string }) {
    await this.enableVariants();
    await this.addVariantButton.click();

    await this.variantNameInput.fill(data.name);
    await this.variantSkuInput.fill(data.sku);
    await this.variantUnitQuantityInput.fill(data.unitQuantity);
    await this.variantPriceInput.fill(data.price);
    await this.saveVariantButton.click();
  }

  async expectVariantSaved(variantName: string) {
    await this.page.waitForSelector(`text=${variantName}`);
  }

  async expectValidationError(field: "name" | "unitQuantity" | "price") {
    const errorMap = {
      name: "El nombre es requerido",
      unitQuantity: "La cantidad mínima es 0.001",
      price: "El precio no puede ser negativo",
    };
    await this.page.waitForSelector(`text=${errorMap[field]}`);
  }
}
