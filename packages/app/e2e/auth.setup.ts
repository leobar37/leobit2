/**
 * Auth Setup for E2E Tests
 *
 * This file handles authentication setup before running tests.
 * For MSW mode, it creates a mock authenticated session.
 * For real backend mode, it logs in with the demo user.
 */

import { test as setup, expect } from "@playwright/test";
import { mkdir } from "fs/promises";
import { dirname } from "path";

const authFile = "e2e/.auth/user.json";
const useMSW = process.env.USE_MSW === "1";

setup("authenticate", async ({ page }) => {
  // Ensure auth directory exists
  await mkdir(dirname(authFile), { recursive: true });

  if (useMSW) {
    // For MSW mode, create mock auth state directly
    const mockAuthState = {
      cookies: [],
      origins: [
        {
          origin: "http://localhost:4173",
          localStorage: [
            {
              name: "better-auth-session",
              value: JSON.stringify({
                token: "mock-jwt-token",
                user: {
                  id: "user-demo",
                  email: "demo@avileo.com",
                  name: "Usuario Demo",
                },
              }),
            },
          ],
        },
      ],
    };

    // Write mock auth state to file
    const fs = await import("fs/promises");
    await fs.writeFile(authFile, JSON.stringify(mockAuthState, null, 2));

    // Verify we can navigate to dashboard
    await page.goto("/dashboard");
    await expect(page.locator("text=Nueva Venta")).toBeVisible({ timeout: 10000 });
  } else {
    // For real backend mode, perform actual login
    // Navigate to login page
    await page.goto("/login");

    // Wait for the login form to be visible
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    // Fill in credentials from seeder
    await page.fill('input[type="email"]', "demo@avileo.com");
    await page.fill('input[type="password"]', "demo123456");

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL("/dashboard", { timeout: 15000 });

    // Verify we're logged in by checking for dashboard elements
    await expect(page.locator("text=Nueva Venta")).toBeVisible({ timeout: 10000 });

    // Save the storage state (cookies, localStorage, sessionStorage)
    await page.context().storageState({ path: authFile });
  }
});
