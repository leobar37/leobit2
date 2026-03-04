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
    // Open customer search and select
    await this.page.click("text=Seleccionar cliente");
    await this.page.fill('[placeholder*="Buscar"] >> visible=true', customerName);
    await this.page.click(`text=${customerName}`);
  }

  async selectPaymentMode(mode: "contado" | "credito" | "a_cuenta") {
    await this.page.click(`text=${mode === "contado" ? "Al contado" : mode === "credito" ? "Crédito" : "A cuenta"}`);
  }

  async selectProductAndVariant(productName: string, variantName: string) {
    await this.selectProductButton.click();
    // Wait for variant selector modal
    await this.page.waitForSelector("[data-testid='variant-selector-modal']");
    // Click product
    await this.page.click(`text=${productName}`);
    // Click variant
    await this.page.click(`text=${variantName}`);
  }

  async enterTotalAmount(amount: string) {
    await this.calculatorTotalInput.fill(amount);
  }

  async addToCart() {
    await this.page.click("text=Agregar al carrito");
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
