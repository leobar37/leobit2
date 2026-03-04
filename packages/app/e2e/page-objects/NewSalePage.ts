import type { Page, Locator } from "@playwright/test";

export class NewSalePage {
  readonly selectProductButton: Locator;
  readonly calculatorTotalInput: Locator;
  readonly submitSaleButton: Locator;
  readonly cartSection: Locator;

  constructor(private page: Page) {
    this.selectProductButton = page.getByTestId("select-product-button");
    this.calculatorTotalInput = page.getByTestId("calculator-total-amount");
    this.submitSaleButton = page.getByTestId("submit-sale-button");
    this.cartSection = page.getByTestId("cart-section");
  }

  async goto() {
    await this.page.goto("/ventas/nueva");
  }

  async selectCustomer(customerName: string) {
    // Open customer search
    await this.page.getByTestId("customer-select-button").click();
    // Search for customer
    await this.page.getByTestId("customer-search-input").fill(customerName);
    // Select customer from list
    await this.page.getByTestId("customer-list").getByText(customerName).first().click();
  }

  async selectPaymentMode(mode: "pago_total" | "a_cuenta" | "debe_todo") {
    await this.page.getByTestId(`payment-mode-${mode}`).click();
  }

  async selectProductAndVariant(productName: string, variantName: string) {
    // Click button to open variant selector (use the outline button which is more reliable)
    await this.page.getByTestId('variant-selector-button').click();

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

    // Click confirm button to select product/variant
    await this.page.getByTestId('variant-selector-confirm').click();

    // Wait for modal to close and calculator form to appear
    await this.page.waitForSelector('[data-testid="variant-selector-modal"]', { state: 'hidden', timeout: 5000 });
    await this.page.waitForSelector('[data-testid="calculator-form"]', { timeout: 5000 });
  }

  async enterTotalAmount(amount: string) {
    await this.calculatorTotalInput.fill(amount);
  }

  async enterPacks(packs: string) {
    // Only for unit products - check if field exists first
    const packsInput = this.page.getByTestId("calculator-packs");
    if (await packsInput.isVisible().catch(() => false)) {
      await packsInput.fill(packs);
    }
  }

  async enterKgWeight(bruto: string) {
    // For kg products - fill kilos (tara is optional, defaults to 0)
    await this.page.getByTestId("calculator-kilos").fill(bruto);
  }

  async addToCart() {
    await this.page.getByTestId("add-to-cart-button").click();
  }

  async completeSale() {
    await this.submitSaleButton.click();
  }

  async expectSaleCompleted() {
    await this.page.waitForURL("/dashboard");
  }

  async expectCreditError() {
    await this.page.waitForSelector("text=Para registrar crédito necesitas seleccionar un cliente");
  }

  async expectPartialAmountError() {
    await this.page.waitForSelector("text=El monto a cuenta no puede superar el total");
  }
}
