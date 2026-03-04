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
    // Single project: all tests run sequentially in one browser session
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 5"],
      },
    },
  ],
  // Note: Tests include db:reset internally. Start servers manually:
  // Terminal 1: cd packages/backend && bun run dev
  // Terminal 2: cd packages/app && bun run dev
  // Then run: bun run test:e2e --project=mobile-chrome
});
