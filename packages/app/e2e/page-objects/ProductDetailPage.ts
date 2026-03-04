import type { Page, Locator } from "@playwright/test";

export class ProductDetailPage {
  readonly variantNameInput: Locator;
  readonly variantSkuInput: Locator;
  readonly variantUnitQuantityInput: Locator;
  readonly variantPriceInput: Locator;
  readonly saveVariantButton: Locator;
  readonly addVariantButton: Locator;

  constructor(private page: Page) {
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

  async addVariant(data: { name: string; sku: string; unitQuantity: string; price: string }) {
    // Click "Agregar Variante" button
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
