/**
 * Queue Types
 */

import type { ISyncLogger } from "../core";

export interface QueueOptions {
  /** Function to generate unique IDs */
  generateId?: () => string;
  /** Entity priority configuration for ordering */
  entityPriorities?: Record<string, number>;
  /** Include priority in ordering */
  includePriority?: boolean;
  /** Logger instance */
  logger?: ISyncLogger;
}

/**
 * Operation status constants
 */
export const OPERATION_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  SYNCING: "syncing",
  COMPLETED: "completed",
  FAILED: "failed",
  CONFLICT: "conflict",
  DEAD_LETTER: "dead_letter",
} as const;
