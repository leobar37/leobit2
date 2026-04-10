import { type Page, type Locator, expect } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly url = "/dashboard";

  // Stats cards
  readonly todaySalesCard: Locator;
  readonly todayRevenueCard: Locator;
  readonly pendingOrdersCard: Locator;
  readonly pendingDebtCard: Locator;

  // Quick actions
  readonly newSaleButton: Locator;
  readonly newOrderButton: Locator;
  readonly viewAllSalesLink: Locator;

  // Recent activity
  readonly recentSalesList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.todaySalesCard = page.getByTestId("stat-today-sales");
    this.todayRevenueCard = page.getByTestId("stat-today-revenue");
    this.pendingOrdersCard = page.getByTestId("stat-pending-orders");
    this.pendingDebtCard = page.getByTestId("stat-pending-debt");
    this.newSaleButton = page.getByTestId("quick-action-new-sale");
    this.newOrderButton = page.getByTestId("quick-action-new-order");
    this.viewAllSalesLink = page.getByTestId("view-all-sales");
    this.recentSalesList = page.getByTestId("recent-sales");
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url);
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.todaySalesCard).toBeVisible();
  }

  async clickNewSale(): Promise<void> {
    await this.newSaleButton.click();
  }

  async clickNewOrder(): Promise<void> {
    await this.newOrderButton.click();
  }

  async getTodaySalesCount(): Promise<number> {
    const text = await this.todaySalesCard.locator("span").first().textContent();
    return parseInt(text ?? "0");
  }

  async getTodayRevenue(): Promise<number> {
    const text = await this.todayRevenueCard.textContent();
    return parseFloat(text?.replace(/[^0-9.]/g, "") ?? "0");
  }
}
