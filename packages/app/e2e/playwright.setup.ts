// @ts-nocheck - E2E test setup file
/**
 * Playwright Setup - Injects MSW into browser context
 *
 * This file runs before tests and injects MSW handlers into all browser pages.
 * It also sets up mock authentication state.
 */

import { test as setup, expect } from "@playwright/test";
import { handlers } from "./mocks";

setup("inject MSW handlers", async ({ page }) => {
  // Set up mock authentication state before MSW starts
  await page.addInitScript(() => {
    // Set mock auth session in localStorage
    const mockSession = {
      user: {
        id: "user-demo",
        email: "demo@avileo.com",
        name: "Usuario Demo",
        emailVerified: true,
        image: null,
      },
      session: {
        id: "session-1",
        userId: "user-demo",
        token: "mock-jwt-token",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    };

    localStorage.setItem("better-auth-session", JSON.stringify(mockSession));
    localStorage.setItem("current_business_id", "biz-1");
    localStorage.setItem("current_business_user_id", "biz-user-1");

    console.log("[E2E] Mock auth state set");
  });

  // Add MSW as init script - this runs in browser context
  await page.addInitScript(async () => {
    // @ts-expect-error - MSW types not available in browser
    const { setupWorker } = await import("msw/browser");
    // @ts-expect-error - handlers not typed for browser
    const { handlers } = await import("./mocks");

    const worker = setupWorker(...handlers);
    await worker.start({
      onUnhandledRequest: "bypass",
      quiet: true,
    });

    console.log("[MSW] Worker started in browser context");
  });
});
