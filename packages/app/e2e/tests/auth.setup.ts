import { test as setup, expect, devices } from "@playwright/test";
import { LoginPage } from "../page-objects/LoginPage";
import { E2E_CREDENTIALS } from "../fixtures/seed-helper";

const authFile = "./e2e/.auth/user.json";

// Use Pixel 5 viewport for auth setup to match test projects
setup.use({
  ...devices["Pixel 5"],
});

setup("authenticate", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(E2E_CREDENTIALS.email, E2E_CREDENTIALS.password);
  await expect(page).toHaveURL("/dashboard");
  await page.context().storageState({ path: authFile });
});
