import { test, expect } from "@playwright/test";
import { LoginPage } from "../../page-objects/LoginPage";
import { MobileCorePage } from "../../page-objects/MobileCorePage";

test.describe("Mobile Form Footer", () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login();
    await expect(page).toHaveURL("/dashboard");
  });

  test("new customer page shows fixed footer above bottom nav without overlap", async ({ page }) => {
    const mobile = new MobileCorePage(page);

    await page.goto("/clientes/nuevo");
    await page.waitForLoadState("networkidle");

    await mobile.expectShellVisible();
    await mobile.expectHeaderVisible();
    await mobile.expectBottomNavVisible();
    await mobile.expectFixedFooterVisible();
    await mobile.expectFooterDoesNotOverlapNav();

    const shellVariant = await mobile.shellRoot.getAttribute("data-variant");
    expect(shellVariant).toBe("protected");
  });

  test("form footer stays in viewport while typing", async ({ page }) => {
    const mobile = new MobileCorePage(page);

    await page.goto("/clientes/nuevo");
    await page.waitForLoadState("networkidle");

    const nameInput = page.locator('input[name="name"]');
    await nameInput.focus();
    await page.waitForTimeout(500);

    await mobile.expectFixedFooterVisible();
    await mobile.expectInViewport(mobile.fixedFooter);
  });
});
