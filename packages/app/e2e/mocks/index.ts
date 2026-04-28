/**
 * Barrel Export for E2E Mock Handlers
 *
 * This module re-exports all MSW handlers and utilities for E2E testing.
 * It combines base handlers and volume handlers into a
 * single export for easy setup in tests.
 */

import { handlers as baseHandlers } from "./handlers";
import {
  handlers as volumeHandlers,
  initializeVolumeData,
  resetVolumeData,
} from "./volume-handlers";

// Re-export initialization functions
export { initializeVolumeData, resetVolumeData };

/**
 * Combined MSW handlers for E2E tests.
 *
 * Usage in tests:
 * ```typescript
 * import { handlers, initializeVolumeData } from './mocks';
 *
 * // Setup with volume data
 * beforeAll(() => {
 *   server.use(...handlers);
 *   initializeVolumeData({ customers: 100, sales: 200 });
 * });
 *
 * // Reset after tests
 * afterEach(() => {
 *   resetVolumeData();
 * });
 * ```
 */
export const handlers = [
  ...baseHandlers,
  ...volumeHandlers,
];

// Re-export utility functions from handlers
export { resetE2EData, getSales, addE2ESale, getCustomers, getProducts, getProductVariants } from "./handlers";

// Re-export volume data accessors
export {
  getVolumeData,
  getVolumeCustomers,
  getVolumeProducts,
  getVolumeVariants,
  getVolumeSales,
  getVolumeOrders,
} from "./volume-handlers";


