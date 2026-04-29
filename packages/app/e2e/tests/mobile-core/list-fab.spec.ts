import { test, expect } from "@playwright/test";
import { LoginPage } from "../../page-objects/LoginPage";
import { MobileCorePage } from "../../page-objects/MobileCorePage";

test.describe("Mobile List FAB", () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login();
    await expect(page).toHaveURL("/dashboard");
  });

  test("customer list shows floating action button above bottom nav", async ({ page }) => {
    const mobile = new MobileCorePage(page);

    await page.goto("/clientes");
    await page.waitForLoadState("networkidle");

    await mobile.expectShellVisible();
    await mobile.expectBottomNavVisible();
    await mobile.expectFloatingActionsVisible();
    await mobile.expectFloatingActionsAboveNav();
  });

  test("floating action button is in viewport", async ({ page }) => {
    const mobile = new MobileCorePage(page);

    await page.goto("/clientes");
    await page.waitForLoadState("networkidle");

    await mobile.expectInViewport(mobile.floatingActions);
  });

  test("FAB navigates to new customer page on click", async ({ page }) => {
    const mobile = new MobileCorePage(page);

    await page.goto("/clientes");
    await page.waitForLoadState("networkidle");

    await mobile.expectFloatingActionsVisible();
    const fabButton = mobile.floatingActions.locator("button").first();
    await fabButton.click();

    await expect(page).toHaveURL("/clientes/nuevo");
  });
});
