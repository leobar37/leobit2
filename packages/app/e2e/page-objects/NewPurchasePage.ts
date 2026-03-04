import type { Page, Locator } from "@playwright/test";

export class NewPurchasePage {
  readonly supplierSelector: Locator;
  readonly selectProductButton: Locator;
  readonly addToCartButton: Locator;
  readonly savePurchaseButton: Locator;
  readonly cartSection: Locator;

  constructor(private page: Page) {
    this.supplierSelector = page.getByTestId("supplier-selector-trigger");
    this.selectProductButton = page.getByTestId("purchase-select-product-button");
    this.addToCartButton = page.getByTestId("purchase-add-to-cart-button");
    this.savePurchaseButton = page.getByTestId("save-purchase-button");
    this.cartSection = page.getByTestId("purchase-cart-section");
  }

  async goto() {
    await this.page.goto("/compras/nueva");
  }

  async selectSupplier(supplierName: string) {
    await this.supplierSelector.click();
    await this.page.waitForSelector("text=Seleccionar Proveedor");
    await this.page.click(`text=${supplierName}`);
  }

  async fillInvoiceNumber(invoiceNumber: string) {
    await this.page.fill('input[name="invoiceNumber"]', invoiceNumber);
  }

  async selectProductAndVariant(productName: string, variantName: string) {
    await this.selectProductButton.click();
    await this.page.waitForSelector("[data-testid='variant-selector-modal']");
    await this.page.click(`text=${productName}`);
    await this.page.click(`text=${variantName}`);
  }

  async enterQuantityAndCost(quantity: string, unitCost: string) {
    // Fill quantity (direct input when no unit selected)
    await this.page.fill('input[placeholder="Cantidad"]', quantity);
    // Fill unit cost
    await this.page.fill('input[placeholder="0.00"] >> nth=1', unitCost);
  }

  async addToCart() {
    await this.addToCartButton.click();
  }

  async savePurchase() {
    await this.savePurchaseButton.click();
  }

  async expectPurchaseSaved() {
    await this.page.waitForURL("/compras");
  }

  async expectSupplierRequiredError() {
    await this.page.waitForSelector("text=Proveedor es requerido");
  }
}
