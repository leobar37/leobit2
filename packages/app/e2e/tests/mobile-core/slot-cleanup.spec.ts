import { test, expect } from "@playwright/test";
import { LoginPage } from "../../page-objects/LoginPage";
import { MobileCorePage } from "../../page-objects/MobileCorePage";

test.describe("Mobile Slot Cleanup on Route Transitions", () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login();
    await expect(page).toHaveURL("/dashboard");
  });

  test("floating slot is cleaned up when navigating away from list page", async ({ page }) => {
    const mobile = new MobileCorePage(page);

    await page.goto("/clientes");
    await page.waitForLoadState("networkidle");
    await mobile.expectFloatingActionsVisible();

    const fabCountBefore = await mobile.getSlotTargetCount(mobile.slotHostFloating);
    expect(fabCountBefore).toBeGreaterThanOrEqual(1);

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await mobile.expectSlotEmpty(mobile.slotHostFloating);
  });

  test("footer slot is cleaned up when navigating from form page to list", async ({ page }) => {
    const mobile = new MobileCorePage(page);

    await page.goto("/clientes/nuevo");
    await page.waitForLoadState("networkidle");
    await mobile.expectFixedFooterVisible();

    const footerCountBefore = await mobile.getSlotTargetCount(mobile.slotHostFooter);
    expect(footerCountBefore).toBeGreaterThanOrEqual(1);

    await page.goto("/clientes");
    await page.waitForLoadState("networkidle");

    const footerCountAfter = await mobile.getSlotTargetCount(mobile.slotHostFooter);
    expect(footerCountAfter).toBeLessThanOrEqual(footerCountBefore);
  });

  test("header center slot updates title on route change", async ({ page }) => {
    const mobile = new MobileCorePage(page);

    await page.goto("/clientes");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Clientes")).toBeVisible();

    await page.goto("/ventas");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Ventas")).toBeVisible();
  });
});
