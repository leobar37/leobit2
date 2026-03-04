import type { Page } from "@playwright/test";
import { E2E_CREDENTIALS } from "../fixtures/seed-helper";

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string = E2E_CREDENTIALS.email, password: string = E2E_CREDENTIALS.password) {
    await this.page.getByTestId("input-email").fill(email);
    await this.page.getByTestId("input-password").fill(password);
    await this.page.getByRole("button", { name: /iniciar sesión/i }).click();
    await this.page.waitForURL("/dashboard");
  }

  async expectLoggedIn() {
    await this.page.waitForURL("/dashboard");
  }
}
