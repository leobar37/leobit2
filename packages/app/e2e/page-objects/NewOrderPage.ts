import type { Page, Locator } from "@playwright/test";

export class NewOrderPage {
  readonly customerField: Locator;
  readonly deliveryDateField: Locator;
  readonly paymentSelector: Locator;
  readonly addItemButton: Locator;
  readonly saveOrderButton: Locator;

  constructor(private page: Page) {
    this.customerField = page.getByTestId("order-customer-field");
    this.deliveryDateField = page.getByTestId("order-delivery-date");
    this.paymentSelector = page.getByTestId("order-payment-selector");
    this.addItemButton = page.getByTestId("order-add-item-button");
    this.saveOrderButton = page.getByTestId("save-order-button");
  }

  async goto() {
    await this.page.goto("/pedidos/nuevo");
  }

  async selectCustomer(customerName: string) {
    // Click on customer search within the field
    await this.page.click("text=Seleccionar cliente");
    await this.page.fill('[placeholder*="Buscar"] >> visible=true', customerName);
    await this.page.click(`text=${customerName}`);
  }

  async selectDeliveryDate(dateStr: string) {
    // Use tomorrow as default
    await this.page.click("text=Mañana");
  }

  async selectPaymentIntent(intent: "contado" | "credito") {
    await this.page.getByTestId(`order-payment-${intent}`).click();
  }

  async addItem(productName: string, variantName: string, quantity: string) {
    await this.addItemButton.click();
    await this.page.waitForSelector("[data-testid='variant-selector-modal']");
    await this.page.click(`text=${productName}`);
    await this.page.click(`text=${variantName}`);
    // Fill quantity in the item form
    await this.page.fill('input[inputmode="decimal"]', quantity);
    await this.page.click("text=Agregar");
  }

  async saveOrder() {
    await this.saveOrderButton.click();
  }

  async expectOrderSaved() {
    await this.page.waitForURL("/pedidos");
  }

  async expectCustomerRequiredError() {
    await this.page.waitForSelector("text=Cliente es requerido");
  }

  async expectItemsRequiredError() {
    await this.page.waitForSelector("text=Agrega al menos un item");
  }
}
