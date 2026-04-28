import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Configuration for E2E Tests with Dev Server
 *
 * This configuration runs tests against the development server,
 * which has DEV_CREDENTIALS pre-filled for easy testing.
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

  /* Timeout for all tests */
  timeout: 300000, // 5 minutes

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: "http://localhost:5173",

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
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
      testMatch: /.*\.spec\.ts/,
    },
    // Mobile viewport for testing responsive design
    {
      name: "Mobile Chrome",
      use: {
        ...devices["Pixel 5"],
      },
      testMatch: /.*\.spec\.ts/,
    },
  ],

  /* Start dev server */
  webServer: {
    command: "bun run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
