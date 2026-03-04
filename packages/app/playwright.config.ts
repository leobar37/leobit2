import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:5173";

export default defineConfig({
  testDir: "./e2e/tests",
  outputDir: "./e2e/test-results",
  fullyParallel: false, // Sequential execution required for ordered tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for sequential tests with shared state
  reporter: [["html", { outputFolder: "./e2e/playwright-report" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    // Auth setup project - runs first to authenticate
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    // Mobile Chrome tests - depend on auth setup
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 5"],
        storageState: "./e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
    // Mobile Safari tests - depend on auth setup
    {
      name: "mobile-safari",
      use: {
        ...devices["iPhone 12"],
        storageState: "./e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],
  webServer: process.env.WEB_SERVER
    ? {
        command: "cd ../backend && bun run db:reset && (bun run dev &) && cd ../app && bun run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 300000,
      }
    : undefined,
});
