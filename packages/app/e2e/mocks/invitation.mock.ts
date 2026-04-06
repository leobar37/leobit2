import type { BrowserContext } from "@playwright/test";
import { createMockInvitationData, fulfillJSON } from "./route-helpers";

// ============================================================================
// Invitation Mock Helpers
// ============================================================================

/**
 * Mock the invitation validation API to return a valid invitation.
 *
 * @example
 * ```ts
 * mockInvitationValid(context);
 * await registerPage.gotoWithInvitation("valid-token-123");
 * await expect(page.getByText("Unirme a un negocio")).toBeVisible();
 * ```
 */
export function mockInvitationValid(
  context: BrowserContext,
  overrides: Record<string, unknown> = {},
) {
  const data = createMockInvitationData(overrides);

  context.route("**/public/invitations/**", async (route) => {
    await fulfillJSON(route, { success: true, data });
  });
}

/**
 * Mock the invitation validation API to return an invalid/expired token error.
 *
 * @example
 * ```ts
 * mockInvitationInvalid(context);
 * await registerPage.gotoWithInvitation("expired-token");
 * await expect(page.getByText("Invitación no válida")).toBeVisible();
 * ```
 */
export function mockInvitationInvalid(context: BrowserContext) {
  context.route("**/public/invitations/**", async (route) => {
    await fulfillJSON(route, { success: false, error: "Token inválido" }, 404);
  });
}
