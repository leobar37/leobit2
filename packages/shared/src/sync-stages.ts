/**
 * Staged Sync Configuration
 *
 * Defines the three loading stages for optimized sync performance:
 * - CRITICAL: Essential reference data needed immediately (customers, products)
 * - RECENT_SALES: Recent operational data (last 7 days of sales)
 * - HISTORICAL: Complete historical data loaded in background (abonos, purchases, etc.)
 */

import { createStateMachine } from "./state-machine";

/** Behavior configuration for a sync stage */
export interface StageBehaviorConfig {
  /** Maximum iterations for loop protection */
  maxIterations: number;
  /** Number of retry attempts on failure */
  retryAttempts: number;
  /** Delay between retry attempts in ms */
  retryDelayMs?: number;
  /** Error handling strategy: 'throw' to fail fast, 'continue' to log and proceed */
  onError: "throw" | "continue";
  /** Delay between batches in ms (for background stages) */
  batchDelayMs?: number;
}

export const SYNC_STAGES = {
  /**
   * Stage 1: Critical reference data
   * - Always loaded first (blocking)
   * - App cannot function without these
   * - 30 day lookback for recent customers/products
   */
  CRITICAL: {
    name: "CRITICAL" as const,
    entities: ["customers", "products", "product_variants"] as const,
    lookbackDays: 30,
    description: "Datos de referencia esenciales",
    blocking: true,
    behavior: {
      maxIterations: 1000,
      retryAttempts: 3,
      retryDelayMs: 1000,
      onError: "throw",
    } satisfies StageBehaviorConfig,
  },

  /**
   * Stage 2: Recent sales data
   * - Loaded second (blocking)
   * - Needed for daily operations
   * - 7 day lookback for recent sales
   */
  RECENT_SALES: {
    name: "RECENT_SALES" as const,
    entities: ["sales", "sale_items"] as const,
    lookbackDays: 7,
    description: "Ventas recientes",
    blocking: true,
    behavior: {
      maxIterations: 1000,
      retryAttempts: 3,
      retryDelayMs: 1000,
      onError: "throw",
    } satisfies StageBehaviorConfig,
  },

  /**
   * Stage 3: Historical data
   * - Loaded in background (non-blocking)
   * - Includes all historical debts (abonos) for complete customer history
   * - Full historical data for purchases, distributions, etc.
   */
  HISTORICAL: {
    name: "HISTORICAL" as const,
    entities: [
      "abonos",
      "purchases",
      "purchase_items",
      "distribuciones",
      "distribucion_items",
      "suppliers",
      "visitas",
      "tags",
      "customer_tags",
      "customer_groups",
      "customer_group_members",
    ] as const,
    lookbackDays: null, // All historical data
    description: "Histórico completo",
    blocking: false,
    behavior: {
      maxIterations: 1000,
      retryAttempts: 3,
      retryDelayMs: 1000,
      onError: "continue", // Background: don't block on transient errors
      batchDelayMs: 100,
    } satisfies StageBehaviorConfig,
  },
} as const;

export type SyncStage = keyof typeof SYNC_STAGES;
export type SyncStageConfig = (typeof SYNC_STAGES)[SyncStage];

/**
 * Get the list of entities for a specific stage
 */
export function getEntitiesForStage(stage: SyncStage): string[] {
  return [...SYNC_STAGES[stage].entities];
}

/**
 * Get all entities across all stages (for filtering purposes)
 */
export function getAllStagedEntities(): string[] {
  return Object.values(SYNC_STAGES).flatMap((stage) => [...stage.entities]);
}

/**
 * Check if an entity belongs to a specific stage
 */
export function isEntityInStage(entity: string, stage: SyncStage): boolean {
  return getEntitiesForStage(stage).includes(entity);
}

/**
 * Get the stage configuration for an entity
 */
export function getStageForEntity(entity: string): SyncStage | null {
  const allEntities = getAllStagedEntities();
  if (!allEntities.includes(entity)) {
    return null;
  }

  for (const stageName of Object.keys(SYNC_STAGES) as SyncStage[]) {
    if (getEntitiesForStage(stageName).includes(entity)) {
      return stageName;
    }
  }
  return null;
}

// =============================================================================
// Sync Stage State Machine
// =============================================================================

/** States for sync stage lifecycle */
export type SyncStageState = "pending" | "loading" | "paused" | "complete" | "error";

/** Events that trigger state transitions */
export type SyncStageEvent = "start" | "pause" | "resume" | "success" | "fail" | "retry" | "reset";

/**
 * Pre-configured state machine for sync stage lifecycle.
 *
 * State transitions:
 * ```
 * pending --start--> loading --success--> complete
 *    |                |            |
 *    |                |--fail--> error
 *    |                |            |
 *    |                |--pause--> paused
 *    |                             |
 *    +----------reset--------------+
 * ```
 *
 * @example
 * // Basic usage
 * const machine = createSyncStageMachine();
 * machine.transition("start");   // pending -> loading
 * machine.transition("success"); // loading -> complete
 * machine.transition("reset");   // complete -> pending
 *
 * @example
 * // With subscription for progress tracking
 * const machine = createSyncStageMachine();
 * machine.subscribe((state, previous, event) => {
 *   console.log(`Sync: ${previous} -> ${state} via ${event}`);
 * });
 *
 * @example
 * // Check valid transitions before attempting
 * if (machine.canTransition("start")) {
 *   machine.transition("start");
 * }
 *
 * @returns State machine instance for sync stage lifecycle
 */
export function createSyncStageMachine() {
  return createStateMachine<SyncStageState, SyncStageEvent>({
    initial: "pending",
    states: {
      pending: {
        on: { start: "loading" },
      },
      loading: {
        on: {
          success: "complete",
          fail: "error",
          pause: "paused",
        },
      },
      paused: {
        on: { resume: "loading", reset: "pending" },
      },
      complete: {
        on: { reset: "pending" },
      },
      error: {
        on: { retry: "loading", reset: "pending" },
      },
    },
  });
}

/**
 * Shared sync stage state machine instance.
 * Use this for singleton-like behavior or create your own with createSyncStageMachine().
 *
 * @example
 * // Use the shared instance for simple cases
 * import { syncStageMachine } from "@avileo/shared";
 *
 * syncStageMachine.transition("start");
 * syncStageMachine.subscribe((state) => updateUI(state));
 *
 * @example
 * // Create separate instances for multiple parallel syncs
 * import { createSyncStageMachine } from "@avileo/shared";
 *
 * const criticalMachine = createSyncStageMachine();
 * const recentMachine = createSyncStageMachine();
 *
 * criticalMachine.transition("start");
 * recentMachine.transition("start");
 */
export const syncStageMachine = createSyncStageMachine();
