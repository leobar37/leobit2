import type { Page, Locator } from "@playwright/test";

export class RegisterPage {
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly errorRoot: Locator;

  constructor(private page: Page) {
    this.nameInput = page.getByTestId("input-name");
    this.emailInput = page.getByTestId("input-email");
    this.passwordInput = page.getByTestId("input-password");
    this.confirmPasswordInput = page.getByTestId("input-confirmPassword");
    this.submitButton = page.getByTestId("register-submit");
    this.errorRoot = page.getByTestId("register-error");
  }

  async goto() {
    await this.page.goto("/register");
  }

  async gotoWithInvitation(token: string) {
    await this.page.goto(`/register?token=${token}`);
  }

  async fillName(name: string) {
    await this.nameInput.fill(name);
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async fillConfirmPassword(password: string) {
    await this.confirmPasswordInput.fill(password);
  }

  async submit() {
    await this.submitButton.click();
  }

  async register(data: { name: string; email: string; password: string }) {
    await this.fillName(data.name);
    await this.fillEmail(data.email);
    await this.fillPassword(data.password);
    await this.fillConfirmPassword(data.password);
    await this.submit();
  }

  async getErrorRootText(): Promise<string | null> {
    return this.errorRoot.textContent();
  }

  async getFieldErrorText(field: "name" | "email" | "password" | "confirmPassword"): Promise<string | null> {
    const testId = `input-${field}`;
    const input = this.page.getByTestId(testId);
    // Error <p> is a sibling of the input inside the same parent div.space-y-2
    const parentDiv = input.locator("xpath=ancestor::div[contains(@class,'space-y-2')]");
    const errorP = parentDiv.locator("p.text-destructive");
    const isVisible = await errorP.isVisible().catch(() => false);
    if (!isVisible) return null;
    return errorP.textContent();
  }

  async isSubmitDisabled(): Promise<boolean> {
    return this.submitButton.isDisabled();
  }
}
