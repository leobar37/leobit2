// @ts-nocheck - E2E test file with incomplete page objects
/**
 * New Sale Page Object Model
 *
 * This class encapsulates all interactions with the new sale page.
 * It provides methods for each action a user can take.
 */

import { Page, Locator, expect } from "@playwright/test";

export class NewSalePage {
  readonly page: Page;

  // Customer section
  readonly customerSelectButton: Locator;
  readonly customerDrawer: Locator;
  readonly customerSearchInput: Locator;
  readonly customerList: Locator;
  readonly customerSelectedCard: Locator;
  readonly customerSelectedName: Locator;
  readonly customerClearButton: Locator;

  // Payment mode section
  readonly paymentModeSection: Locator;
  readonly paymentModePagoTotal: Locator;
  readonly paymentModeACuenta: Locator;
  readonly paymentModeDebeTodo: Locator;
  readonly paymentModeDescription: Locator;
  readonly customerRequiredError: Locator;

  // Calculator section
  readonly calculatorSection: Locator;
  readonly calculatorEmptyState: Locator;
  readonly selectProductButton: Locator;
  readonly variantSelectorButton: Locator;
  readonly calculatorForm: Locator;
  readonly selectedProductCard: Locator;
  readonly selectedProductName: Locator;
  readonly selectedVariantName: Locator;
  readonly changeProductButton: Locator;
  readonly calculatorTotalAmount: Locator;
  readonly calculatorPricePerKg: Locator;
  readonly calculatorKilos: Locator;
  readonly calculatorTara: Locator;
  readonly calculatorPacks: Locator;
  readonly calculatorUnits: Locator;
  readonly calculatorSummary: Locator;
  readonly calculatorNetWeight: Locator;
  readonly calculatorTotalDisplay: Locator;
  readonly addToCartButton: Locator;
  readonly calculatorResetButton: Locator;
  readonly anotherProductButton: Locator;

  // Cart section
  readonly cartSection: Locator;
  readonly cartTitle: Locator;
  readonly cartItemsContainer: Locator;

  // Sale summary
  readonly saleSummaryCard: Locator;
  readonly saleTotalAmount: Locator;
  readonly initialPaymentInput: Locator;
  readonly saleBalanceDue: Locator;
  readonly submitErrorMessage: Locator;

  // Submit
  readonly submitSaleContainer: Locator;
  readonly submitSaleButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Customer section
    this.customerSelectButton = page.getByTestId("customer-select-button");
    this.customerDrawer = page.getByTestId("customer-drawer");
    this.customerSearchInput = page.getByTestId("customer-search-input");
    this.customerList = page.getByTestId("customer-list");
    this.customerSelectedCard = page.getByTestId("customer-selected-card");
    this.customerSelectedName = page.getByTestId("customer-selected-name");
    this.customerClearButton = page.getByTestId("customer-clear-button");

    // Payment mode section
    this.paymentModeSection = page.getByTestId("payment-mode-section");
    this.paymentModePagoTotal = page.getByTestId("payment-mode-pago_total");
    this.paymentModeACuenta = page.getByTestId("payment-mode-a_cuenta");
    this.paymentModeDebeTodo = page.getByTestId("payment-mode-debe_todo");
    this.paymentModeDescription = page.getByTestId("payment-mode-description");
    this.customerRequiredError = page.getByTestId("customer-required-error");

    // Calculator section
    this.calculatorSection = page.getByTestId("calculator-section");
    this.calculatorEmptyState = page.getByTestId("calculator-empty-state");
    this.selectProductButton = page.getByTestId("select-product-button");
    this.variantSelectorButton = page.getByTestId("variant-selector-button");
    this.calculatorForm = page.getByTestId("calculator-form");
    this.selectedProductCard = page.getByTestId("selected-product-card");
    this.selectedProductName = page.getByTestId("selected-product-name");
    this.selectedVariantName = page.getByTestId("selected-variant-name");
    this.changeProductButton = page.getByTestId("change-product-button");
    this.calculatorTotalAmount = page.getByTestId("calculator-total-amount");
    this.calculatorPricePerKg = page.getByTestId("calculator-price-per-kg");
    this.calculatorKilos = page.getByTestId("calculator-kilos");
    this.calculatorTara = page.getByTestId("calculator-tara");
    this.calculatorPacks = page.getByTestId("calculator-packs");
    this.calculatorUnits = page.getByTestId("calculator-units");
    this.calculatorSummary = page.getByTestId("calculator-summary");
    this.calculatorNetWeight = page.getByTestId("calculator-net-weight");
    this.calculatorTotalDisplay = page.getByTestId("calculator-total-display");
    this.addToCartButton = page.getByTestId("add-to-cart-button");
    this.calculatorResetButton = page.getByTestId("calculator-reset-button");
    this.anotherProductButton = page.getByTestId("another-product-button");

    // Cart section
    this.cartSection = page.getByTestId("cart-section");
    this.cartTitle = page.getByTestId("cart-title");
    this.cartItemsContainer = page.getByTestId("cart-items-container");

    // Sale summary
    this.saleSummaryCard = page.getByTestId("sale-summary-card");
    this.saleTotalAmount = page.getByTestId("sale-total-amount");
    this.initialPaymentInput = page.getByTestId("initial-payment-input");
    this.saleBalanceDue = page.getByTestId("sale-balance-due");
    this.submitErrorMessage = page.getByTestId("submit-error-message");

