import { test } from "@playwright/test";
import { LoginPage } from "../page-objects/LoginPage";
import { AguaPage } from "../page-objects/AguaPage";

test.setTimeout(60_000);

function futureMonday(): string {
  const date = new Date();
  const daysUntilMonday = (8 - date.getUTCDay()) % 7 || 7;
  const weekOffset = 40 + (Date.now() % 500);
  date.setUTCDate(date.getUTCDate() + daysUntilMonday + weekOffset * 7);
  return date.toISOString().slice(0, 10);
}

test("Agua Perú - ruta recurrente, entrega pagada y dashboard operativo", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login("agua@avileo.com", "agua123456");

  const aguaPage = new AguaPage(page);
  await aguaPage.expectRouteManagementAsAdmin();
  await aguaPage.expectWaterDashboard();
  await aguaPage.previewRoute(futureMonday(), "Ruta Norte", "seller");
  await aguaPage.generatePreviewedRoute();

  await loginPage.resetSession();
  await loginPage.login("repartidor.agua@avileo.com", "agua123456");
  await aguaPage.expectNoPolleriaLanguageInWaterOps();
  await aguaPage.completeFirstDelivery();
  await aguaPage.markFirstPendingAsNoAtendido();

  await loginPage.resetSession();
  await loginPage.login("agua@avileo.com", "agua123456");
  await aguaPage.expectWaterDashboard();
});

test("Agua Perú - repartidor puede autoasignarse y no administra rutas maestras", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login("repartidor.agua@avileo.com", "agua123456");

  const aguaPage = new AguaPage(page);
  await aguaPage.expectRouteManagementDeniedForSeller();
  await aguaPage.expectSelfAssignmentForSeller();
});
