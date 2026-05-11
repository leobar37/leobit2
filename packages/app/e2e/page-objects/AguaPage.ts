import { expect, type Page } from "@playwright/test";

export class AguaPage {
  constructor(private page: Page) {}

  async expectWaterDashboard() {
    await this.page.goto("/dashboard");
    await this.page.waitForLoadState("domcontentloaded");
    await expect(this.page.getByTestId("water-dashboard-revenue")).toBeVisible();
    await expect(this.page.getByTestId("water-dashboard-containers")).toBeVisible();
    await expect(this.page.getByTestId("water-dashboard-stops-completed")).toBeVisible();
    await expect(this.page.getByTestId("water-dashboard-stops-pending")).toBeVisible();
    await expect(this.page.getByText(/Deudores|Gastos Hoy|Kilos/)).toHaveCount(0);
  }

  async previewRoute(dateKey: string, routeName = "Ruta Norte", assignee: "self" | "seller" = "seller") {
    await this.page.goto(`/distribuciones/nueva?fecha=${dateKey}`);
    await this.page.waitForLoadState("domcontentloaded");
    await expect(this.page.getByText("Primero elige la ruta formal. Luego asigna quién hará la distribución de hoy.")).toBeVisible();
    if (assignee === "self") {
      await expect(this.page.getByText("Asignarme a mí")).toBeVisible();
      await this.page.getByText("Asignarme a mí").click();
    } else {
      await this.page.getByTestId("vendedor-select").click();
      await expect(this.page.getByPlaceholder("Buscar vendedor...")).toBeVisible();
      await this.page.getByTestId("vendedor-select-option").filter({ hasText: /Repartidor Agua|Vendedor/ }).first().click();
    }
    await this.selectWaterRoute(routeName);
    await this.page.getByTestId("water-route-preview-button").click();
    await expect(this.page.getByTestId("water-route-preview-customer").first()).toBeVisible();
  }

  async expectRouteManagementAsAdmin() {
    await this.page.goto("/config");
    await this.page.waitForLoadState("domcontentloaded");
    await expect(this.page.getByRole("link", { name: /Rutas de Agua/ })).toBeVisible();

    await this.page.goto("/config/water-routes");
    await this.page.waitForLoadState("domcontentloaded");
    await expect(this.page.getByRole("heading", { name: "Rutas de Agua" })).toBeVisible();
    await expect(this.page.getByRole("heading", { name: "Nueva ruta" })).toBeVisible();
    await expect(this.page.getByRole("heading", { name: "Rutas configuradas" })).toBeVisible();
    await expect(this.page.getByText("Repartidor")).toHaveCount(0);
  }

  async expectRouteManagementDeniedForSeller() {
    await this.page.goto("/config");
    await this.page.waitForLoadState("domcontentloaded");
    await expect(this.page.getByRole("link", { name: /Rutas de Agua/ })).toHaveCount(0);

    await this.page.goto("/config/water-routes");
    await this.page.waitForLoadState("domcontentloaded");
    await expect(this.page.getByText("La gestión de rutas está disponible para el dueño o administrador del negocio.")).toBeVisible();
  }

  async expectSelfAssignmentForSeller() {
    await this.page.goto("/distribuciones/nueva");
    await this.page.waitForLoadState("domcontentloaded");
    await expect(this.page.getByText("Asignarme a mí")).toBeVisible();
    await this.page.getByText("Asignarme a mí").click();
    await expect(this.page.getByTestId("vendedor-select")).toContainText("Yo (Vendedor)");
  }

  async generatePreviewedRoute() {
    await this.page.getByTestId("water-route-create-button").click();
    await expect(this.page).toHaveURL(/\/distribuciones/);
  }

  async completeFirstDelivery() {
    await this.page.goto("/mi-distribucion");
    await this.page.waitForLoadState("domcontentloaded");
    const stop = this.page.getByTestId("water-delivery-stop").first();
    await expect(stop).toBeVisible();

    const completeButton = stop.locator("[data-testid^='water-delivery-complete-']").first();
    if ((await completeButton.count()) === 0) {
      await expect(this.page.getByTestId("mobile-shell-content").getByText("Ventas")).toBeVisible();
      await expect(this.page.getByText("Total Recaudado")).toBeVisible();
      await expect(this.page.getByText("Bidones", { exact: true })).toBeVisible();
      return;
    }

    const stopId = await completeButton.getAttribute("data-testid");
    if (!stopId) throw new Error("No water delivery completion button found");
    const visitId = stopId.replace("water-delivery-complete-", "");

    await this.page.getByTestId(`water-product-select-${visitId}`).click();
    await expect(this.page.getByRole("option").filter({ hasText: /Bidón 20L/ }).first()).toBeVisible();
    await this.page.getByRole("option").filter({ hasText: /Bidón 20L/ }).first().click();
    await this.page.getByTestId(`water-payment-select-${visitId}`).click();
    await this.page.getByRole("option", { name: "Yape" }).click();
    await expect(this.page.getByTestId(`water-delivery-complete-${visitId}`)).toBeEnabled();
    await this.page.getByTestId(`water-delivery-complete-${visitId}`).click();
    await expect(stop.getByText(/entregado/i)).toBeVisible();
  }

  async markFirstPendingAsNoAtendido() {
    await this.page.goto("/mi-distribucion");
    await this.page.waitForLoadState("domcontentloaded");
    const noAtendido = this.page.getByTestId(/^water-delivery-no-atendido-/).first();
    if ((await noAtendido.count()) === 0) {
      await expect(this.page.getByText(/no atendió/i).first()).toBeVisible();
      return;
    }
    await expect(noAtendido).toBeVisible();
    await noAtendido.click();
    await expect(this.page.getByText(/no atendió/i).first()).toBeVisible();
  }

  async expectNoPolleriaLanguageInWaterOps() {
    await this.page.goto("/mi-distribucion");
    await this.page.waitForLoadState("domcontentloaded");
    await expect(this.page.getByText("Modo Libre")).toHaveCount(0);
    await expect(this.page.getByText(/Compró|No compró|Kilos|Tara/i)).toHaveCount(0);
    await expect(this.page.getByText(/Entregas de agua|Ruta de hoy/).first()).toBeVisible();
  }

  private async selectWaterRoute(routeName: string) {
    await this.page.getByTestId("water-route-selector").click();
    await expect(this.page.getByRole("heading", { name: "Seleccionar ruta" })).toBeVisible();
    await expect(this.page.getByPlaceholder("Buscar ruta...")).toBeVisible();
    const routeOption = this.page.getByTestId("water-route-selector-option").filter({ hasText: routeName }).first();
    await expect(routeOption).toBeVisible();
    await routeOption.click();
    await expect(this.page.getByTestId("water-route-selector")).toContainText(routeName);
  }
}