    // Submit
    this.submitSaleContainer = page.getByTestId("submit-sale-container");
    this.submitSaleButton = page.getByTestId("submit-sale-button");
  }

  // Navigation
  async goto() {
    await this.page.goto("/ventas/nueva");
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    await expect(this.calculatorSection).toBeVisible();
  }

  // Customer actions
  async openCustomerDrawer() {
    await this.customerSelectButton.click();
    await expect(this.customerDrawer).toBeVisible();
  }

  async searchCustomer(query: string) {
    await this.customerSearchInput.fill(query);
    // Wait for debounce
    await this.page.waitForTimeout(300);
  }

  async selectCustomerByIndex(index: number) {
    const customerOption = this.page.getByTestId(`customer-option-${index}`);
    await customerOption.click();
    await expect(this.customerDrawer).not.toBeVisible();
  }

  async selectCustomerByName(name: string) {
    await this.openCustomerDrawer();
    await this.searchCustomer(name);
    const customerOption = this.page.locator(`[data-testid^="customer-option-"]`).filter({ hasText: name });
    await customerOption.first().click();
    await expect(this.customerDrawer).not.toBeVisible();
  }

  async clearCustomer() {
    await this.customerClearButton.click();
    await expect(this.customerSelectButton).toBeVisible();
  }

  async getSelectedCustomerName(): Promise<string> {
    return (await this.customerSelectedName.textContent()) || "";
  }

  // Payment mode actions
  async selectPaymentMode(mode: "pago_total" | "a_cuenta" | "debe_todo") {
    const buttonMap = {
      pago_total: this.paymentModePagoTotal,
      a_cuenta: this.paymentModeACuenta,
      debe_todo: this.paymentModeDebeTodo,
    };
    await buttonMap[mode].click();
  }

  async getPaymentModeDescription(): Promise<string> {
    return (await this.paymentModeDescription.textContent()) || "";
  }

  // Calculator actions
  async openVariantSelector() {
    await this.selectProductButton.click();
  }

  async fillCalculatorValues(values: {
    totalAmount?: string;
    pricePerKg?: string;
    kilos?: string;
    tara?: string;
    packs?: string;
    units?: string;
  }) {
    if (values.totalAmount !== undefined) {
      await this.calculatorTotalAmount.fill(values.totalAmount);
    }
    if (values.pricePerKg !== undefined) {
      await this.calculatorPricePerKg.fill(values.pricePerKg);
    }
    if (values.kilos !== undefined) {
      await this.calculatorKilos.fill(values.kilos);
    }
    if (values.tara !== undefined) {
      await this.calculatorTara.fill(values.tara);
    }
    if (values.packs !== undefined) {
      await this.calculatorPacks.fill(values.packs);
    }
    if (values.units !== undefined) {
      await this.calculatorUnits.fill(values.units);
    }
  }

  async addToCart() {
    await this.addToCartButton.click();
  }

  async resetCalculator() {
    await this.calculatorResetButton.click();
  }

  async getNetWeight(): Promise<string> {
    return (await this.calculatorNetWeight.textContent()) || "";
  }

  async getCalculatorTotal(): Promise<string> {
    return (await this.calculatorTotalDisplay.textContent()) || "";
  }

  // Cart actions
  async getCartItemCount(): Promise<number> {
    const items = await this.page.locator('[data-testid^="cart-item-"]').count();
    return items;
  }

  async removeCartItem(index: number) {
    const item = this.page.getByTestId(`cart-item-${index}`);
    const removeButton = item.locator('[data-testid="cart-item-remove"]');
    await removeButton.click();
  }

  async getCartItemName(index: number): Promise<string> {
    const item = this.page.getByTestId(`cart-item-${index}`);
    return (await item.locator('[data-testid="cart-item-name"]').textContent()) || "";
  }

  async getCartItemSubtotal(index: number): Promise<string> {
    const item = this.page.getByTestId(`cart-item-${index}`);
    return (await item.locator('[data-testid="cart-item-subtotal"]').textContent()) || "";
  }

  // Sale summary actions
  async getSaleTotal(): Promise<string> {
    return (await this.saleTotalAmount.textContent()) || "";
  }

  async getBalanceDue(): Promise<string> {
    return (await this.saleBalanceDue.textContent()) || "";
  }

  async setInitialPayment(amount: string) {
    await this.initialPaymentInput.fill(amount);
  }

  async getSubmitError(): Promise<string> {
    return (await this.submitErrorMessage.textContent()) || "";
  }

  // Submit actions
  async submitSale() {
    await this.submitSaleButton.click();
  }

  async isSubmitButtonEnabled(): Promise<boolean> {
    return await this.submitSaleButton.isEnabled();
  }

  // Assertions
  async expectCustomerRequiredError() {
    await expect(this.customerRequiredError).toBeVisible();
  }

  async expectCartHasItems(count: number) {
    await expect(this.cartSection).toBeVisible();
    const items = await this.getCartItemCount();
    expect(items).toBe(count);
  }

  async expectSaleTotal(expectedTotal: string) {
    const total = await this.getSaleTotal();
    expect(total).toContain(expectedTotal);
  }
}
