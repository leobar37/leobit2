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
    // Use the outline button which is more reliable
    await this.page.getByTestId('purchase-variant-selector-button').click();

    // Wait for modal to open
    await this.page.waitForSelector('[data-testid="variant-selector-modal"]', { state: 'visible', timeout: 5000 });

    // Wait for product list to appear
    await this.page.waitForSelector('[data-testid^="product-option-"]', { timeout: 5000 });

    // Click product by name
    await this.page.locator('[data-testid="product-option-name"]').filter({ hasText: productName }).first().click();

    // Wait for variant list to appear
    await this.page.waitForSelector('[data-testid^="variant-option-"]', { timeout: 5000 });

    // Wait a bit for the auto-selection to happen
    await this.page.waitForTimeout(500);

    // Click variant by name to ensure it's selected
    await this.page.locator('[data-testid="variant-option-name"]').filter({ hasText: variantName }).first().click();

    // Wait for selection to register
    await this.page.waitForTimeout(300);

    // Click confirm button to add to cart
    await this.page.getByTestId('variant-selector-confirm').click();

    // Wait for modal to close
    await this.page.waitForSelector('[data-testid="variant-selector-modal"]', { state: 'hidden', timeout: 5000 });
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
