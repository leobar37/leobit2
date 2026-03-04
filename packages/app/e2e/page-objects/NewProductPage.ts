import type { Page, Locator } from "@playwright/test";

export class NewProductPage {
  readonly nameInput: Locator;
  readonly typeSelect: Locator;
  readonly unitSelect: Locator;
  readonly basePriceInput: Locator;
  readonly saveButton: Locator;

  constructor(private page: Page) {
    this.nameInput = page.getByTestId("product-name-input");
    this.typeSelect = page.getByTestId("product-type-select");
    this.unitSelect = page.getByTestId("product-unit-select");
    this.basePriceInput = page.getByTestId("product-baseprice-input");
    this.saveButton = page.getByTestId("save-product-button");
  }

  async goto() {
    await this.page.goto("/productos/nuevo");
  }

  async fillForm(data: { name: string; type: string; unit: string; basePrice: string }) {
    await this.nameInput.fill(data.name);
    await this.typeSelect.selectOption(data.type);
    await this.unitSelect.selectOption(data.unit);
    await this.basePriceInput.fill(data.basePrice);
  }

  async save() {
    await this.saveButton.click();
  }

  async expectSaved() {
    await this.page.waitForURL("/productos");
  }

  async expectValidationError(field: "name" | "basePrice") {
    const errorText = field === "name" 
      ? "El nombre debe tener al menos 2 caracteres"
      : "El precio es requerido";
    await this.page.waitForSelector(`text=${errorText}`);
  }
}
