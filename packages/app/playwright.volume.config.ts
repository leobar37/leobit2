import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  timeout: 120000, // 2 minutes for volume tests
  expect: {
    timeout: 10000,
  },
  fullyParallel: false, // Volume tests need sequential execution
  retries: 1,
  workers: 1,
  use: {
    ...devices['iPhone 14'],
    viewport: { width: 390, height: 844 },
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
