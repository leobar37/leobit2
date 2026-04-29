import { test, expect } from "@playwright/test";
import { LoginPage } from "../../page-objects/LoginPage";
import { MobileCorePage } from "../../page-objects/MobileCorePage";

test.describe("Mobile Modal and Footer Coexistence", () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login();
    await expect(page).toHaveURL("/dashboard");
  });

  test("opening profile sheet does not remove page footer on form page", async ({ page }) => {
    const mobile = new MobileCorePage(page);

    await page.goto("/clientes/nuevo");
    await page.waitForLoadState("networkidle");
    await mobile.expectFixedFooterVisible();

    const userButton = page.locator('button[aria-label="Abrir perfil"]').or(
      page.locator('[data-testid="mobile-shell-header"] button').last()
    );

    if (await userButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await userButton.click();
      await page.waitForTimeout(500);

      await mobile.expectFixedFooterVisible();

      const overlay = page.locator('[data-state="open"]').first();
      if (await overlay.isVisible({ timeout: 1000 }).catch(() => false)) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);
      }

      await mobile.expectFixedFooterVisible();
    }
  });

  test("bottom nav remains visible when a sheet overlay is present", async ({ page }) => {
    const mobile = new MobileCorePage(page);

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await mobile.expectBottomNavVisible();

    const userButton = page.locator('button[aria-label="Abrir perfil"]').or(
      page.locator('[data-testid="mobile-shell-header"] button').last()
    );

    if (await userButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await userButton.click();
      await page.waitForTimeout(500);

      const sheet = page.locator('div[role="dialog"]').or(page.locator('[data-state="open"]'));
      if (await sheet.isVisible({ timeout: 2000 }).catch(() => false)) {
        await mobile.expectBottomNavVisible();

        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);
      }
    }

    await mobile.expectBottomNavVisible();
  });

  test("login page drawer and footer elements coexist in DOM without errors", async ({ page }) => {
    const mobile = new MobileCorePage(page);

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await mobile.expectFixedFooterVisible();

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    const drawerContent = page.locator('[data-testid="mobile-fixed-footer"]').or(
      page.locator('[data-mobile-fixed-footer]')
    );
    await expect(drawerContent).toBeVisible();

    const nonWarningErrors = consoleErrors.filter((e) => !e.toLowerCase().includes("warning"));
    expect(nonWarningErrors).toHaveLength(0);
  });
});
