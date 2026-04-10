import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

export class PublicSalePage {
  readonly page: Page;

  // Sale info
  readonly title: Locator;
  readonly saleDetails: Locator;
  readonly itemsList: Locator;
  readonly totalAmount: Locator;
  readonly statusBadge: Locator;

  // Customer info
  readonly businessName: Locator;
  readonly sellerInfo: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.getByRole("heading", { level: 1 });
    this.saleDetails = page.getByTestId("sale-details");
    this.itemsList = page.getByTestId("sale-items");
    this.totalAmount = page.getByTestId("total-amount");
    this.statusBadge = page.getByTestId("sale-status");
    this.businessName = page.getByTestId("business-name");
    this.sellerInfo = page.getByTestId("seller-info");
  }

  async goto(token: string): Promise<void> {
    await this.page.goto(`/public/sale/${token}`);
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.saleDetails).toBeVisible();
  }

  async getTotal(): Promise<number> {
    const text = await this.totalAmount.textContent();
    return parseFloat(text?.replace(/[^0-9.]/g, "") ?? "0");
  }

  async getStatus(): Promise<string> {
    return (await this.statusBadge.textContent()) ?? "";
  }

  async getItemCount(): Promise<number> {
    return this.itemsList.locator('[data-testid="sale-item"]').count();
  }
}
