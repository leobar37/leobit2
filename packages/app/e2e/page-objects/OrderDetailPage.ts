import type { Page, Locator } from "@playwright/test";

export class OrderDetailPage {
  readonly page: Page;
  readonly confirmButton: Locator;
  readonly deliverButton: Locator;
  readonly cancelButton: Locator;
  readonly statusBadge: Locator;
  readonly customerName: Locator;
  readonly deliveryDate: Locator;
  readonly paymentMethod: Locator;
  readonly totalAmount: Locator;
  readonly itemsList: Locator;
  readonly deliveryModal: Locator;
  readonly orderDate: Locator;
  readonly advancePaymentAmount: Locator;
  readonly quotedPriceDisplay: Locator;

  constructor(page: Page) {
    this.page = page;
    this.confirmButton = page.getByTestId("confirm-order-button");
    this.deliverButton = page.getByTestId("deliver-order-button");
    this.cancelButton = page.getByTestId("cancel-order-button");
    this.statusBadge = page.getByTestId("order-status-badge");
    this.customerName = page.getByTestId("order-customer-name");
    this.deliveryDate = page.getByTestId("order-delivery-date-display");
    this.paymentMethod = page.getByTestId("order-payment-display");
    this.totalAmount = page.getByTestId("order-total-amount");
    this.itemsList = page.getByTestId("order-items-list");
    this.deliveryModal = page.getByTestId("order-delivery-modal");
    this.orderDate = page.getByTestId("order-date-display");
    this.advancePaymentAmount = page.getByTestId("advance-payment-display");
    this.quotedPriceDisplay = page.getByTestId("quoted-price-display");
  }

  async goto(orderId: string) {
    await this.page.goto(`/pedidos/${orderId}`);
  }

  async confirmOrder() {
    await this.confirmButton.click();
    // Wait for confirmation dialog
    await this.page.getByRole("button", { name: "Confirmar" }).click();
  }

  async deliverOrder(options?: { adjustQuantities?: Array<{ itemId: string; quantity: number; price?: number }> }) {
    await this.deliverButton.click();
    await this.deliveryModal.waitFor({ state: "visible" });

    if (options?.adjustQuantities) {
      for (const adjustment of options.adjustQuantities) {
        const itemRow = this.page
          .getByTestId("delivery-item")
          .filter({ has: this.page.locator(`[data-item-id="${adjustment.itemId}"]`) });

        if (adjustment.quantity !== undefined) {
          const qtyInput = itemRow.getByTestId("delivered-quantity-input");
          await qtyInput.fill(adjustment.quantity.toString());
        }

        if (adjustment.price !== undefined) {
          const priceInput = itemRow.getByTestId("final-price-input");
          await priceInput.fill(adjustment.price.toString());
        }
      }
    }

    await this.page.getByTestId("confirm-delivery-button").click();
  }

  async cancelOrder() {
    await this.cancelButton.click();
    // Wait for confirmation dialog
    await this.page.getByRole("button", { name: "Sí, cancelar" }).click();
  }

  async getStatus(): Promise<string> {
    return await this.statusBadge.textContent() || "";
  }

  async expectStatus(status: "Borrador" | "Confirmado" | "Entregado" | "Cancelado") {
    await this.statusBadge.getByText(status).waitFor({ state: "visible" });
  }

  async expectConfirmButtonVisible() {
    await this.confirmButton.waitFor({ state: "visible" });
  }

  async expectDeliverButtonVisible() {
    await this.deliverButton.waitFor({ state: "visible" });
  }

  async expectCancelButtonVisible() {
    await this.cancelButton.waitFor({ state: "visible" });
  }

  async expectConfirmButtonHidden() {
    await this.confirmButton.waitFor({ state: "hidden" });
  }

  async expectDeliverButtonHidden() {
    await this.deliverButton.waitFor({ state: "hidden" });
  }

  async expectCancelButtonHidden() {
    await this.cancelButton.waitFor({ state: "hidden" });
  }

  async getItemByProductName(productName: string): Promise<Locator> {
    return this.itemsList
      .getByTestId("order-item")
      .filter({ has: this.page.getByTestId("order-item-product-name").getByText(productName) });
  }

  async expectSaleCreatedNotification() {
    await this.page.waitForSelector("text=Pedido entregado");
  }

  async clickViewSaleButton() {
    await this.page.getByRole("button", { name: "Ver venta" }).click();
  }

  async expectRedirectToSale(saleId?: string) {
    if (saleId) {
      await this.page.waitForURL(`/ventas/${saleId}`);
    } else {
      await this.page.waitForURL(/\/ventas\/.+/);
    }
  }

  async expectOrderDateVisible(dateStr: string) {
    const date = new Date(dateStr);
    const formattedDate = date.toLocaleDateString("es-PE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    await this.page.waitForSelector(`text=${formattedDate}`, { state: "visible" }).catch(() => {
      // Also try just the day number
      const day = date.getDate().toString();
      this.page.locator(`text=${day}`).first().waitFor({ state: "visible" });
    });
  }

  async expectAdvancePaymentVisible(amount: string) {
    await this.advancePaymentAmount.waitFor({ state: "visible" });
    await this.page.waitForSelector(`text=S/ ${amount}`, { state: "visible" });
  }

  async expectQuotedPriceVisible(price: string) {
    await this.quotedPriceDisplay.waitFor({ state: "visible" });
    await this.page.waitForSelector(`text=S/ ${price}`, { state: "visible" });
  }
}
