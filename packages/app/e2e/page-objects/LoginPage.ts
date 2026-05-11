import type { Page } from "@playwright/test";
import { E2E_CREDENTIALS } from "../fixtures/seed-helper";

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/login");
    // Wait for page to be interactive
    await this.page.waitForLoadState("domcontentloaded");
  }

  async resetSession() {
    await this.page.context().clearCookies();
    await this.page.goto("/login");
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await this.page.waitForLoadState("domcontentloaded");
  }

  /**
   * Login using pre-filled dev credentials (in development mode)
   * Just clicks the login button since fields are pre-filled
   */
  async loginWithDevCredentials() {
    // Check if health drawer appears and close it
    const ignoreButton = this.page.getByRole("button", { name: /ignorar/i });
    if (await ignoreButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await ignoreButton.click();
      await this.page.waitForTimeout(500);
    }
    
    // Click login button (should be enabled with pre-filled credentials)
    const loginButton = this.page.getByRole("button", { name: /iniciar sesión/i });
    await loginButton.click();
    
    // Wait for redirect
    await this.page.waitForURL(/\/dashboard/, { timeout: 30000 });
  }

  async login(email: string = E2E_CREDENTIALS.email, password: string = E2E_CREDENTIALS.password) {
    // Get the input elements
    const emailInput = this.page.locator('input[name="email"]');
    const passwordInput = this.page.locator('input[name="password"]');
    
    // Wait for inputs to be visible
    await emailInput.waitFor({ state: "visible", timeout: 10000 });
    await passwordInput.waitFor({ state: "visible", timeout: 5000 });
    
    // Clear any existing values
    await emailInput.clear();
    await passwordInput.clear();
    
    // Fill with type to trigger React's synthetic events
    await emailInput.focus();
    await this.page.keyboard.type(email, { delay: 10 });
    
    await passwordInput.focus();
    await this.page.keyboard.type(password, { delay: 10 });
    
    // Tab out to trigger blur/change events
    await this.page.keyboard.press("Tab");
    
    // Wait for form validation to update
    await this.page.waitForTimeout(1000);
    
    // Check if health drawer appears and close it
    const ignoreButton = this.page.getByRole("button", { name: /ignorar/i });
    if (await ignoreButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await ignoreButton.click();
      await this.page.waitForTimeout(500);
    }
    
    // Check if button is now enabled
    const loginButton = this.page.getByRole("button", { name: /iniciar sesión/i });
    
    // If button is disabled, try clicking the input to trigger validation
    const isDisabled = await loginButton.isDisabled();
    if (isDisabled) {
      // Trigger validation by clicking on email input and tabbing through
      await emailInput.click();
      await this.page.keyboard.press("Tab");
      await this.page.waitForTimeout(500);
    }
    
    // Click login button
    await loginButton.click({ force: true });
    
    // Wait for redirect
    await this.page.waitForURL(/\/dashboard/, { timeout: 30000 });
  }

  async expectLoggedIn() {
    await this.page.waitForURL(/\/dashboard/);
  }
}
