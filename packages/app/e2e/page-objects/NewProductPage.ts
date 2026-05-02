import type { Page, Locator } from "@playwright/test";

export class NewProductPage {
  readonly nameInput: Locator;
  readonly categorySelectTrigger: Locator;
  readonly categorySearchInput: Locator;
  readonly categoryOptionNone: Locator;
  readonly categoryOptions: Locator;
  readonly categoryCreateButton: Locator;
  readonly categoryCreateDialog: Locator;
  readonly categoryCreateNameInput: Locator;
  readonly categoryCreateSaveButton: Locator;
  readonly unitSelect: Locator;
  readonly basePriceInput: Locator;
  readonly saveButton: Locator;
  readonly hasVariantsToggle: Locator;

  constructor(private page: Page) {
    this.nameInput = page.getByTestId("product-name-input");
    this.categorySelectTrigger = page.getByTestId("product-category-select-trigger");
    this.categorySearchInput = page.getByTestId("product-category-search-input");
    this.categoryOptionNone = page.getByTestId("product-category-option-none");
    this.categoryOptions = page.getByTestId("product-category-option");
    this.categoryCreateButton = page.getByTestId("product-category-create-button");
    this.categoryCreateDialog = page.getByTestId("product-category-create-dialog");
    this.categoryCreateNameInput = this.categoryCreateDialog.getByPlaceholder("Nombre de la categoría");
    this.categoryCreateSaveButton = this.categoryCreateDialog.getByTestId("product-category-save-button");
    this.unitSelect = page.getByTestId("product-unit-select");
    this.basePriceInput = page.getByTestId("product-baseprice-input");
    this.saveButton = page.getByTestId("save-product-button");
    this.hasVariantsToggle = page.locator("#hasVariants");
  }

  async goto() {
    await this.page.goto("/productos/nuevo");
  }

  async fillForm(data: {
    name: string;
    categoryName?: string | null;
    unit: string;
    basePrice: string;
  }) {
    await this.nameInput.fill(data.name);
    if (data.categoryName === null) {
      await this.clearCategory();
    } else if (data.categoryName) {
      await this.selectCategory(data.categoryName);
    }
    await this.unitSelect.selectOption(data.unit);
    await this.basePriceInput.fill(data.basePrice);
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

    await this.createCategory(categoryName);
  }

  async createCategory(categoryName: string) {
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

  async setHasVariants(enabled: boolean) {
    const isChecked = await this.hasVariantsToggle.isChecked();
    if (isChecked !== enabled) {
      await this.page.locator('label:has(#hasVariants)').click();
    }
  }

  async save() {
    await this.saveButton.click();
  }

  async expectSaved() {
    await this.page.waitForURL(/\/productos\/[^/]+$/);
  }

  async getSavedProductId() {
    await this.expectSaved();
    const match = this.page.url().match(/\/productos\/([^/?#]+)/);
    return match?.[1] ?? null;
  }

  async expectValidationError(field: "name" | "basePrice") {
    const errorText = field === "name" 
      ? "El nombre debe tener al menos 2 caracteres"
      : "El precio es requerido";
    await this.page.waitForSelector(`text=${errorText}`);
  }
}
