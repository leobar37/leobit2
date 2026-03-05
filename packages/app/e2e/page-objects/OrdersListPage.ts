import type { Page, Locator } from "@playwright/test";

export class OrdersListPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly addOrderButton: Locator;
  readonly ordersList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.locator('input[placeholder*="Buscar pedido"]');
    this.addOrderButton = page.locator('a[href="/pedidos/nuevo"], button:has-text("Nuevo pedido")');
    this.ordersList = page.getByTestId("order-card");
  }

  async goto() {
    await this.page.goto("/pedidos");
  }

  async searchOrder(customerName: string) {
    await this.searchInput.fill(customerName);
    await this.page.waitForTimeout(300); // Wait for filter to apply
  }

  async clickAddOrder() {
    await this.addOrderButton.click();
  }

  async clickOrderByCustomer(customerName: string) {
    const orderCard = this.page
      .getByTestId("order-card")
      .filter({ has: this.page.getByTestId("order-card-customer").getByText(customerName) });
    await orderCard.click();
  }

  async clickOrderByStatus(status: "draft" | "confirmed" | "delivered" | "cancelled") {
    const orderCard = this.page
      .getByTestId("order-card")
      .filter({ has: this.page.getByTestId("order-card-status") })
      .first();
    await orderCard.click();
  }

  async getOrderCard(customerName: string): Promise<Locator> {
    return this.page
      .getByTestId("order-card")
      .filter({ has: this.page.getByTestId("order-card-customer").getByText(customerName) });
  }

  async expectOrderVisible(customerName: string) {
    const orderCard = await this.getOrderCard(customerName);
    await orderCard.waitFor({ state: "visible" });
  }

  async expectOrderStatus(customerName: string, status: string) {
    const orderCard = await this.getOrderCard(customerName);
    const statusBadge = orderCard.getByTestId("order-card-status");
    await statusBadge.getByText(status).waitFor({ state: "visible" });
  }

  async filterByStatus(status: "Todos" | "Borradores" | "Confirmados" | "Entregados" | "Cancelados") {
    await this.page.getByRole("button", { name: status }).click();
  }

  async expectEmptyState() {
    await this.page.waitForSelector("text=No hay pedidos");
  }
}
