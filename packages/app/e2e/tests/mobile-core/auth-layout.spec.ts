import { test, expect } from "@playwright/test";
import { MobileCorePage } from "../../page-objects/MobileCorePage";
import { RegisterPage } from "../../page-objects/RegisterPage";

test.describe("Mobile Auth Pages Layout", () => {
  test("login page renders mobile shell without bottom nav", async ({ page }) => {
    const mobile = new MobileCorePage(page);

    await page.goto("/login");
    await mobile.expectShellVisible();
    await mobile.expectHeaderVisible();
    await mobile.expectContentVisible();
    await mobile.expectThemeToggleVisible();
    await mobile.expectBottomNavHidden();
    await mobile.expectFixedFooterVisible();

    const shellVariant = await mobile.shellRoot.getAttribute("data-variant");
    expect(shellVariant).toBe("public");
  });

  test("register page renders mobile shell without bottom nav", async ({ page }) => {
    const mobile = new MobileCorePage(page);

    await page.goto("/register");
    await mobile.expectShellVisible();
    await mobile.expectHeaderVisible();
    await mobile.expectContentVisible();
    await mobile.expectThemeToggleVisible();
    await mobile.expectBottomNavHidden();
    await mobile.expectFixedFooterVisible();

    const shellVariant = await mobile.shellRoot.getAttribute("data-variant");
    expect(shellVariant).toBe("public");
  });

  test("login page fixed footer is in viewport", async ({ page }) => {
    const mobile = new MobileCorePage(page);
    await page.goto("/login");
    await mobile.expectInViewport(mobile.fixedFooter);
  });

  test("register page fixed footer is in viewport", async ({ page }) => {
    const mobile = new MobileCorePage(page);
    await page.goto("/register");
    await mobile.expectInViewport(mobile.fixedFooter);
  });

  test("register password fields can be completed with the fixed footer visible", async ({ page }) => {
    const mobile = new MobileCorePage(page);
    const registerPage = new RegisterPage(page);

    await page.goto("/register");
    await mobile.expectFixedFooterVisible();

    await registerPage.fillName("Usuario Test");
    await registerPage.fillEmail("test@example.com");
    await registerPage.fillPassword("password123");
    await registerPage.fillConfirmPassword("password123");

    await expect(registerPage.passwordInput).toHaveValue("password123");
    await expect(registerPage.confirmPasswordInput).toHaveValue("password123");
    await expect(registerPage.submitButton).toBeEnabled();
  });
});
