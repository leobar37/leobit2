import type { BrowserContext } from "@playwright/test";
import { createMockSignUpResponse, fulfillJSON } from "./route-helpers";

// ============================================================================
// Sign-Up Mock Helpers
// ============================================================================

export interface MockSignUpResult {
  wasCalled: () => boolean;
  getBody: () => Record<string, string> | null;
}

export interface MockSignUpSuccessOptions {
  /** Override the mock user fields */
  userOverrides?: Record<string, unknown>;
  /** Extra headers in the response */
  headers?: Record<string, string>;
}

/**
 * Mock the sign-up API to return a successful response.
 * Returns a tracker to verify the call was made and inspect the body.
 *
 * @example
 * ```ts
 * const signUp = mockSignUpSuccess(context);
 * await registerPage.register({ name: "Test", email: "t@t.com", password: "123456" });
 * expect(signUp.wasCalled()).toBe(true);
 * expect(signUp.getBody()?.email).toBe("t@t.com");
 * ```
 */
export function mockSignUpSuccess(
  context: BrowserContext,
  options: MockSignUpSuccessOptions = {},
): MockSignUpResult {
  let called = false;
  let body: Record<string, string> | null = null;

  context.route("**/api/auth/sign-up/email", async (route) => {
    called = true;
    body = route.request().postDataJSON();
    const response = createMockSignUpResponse(options.userOverrides);
    await fulfillJSON(route, response, 200, options.headers ?? {});
  });

  return {
    wasCalled: () => called,
    getBody: () => body,
  };
}

export interface MockSignUpErrorOptions {
  /** HTTP status code (default 400) */
  status?: number;
  /** Error code */
  code?: string;
  /** Error message */
  message?: string;
}

/**
 * Mock the sign-up API to return an error response.
 *
 * @example
 * ```ts
 * mockSignUpError(context, { message: "Email already exists" });
 * ```
 */
export function mockSignUpError(
  context: BrowserContext,
  options: MockSignUpErrorOptions = {},
) {
  const { status = 400, code = "SIGN_UP_ERROR", message = "Sign up failed" } = options;

  context.route("**/api/auth/sign-up/email", async (route) => {
    await fulfillJSON(route, { code, message }, status);
  });
}
