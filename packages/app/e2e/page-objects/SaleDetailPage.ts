import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

export class SaleDetailPage {
  readonly page: Page;

  // Headers and info
  readonly title: Locator;
  readonly statusBadge: Locator;
  readonly totalAmount: Locator;
  readonly amountPaid: Locator;
  readonly balanceDue: Locator;

  // Actions
  readonly editButton: Locator;
  readonly cancelButton: Locator;
  readonly confirmButton: Locator;

  // Items
  readonly itemsList: Locator;
  readonly addItemButton: Locator;

  // Customer
  readonly customerInfo: Locator;
  readonly changeCustomerButton: Locator;

  // Token section
  readonly tokenSection: Locator;
  readonly generateTokenButton: Locator;
  readonly tokenValue: Locator;
  readonly copyTokenButton: Locator;

  // Cancellation modal
  readonly cancelModal: Locator;
  readonly cancelReasonInput: Locator;
  readonly confirmCancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.getByRole("heading", { level: 1 });
    this.statusBadge = page.getByTestId("sale-status");
    this.totalAmount = page.getByTestId("total-amount");
    this.amountPaid = page.getByTestId("amount-paid");
    this.balanceDue = page.getByTestId("balance-due");
    this.editButton = page.getByRole("button", { name: /editar/i });
    this.cancelButton = page.getByRole("button", { name: /cancelar/i });
    this.confirmButton = page.getByRole("button", { name: /confirmar/i });
    this.itemsList = page.getByTestId("sale-items");
    this.addItemButton = page.getByTestId("add-item-button");
    this.customerInfo = page.getByTestId("customer-info");
    this.changeCustomerButton = page.getByTestId("change-customer");
    this.tokenSection = page.getByTestId("token-section");
    this.generateTokenButton = page.getByTestId("generate-token");
    this.tokenValue = page.getByTestId("token-value");
    this.copyTokenButton = page.getByTestId("copy-token");
    this.cancelModal = page.getByTestId("cancel-modal");
    this.cancelReasonInput = page.getByTestId("cancel-reason");
    this.confirmCancelButton = page.getByTestId("confirm-cancel");
  }

  async goto(saleId: string): Promise<void> {
    await this.page.goto(`/ventas/${saleId}`);
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.title).toBeVisible();
  }

  async cancel(reason: string, refundMethod?: string): Promise<void> {
    await this.cancelButton.click();
    await this.cancelModal.waitFor({ state: "visible" });
    await this.cancelReasonInput.fill(reason);
    await this.confirmCancelButton.click();
  }

  async generateToken(): Promise<string> {
    await this.generateTokenButton.click();
    await expect(this.tokenValue).toBeVisible();
    return (await this.tokenValue.textContent()) ?? "";
  }

  async getStatus(): Promise<string> {
    return (await this.statusBadge.textContent()) ?? "";
  }

  async getTotal(): Promise<number> {
    const text = await this.totalAmount.textContent();
    return parseFloat(text?.replace(/[^0-9.]/g, "") ?? "0");
  }
}
