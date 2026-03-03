import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Configuration for Avileo E2E Tests
 * @see https://playwright.dev/docs/test-configuration
 *
 * Environment variables:
 * - HEADED=1: Run tests with visible browser (for debugging)
 * - WEB_SERVER=1: Start web server before tests (uses real backend)
 * - CI: Running in CI environment (enables retries, disables webServer reuse)
 */

const isHeaded = process.env.HEADED === "1";
const useWebServer = process.env.WEB_SERVER === "1";

export default defineConfig({
  testDir: "./e2e",

  /* Run tests in files in parallel */
  fullyParallel: false,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: 1,

  /* Reporter to use */
  reporter: [["list"], ["html", { open: "never" }]],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: "http://localhost:5173",

    /* Run in headless mode by default (no browser window) */
    headless: !isHeaded,

    /* Collect trace when retrying the failed test */
    trace: "on-first-retry",

    /* Screenshot on failure */
    screenshot: "only-on-failure",

    /* Video on failure */
    video: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
    // Mobile viewport for testing responsive design
    {
      name: "Mobile Chrome",
      use: {
        ...devices["Pixel 5"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],

  /* Run local dev server before starting the tests (only if WEB_SERVER=1) */
  ...(useWebServer && {
    webServer: {
      command: "cd /Users/leobar37/code/avileo && bun run dev",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  }),
});
