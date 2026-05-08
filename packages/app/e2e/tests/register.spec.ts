import { test, expect } from "@playwright/test";
import { RegisterPage } from "../page-objects/RegisterPage";
import { mockSignUpSuccess, mockSignUpError } from "../mocks/auth.mock";
import { mockInvitationValid, mockInvitationInvalid } from "../mocks/invitation.mock";

test.describe("Register", () => {
  let registerPage: RegisterPage;

  test.beforeEach(({ page }) => {
    registerPage = new RegisterPage(page);
  });

  // ==========================================================================
  // Happy Path
  // ==========================================================================

  test("sign-up form submits and calls the API", async ({ page, context }) => {
    const signUp = mockSignUpSuccess(context);

    await registerPage.goto();
    await registerPage.register({
      name: "Test User",
      email: "newuser@avileo.com",
      password: "password123",
    });

    expect(signUp.wasCalled()).toBe(true);
    expect(signUp.getBody()?.email).toBe("newuser@avileo.com");
    expect(signUp.getBody()?.name).toBe("Test User");
    expect(signUp.getBody()?.password).toBe("password123");
  });

  // ==========================================================================
  // Form Validation
  // ==========================================================================

  test("invalid email shows error", async () => {
    await registerPage.goto();
    await registerPage.fillEmail("not-an-email");
    await registerPage.fillName("Test"); // trigger onChange validation on other field
    await registerPage.fillPassword("password123");
    await registerPage.fillConfirmPassword("password123");

    const errorText = await registerPage.getFieldErrorText("email");
    expect(errorText).toContain("inválido");
  });

  test("password shorter than 6 characters shows error", async () => {
    await registerPage.goto();
    await registerPage.fillName("Test User");
    await registerPage.fillEmail("test@test.com");
    await registerPage.fillPassword("12345");
    await registerPage.fillConfirmPassword("12345");

    const errorText = await registerPage.getFieldErrorText("password");
    expect(errorText).toContain("6");
  });

  test("passwords not matching shows error", async () => {
    await registerPage.goto();
    await registerPage.fillName("Test User");
    await registerPage.fillEmail("test@test.com");
    await registerPage.fillPassword("password123");
    await registerPage.fillConfirmPassword("different");

    const errorText = await registerPage.getFieldErrorText("confirmPassword");
    expect(errorText).toContain("coinciden");
  });

  test("name shorter than 2 characters shows error", async () => {
    await registerPage.goto();
    await registerPage.fillName("A");
    await registerPage.fillEmail("test@test.com");
    await registerPage.fillPassword("password123");
    await registerPage.fillConfirmPassword("password123");

    const errorText = await registerPage.getFieldErrorText("name");
    expect(errorText).toContain("2");
  });

  test("submit is disabled with invalid form", async () => {
    await registerPage.goto();
    // Only fill email, leave rest empty - form should be invalid
    await registerPage.fillEmail("test@test.com");

    const isDisabled = await registerPage.isSubmitDisabled();
    expect(isDisabled).toBe(true);
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  test("server error shows error message", async ({ page, context }) => {
    mockSignUpError(context, {
      message: "Este correo ya está registrado. Usa otro correo o inicia sesión.",
    });

    await registerPage.goto();
    await registerPage.register({
      name: "Test User",
      email: "existing@avileo.com",
      password: "password123",
    });

    await expect(registerPage.errorRoot).toBeVisible({ timeout: 5000 });
    const errorText = await registerPage.getErrorRootText();
    expect(errorText).toBeTruthy();
  });

  // ==========================================================================
  // Invitation Flow
  // ==========================================================================

  test("register with valid invitation shows invitation UI", async ({ page, context }) => {
    mockInvitationValid(context);

    await registerPage.gotoWithInvitation("valid-token-123");

    await expect(page.getByText("Unirme a un negocio")).toBeVisible({ timeout: 5000 });
    await expect(registerPage.submitButton).toBeVisible();
  });

  test("register with invalid token shows warning but allows registration", async ({ page, context }) => {
    mockInvitationInvalid(context);

    await registerPage.gotoWithInvitation("invalid-token");

    await expect(page.getByText("Invitación no válida")).toBeVisible({ timeout: 5000 });
    await expect(registerPage.submitButton).toBeVisible();
  });

  // ==========================================================================
  // Navigation
  // ==========================================================================

  test("login link navigates to /login", async ({ page }) => {
    await registerPage.goto();
    await page.getByRole("link", { name: /inicia sesión/i }).click();
    await expect(page).toHaveURL("/login");
  });
});
