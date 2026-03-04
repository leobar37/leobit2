import type { Page, Locator } from "@playwright/test";

export class CobrosPage {
  readonly abonoMontoInput: Locator;
  readonly saveAbonoButton: Locator;

  constructor(private page: Page) {
    this.abonoMontoInput = page.getByTestId("abono-monto-input");
    this.saveAbonoButton = page.getByTestId("save-abono-button");
  }

  async goto() {
    await this.page.goto("/cobros");
  }

  async selectCustomerWithDebt(customerId: string) {
    await this.page.getByTestId(`cliente-deuda-row-${customerId}`).click();
  }

  async registerAbono(amount: string, method: "efectivo" | "yape" | "plin" | "transferencia" = "efectivo") {
    await this.abonoMontoInput.fill(amount);
    // Select payment method
    await this.page.click(`text=${method.charAt(0).toUpperCase() + method.slice(1)}`);
    await this.saveAbonoButton.click();
  }

  async expectAbonoRegistered() {
    // Should redirect to client page or cobros
    await this.page.waitForURL(/\/(cobros|clientes)/);
  }

  async expectRemainingDebt(expectedDebt: string) {
    await this.page.waitForSelector(`text=${expectedDebt}`);
  }
}
