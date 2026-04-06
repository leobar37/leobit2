import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Configuration for E2E Tests with MSW (Mock Service Worker)
 *
 * This configuration runs tests against a static build with MSW enabled,
 * eliminating the need for a running backend server.
 *
 * Usage: bun run test:e2e:msw
 */

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
    baseURL: "http://localhost:4173",

    /* Run in headless mode by default */
    headless: true,

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
    // Register tests - no auth state (unauthenticated user)
    {
      name: "register",
      testMatch: /register\.spec\.ts/,
      use: {
        ...devices["Pixel 5"],
      },
    },
  ],

  /* Build and serve the app with MSW */
  webServer: {
    command: "bun run build && bunx serve -s build/client -l 4173",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
