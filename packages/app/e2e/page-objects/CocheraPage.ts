import { expect, type Page } from "@playwright/test";

export class CocheraPage {
  constructor(private page: Page) {}

  async gotoDashboard() {
    await this.page.goto("/dashboard");
    await this.page.waitForLoadState("domcontentloaded");
  }

  async gotoActiveSessions() {
    await this.page.goto("/cochera");
    await this.page.waitForLoadState("domcontentloaded");
  }

  async gotoEntry() {
    await this.page.goto("/cochera/entrada");
    await this.page.waitForLoadState("domcontentloaded");
  }

  async gotoConfig() {
    await this.page.goto("/config/cochera");
    await this.page.waitForLoadState("domcontentloaded");
  }

  async gotoReports() {
    await this.page.goto("/reportes");
    await this.page.waitForLoadState("domcontentloaded");
  }

  async expectDashboardActions(isAdmin = true) {
    await expect(this.page.getByTestId("cochera-dashboard-action-entry")).toBeVisible();
    await expect(this.page.getByTestId("cochera-dashboard-action-active")).toBeVisible();
    await expect(this.page.getByTestId("cochera-dashboard-action-reports")).toBeVisible();
    if (isAdmin) {
      await expect(this.page.getByTestId("cochera-dashboard-action-config")).toBeVisible();
    } else {
      await expect(this.page.getByTestId("cochera-dashboard-action-config")).toHaveCount(0);
    }
  }

  async createEntry(plate: string, vehicleType: "auto" | "moto" | "camioneta" = "auto") {
    await this.gotoEntry();
    await this.page.getByTestId(`cochera-vehicle-type-${vehicleType}`).click();
    await this.page.getByTestId("input-plate").fill(plate);
    await this.page.getByTestId("cochera-entry-submit").click();
  }

  async expectEntryError(text: RegExp | string) {
    await expect(this.page.getByTestId("cochera-entry-error")).toContainText(text);
  }

  async expectVehicleVisible(plate: string) {
    await expect(this.page.getByTestId(`cochera-vehicle-card-${plate}`)).toBeVisible();
  }

  async checkout(plate: string, paymentMethod: "efectivo" | "yape" | "plin" = "efectivo") {
    await this.gotoActiveSessions();
    await this.page.getByTestId(`cochera-checkout-link-${plate}`).click();
    await this.page.getByTestId(`cochera-payment-${paymentMethod}`).click();
    await this.page.getByTestId("cochera-checkout-submit").click();
    await expect(this.page).toHaveURL(/\/cochera$/);
  }

  async expectConfigEditable() {
    await expect(this.page.getByTestId("cochera-config-form")).toBeVisible();
    await expect(this.page.getByTestId("input-hourlyRate")).toBeVisible();
  }

  async expectConfigRestricted() {
    await expect(this.page.getByTestId("cochera-config-restricted")).toBeVisible();
  }

  async expectReportRow(plate: string) {
    await expect(this.page.getByTestId(`cochera-report-row-${plate}`)).toBeVisible();
  }
}
