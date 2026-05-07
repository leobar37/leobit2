import { expect, test } from "@playwright/test";
import { LoginPage } from "../page-objects/LoginPage";
import { CocheraPage } from "../page-objects/CocheraPage";
import {
  COCHERA_ADMIN_USER,
  COCHERA_FIXTURES,
  COCHERA_OPERATOR_USER,
} from "../fixtures/cochera-test-data";

test.describe("Avileo Cocheras", () => {
  test("admin validates seeded settings, vehicle entry, duplicate prevention, checkout, dashboard, and reports", async ({ page }) => {
    const loginPage = new LoginPage(page);
    const cocheraPage = new CocheraPage(page);
    const uniquePlate = `QA-${Date.now().toString().slice(-6)}`;

    await loginPage.goto();
    await loginPage.login(COCHERA_ADMIN_USER.email, COCHERA_ADMIN_USER.password);

    await cocheraPage.gotoDashboard();
    await cocheraPage.expectDashboardActions(true);
    await expect(page.getByTestId("cochera-dashboard-entries-today")).toBeVisible();

    await cocheraPage.gotoConfig();
    await cocheraPage.expectConfigEditable();
    await expect(page.getByTestId("input-hourlyRate")).toHaveValue(COCHERA_FIXTURES.hourlyRate);
    await expect(page.getByTestId("input-graceMinutes")).toHaveValue(COCHERA_FIXTURES.graceMinutes);
    await expect(page.getByTestId("input-totalSpaces")).toHaveValue(COCHERA_FIXTURES.totalSpaces);

    await cocheraPage.gotoActiveSessions();
    await cocheraPage.expectVehicleVisible(COCHERA_FIXTURES.activePlate);

    await cocheraPage.createEntry(uniquePlate, "auto");
    await expect(page).toHaveURL(/\/cochera$/);
    await cocheraPage.expectVehicleVisible(uniquePlate);

    await cocheraPage.createEntry(uniquePlate, "auto");
    await cocheraPage.expectEntryError(/ya se encuentra dentro/i);

    await cocheraPage.checkout(uniquePlate, "efectivo");
    await expect(page.getByTestId(`cochera-vehicle-card-${uniquePlate}`)).toHaveCount(0);

    await cocheraPage.gotoReports();
    await cocheraPage.expectReportRow(uniquePlate);
    await cocheraPage.expectReportRow(COCHERA_FIXTURES.completedPlate);
  });

  test("vendedor can operate cochera flow but cannot edit cochera settings", async ({ page }) => {
    const loginPage = new LoginPage(page);
    const cocheraPage = new CocheraPage(page);
    const uniquePlate = `OP-${Date.now().toString().slice(-6)}`;

    await loginPage.goto();
    await loginPage.login(COCHERA_OPERATOR_USER.email, COCHERA_OPERATOR_USER.password);

    await cocheraPage.gotoDashboard();
    await cocheraPage.expectDashboardActions(false);

    await cocheraPage.gotoConfig();
    await cocheraPage.expectConfigRestricted();

    await cocheraPage.createEntry(uniquePlate, "moto");
    await expect(page).toHaveURL(/\/cochera$/);
    await cocheraPage.expectVehicleVisible(uniquePlate);
  });
});
