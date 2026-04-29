import { test, expect } from "@playwright/test";
import { LoginPage } from "../../page-objects/LoginPage";
import { MobileCorePage } from "../../page-objects/MobileCorePage";

test.describe("Mobile Protected Shell", () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login();
    await expect(page).toHaveURL("/dashboard");
  });

  test("dashboard renders protected shell with bottom nav", async ({ page }) => {
    const mobile = new MobileCorePage(page);

    await mobile.expectShellVisible();
    await mobile.expectHeaderVisible();
    await mobile.expectContentVisible();
    await mobile.expectBottomNavVisible();
    await mobile.expectThemeToggleVisible();

    const shellVariant = await mobile.shellRoot.getAttribute("data-variant");
    expect(shellVariant).toBe("protected");
  });

  test("header slot hosts are present in protected shell", async ({ page }) => {
    const mobile = new MobileCorePage(page);

    await expect(mobile.slotHostHeaderLeft).toBeVisible();
    await expect(mobile.slotHostHeaderCenter).toBeVisible();
    await expect(mobile.slotHostHeaderRight).toBeVisible();
  });

  test("bottom nav is in viewport on protected pages", async ({ page }) => {
    const mobile = new MobileCorePage(page);
    await mobile.expectInViewport(mobile.bottomNav);
  });

  test("navigating between protected routes keeps shell intact", async ({ page }) => {
    const mobile = new MobileCorePage(page);

    await page.goto("/ventas");
    await page.waitForLoadState("networkidle");
    await mobile.expectShellVisible();
    await mobile.expectBottomNavVisible();

    await page.goto("/clientes");
    await page.waitForLoadState("networkidle");
    await mobile.expectShellVisible();
    await mobile.expectBottomNavVisible();

    await page.goto("/cobros");
    await page.waitForLoadState("networkidle");
    await mobile.expectShellVisible();
    await mobile.expectBottomNavVisible();
  });
});
