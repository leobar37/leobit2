/**
 * MSW Browser Setup for E2E Tests
 *
 * This file initializes MSW in the browser for mocking API calls.
 * It should be imported in tests that need API mocking.
 */

import { setupWorker, type StartOptions } from "msw/browser";
import { handlers } from "./index";

// Track if worker is already started
let workerStarted = false;

/**
 * Start MSW worker for browser-side mocking.
 * Safe to call multiple times - only starts once.
 */
export async function startMSW(options?: StartOptions) {
  if (workerStarted) {
    return;
  }

  const worker = setupWorker(...handlers);
  
  await worker.start({
    onUnhandledRequest: "bypass",
    quiet: true,
    ...options,
  });

  workerStarted = true;
}

/**
 * Stop MSW worker. Mainly for cleanup in tests.
 */
export function stopMSW() {
  workerStarted = false;
}

/**
 * Reset MSW handlers and state.
 * Useful between tests to reset mock data.
 */
export async function resetMSW() {
  // If handlers have reset functions, call them
  const { resetVolumeData } = await import("./volume-handlers");
  const { resetE2EData } = await import("./handlers");
  
  resetVolumeData();
  resetE2EData();
}
