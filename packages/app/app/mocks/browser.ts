/**
 * Browser MSW Setup for E2E Tests
 *
 * This file sets up MSW for browser-based E2E tests.
 * It uses the enhanced handlers that match the actual API.
 */

import { setupWorker } from "msw/browser";
import { handlers } from "../../e2e/mocks/handlers";

// Create MSW worker instance for browser
export const worker = setupWorker(...handlers);
