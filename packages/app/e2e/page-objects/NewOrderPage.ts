import type { Page, Locator } from "@playwright/test";

export class NewOrderPage {
  readonly customerField: Locator;
  readonly deliveryDateField: Locator;
  readonly paymentSelector: Locator;
  readonly addItemButton: Locator;
  readonly saveOrderButton: Locator;
  readonly orderDateField: Locator;
  readonly advancePaymentField: Locator;
  readonly quotedPriceField: Locator;

  constructor(private page: Page) {
    this.customerField = page.getByTestId("order-customer-field");
    this.deliveryDateField = page.getByTestId("order-delivery-date");
    this.paymentSelector = page.getByTestId("order-payment-selector");
    this.addItemButton = page.getByTestId("order-add-item-button");
    this.saveOrderButton = page.getByTestId("save-order-button");
    this.orderDateField = page.getByTestId("order-date-field");
    this.advancePaymentField = page.getByTestId("advance-payment-input");
    this.quotedPriceField = page.getByTestId("quoted-price-input");
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
    // Handle "today" and "tomorrow" shortcuts
    if (dateStr === "today") {
      await this.page.click("text=Hoy");
    } else if (dateStr === "tomorrow") {
      await this.page.click("text=Mañana");
    }
  }

  async setDeliveryDate(dateStr: string) {
    // For specific date selection, click on the date field and pick from calendar
    await this.deliveryDateField.click();

    // Check if it's a relative date shortcut
    if (dateStr === "today") {
      await this.page.click("text=Hoy");
    } else if (dateStr === "tomorrow") {
      await this.page.click("text=Mañana");
    } else if (dateStr === "") {
      // Empty date - do nothing
      return;
    } else {
      // Parse date string and select from calendar
      const date = new Date(dateStr);
      const day = date.getDate().toString();

      // Try to find and click the day in the calendar
      const calendarDay = this.page.locator(`button:has-text("^${day}$")`).first();
      if (await calendarDay.isVisible()) {
        await calendarDay.click();
      }
    }
  }

  async setOrderDate(dateStr: string) {
    // Set order date if the field exists
    if (await this.orderDateField.isVisible()) {
      await this.orderDateField.fill(dateStr);
    }
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

  async completeOrder() {
    // Same as saveOrder but more explicit
    await this.saveOrderButton.click();
    // Wait for navigation or success
    await this.page.waitForTimeout(500);
  }

  async setQuotedPrice(price: string) {
    // Set quoted price for items if supported
    const quotedPriceInput = this.page.locator('[data-testid="quoted-price-input"]');
    if (await quotedPriceInput.isVisible()) {
      await quotedPriceInput.fill(price);
    }
  }

  async setAdvancePayment(amount: string) {
    // Set advance payment amount if supported
    const advanceInput = this.page.locator('[data-testid="advance-payment-input"]');
    if (await advanceInput.isVisible()) {
      await advanceInput.fill(amount);
    }
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

  async expectDeliveryDateRequiredError() {
    await this.page.waitForSelector("text=Fecha de entrega es requerida");
  }

  async expectPastDateError() {
    await this.page.waitForSelector("text=fecha pasada").catch(() => {
      return this.page.waitForSelector("text=no permitida");
    });
  }

  async expectInvalidDateError() {
    await this.page.waitForSelector("text=fecha inválida");
  }
}
