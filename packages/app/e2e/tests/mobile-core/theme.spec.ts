import { test, expect } from "@playwright/test";
import { MobileCorePage } from "../../page-objects/MobileCorePage";

test.describe("Mobile Theme Persistence", () => {
  test("theme toggle cycles through modes on login page", async ({ page }) => {
    const mobile = new MobileCorePage(page);
    await page.goto("/login");
    await mobile.expectThemeToggleVisible();

    const initialTheme = await mobile.getCurrentTheme();
    expect(["light", "dark"]).toContain(initialTheme);

    await mobile.cycleTheme();
    const themeAfterFirstClick = await mobile.getCurrentTheme();
    expect(["light", "dark", "system"]).toContain(themeAfterFirstClick);

    await mobile.cycleTheme();
    const themeAfterSecondClick = await mobile.getCurrentTheme();
    expect(["light", "dark", "system"]).toContain(themeAfterSecondClick);
  });

  test("theme mode is persisted to localStorage", async ({ page }) => {
    const mobile = new MobileCorePage(page);
    await page.goto("/login");
    await mobile.expectThemeToggleVisible();

    await mobile.cycleTheme();
    const persistedMode = await mobile.getPersistedThemeMode();
    expect(persistedMode).toBeTruthy();
    expect(["system", "light", "dark"]).toContain(persistedMode);
  });

  test("persisted theme survives page reload", async ({ page }) => {
    const mobile = new MobileCorePage(page);
    await page.goto("/login");
    await mobile.expectThemeToggleVisible();

    await mobile.cycleTheme();
    const themeBeforeReload = await mobile.getCurrentTheme();
    const modeBeforeReload = await mobile.getPersistedThemeMode();

    await page.reload();
    await page.waitForLoadState("networkidle");
    await mobile.expectThemeToggleVisible();

    const themeAfterReload = await mobile.getCurrentTheme();
    const modeAfterReload = await mobile.getPersistedThemeMode();

    expect(modeAfterReload).toBe(modeBeforeReload);
    expect(themeAfterReload).toBe(themeBeforeReload);
  });

  test("theme toggle is visible on protected pages after login", async ({ page }) => {
    const mobile = new MobileCorePage(page);

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    const loginButton = page.getByRole("button", { name: /iniciar sesión/i });

    await emailInput.fill("demo@avileo.com");
    await passwordInput.fill("demo123456");
    await loginButton.click();
    await page.waitForURL("/dashboard", { timeout: 30000 });

    await mobile.expectThemeToggleVisible();

    await page.goto("/clientes");
    await page.waitForLoadState("networkidle");
    await mobile.expectThemeToggleVisible();
  });
});
