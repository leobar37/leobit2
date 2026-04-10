import { type Page, type Locator } from "@playwright/test";

export class SalesListPage {
  readonly page: Page;
  readonly url = "/ventas";

  // Locators
  readonly searchInput: Locator;
  readonly addButton: Locator;
  readonly salesList: Locator;
  readonly saleCards: Locator;
  readonly filterTodasButton: Locator;
  readonly filterBorradoresButton: Locator;
  readonly filterVentasButton: Locator;
  readonly filterPedidosButton: Locator;
  readonly emptyState: Locator;

  // Pagination
  readonly nextPageButton: Locator;
  readonly prevPageButton: Locator;
  readonly pageIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.locator('input[placeholder="Buscar venta..."]');
    this.addButton = page.locator('button:has([data-testid="lucide-plus"])').first();
    this.salesList = page.locator(".space-y-3").first();
    this.saleCards = this.salesList.locator('[class*="cursor-pointer"]');
    this.filterTodasButton = page.getByRole("button", { name: "Todas" });
    this.filterBorradoresButton = page.getByRole("button", { name: "Borradores" });
    this.filterVentasButton = page.getByRole("button", { name: "Ventas" });
    this.filterPedidosButton = page.getByRole("button", { name: "Pedidos" });
    this.emptyState = page.getByText("No hay ventas registradas");
    this.nextPageButton = page.getByRole("button", { name: /siguiente/i });
    this.prevPageButton = page.getByRole("button", { name: /anterior/i });
    this.pageIndicator = page.locator('[class*="text-sm"][class*="text-muted-foreground"]').first();
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url);
    await this.page.waitForLoadState("networkidle");
  }

  async expectLoaded(): Promise<void> {
    await this.searchInput.waitFor({ state: "visible" });
  }

  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(300);
  }

  async clickAdd(): Promise<void> {
    await this.addButton.click();
  }

  async clickSaleByIndex(index: number): Promise<void> {
    await this.saleCards.nth(index).click();
  }

  async getSaleCount(): Promise<number> {
    return this.saleCards.count();
  }

  async filterByTodas(): Promise<void> {
    await this.filterTodasButton.click();
  }

  async filterByBorradores(): Promise<void> {
    await this.filterBorradoresButton.click();
  }

  async filterByVentas(): Promise<void> {
    await this.filterVentasButton.click();
  }

  async filterByPedidos(): Promise<void> {
    await this.filterPedidosButton.click();
  }

  async expectEmptyState(): Promise<void> {
    await this.emptyState.waitFor({ state: "visible" });
  }

  async clickNextPage(): Promise<void> {
    await this.nextPageButton.click();
  }

  async clickPrevPage(): Promise<void> {
    await this.prevPageButton.click();
  }
}
