/**
 * Global Setup for E2E Tests with MSW
 *
 * This file runs once before all tests to set up the environment.
 */

import type { FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  // Ensure the app is built with MSW support
  console.log("[E2E Setup] Preparing test environment...");

  // You can add any global setup logic here
  // For example, seeding the database, cleaning up files, etc.

  console.log("[E2E Setup] Ready!");
}

export default globalSetup;
