/**
 * Staged Pull Coordinator
 *
 * Orchestrates the loading of sync data in 3 stages:
 * 1. CRITICAL: Essential reference data (customers, products) - blocking
 * 2. RECENT_SALES: Recent operational data (sales, sale_items) - blocking
 * 3. HISTORICAL: Complete historical data (abonos, purchases, etc.) - background
 *
 * All processing is sequential to avoid race conditions.
 */

import {
  SYNC_STAGES,
  type SyncStage,
  type StageBehaviorConfig,
  type SyncStageState,
  getEntitiesForStage,
  createSyncStageMachine,
  type StateMachine,
} from "@avileo/shared";
import type { PullService } from "./pull-service";

export interface StagedPullState {
  stage: SyncStage;
  status: "pending" | "loading" | "complete" | "error";
  changesApplied: number;
  error?: string;
}

export interface StagedPullResult {
  critical: StagedPullState;
  recent: StagedPullState;
  historical: StagedPullState;
}

export type StagedPullProgressCallback = (state: StagedPullState) => void;

/** Configuration for executing a paginated load operation */
interface PaginatedLoadConfig {
  entityTypes: string[];
  since?: string;
  cursorKey: string;
  behavior: StageBehaviorConfig;
}

/** Result of a paginated load operation */
interface PaginatedLoadResult {
  totalApplied: number;
  batches: number;
}

export class StagedPullCoordinator {
  private pullService: PullService;
  private state: Map<SyncStage, StagedPullState> = new Map();
  private machines: Map<SyncStage, StateMachine<SyncStageState, "start" | "pause" | "resume" | "success" | "fail" | "reset">> = new Map();
  private onProgress: StagedPullProgressCallback | null = null;
  private aborted = false;

  constructor(pullService: PullService) {
    this.pullService = pullService;

    // Initialize state and state machines for all stages
    for (const stage of Object.keys(SYNC_STAGES) as SyncStage[]) {
      // Initialize state
      const stageState: StagedPullState = {
        stage,
        status: "pending",
        changesApplied: 0,
      };
      this.state.set(stage, stageState);

      // Initialize state machine with subscriptions
      const machine = createSyncStageMachine();
      machine.subscribe((status) => {
        // Update our state when machine changes
        const currentState = this.state.get(stage)!;
        currentState.status = status;
        this.notifyProgress(currentState);
      });
      this.machines.set(stage, machine);
    }
  }

  setOnProgress(callback: StagedPullProgressCallback): void {
    this.onProgress = callback;
  }

  /**
   * Check if a stage can be resumed from a saved cursor
   */
  canResumeStage(stage: SyncStage): boolean {
    const cursor = this.pullService.getStageCursor(stage.toLowerCase());
    return cursor !== null && cursor !== undefined;
  }

  /**
   * Generic stage loader. Loads any sync stage based on its configuration.
   * This is the primary method for loading data - specific methods delegate here.
   *
   * @param stage - The sync stage to load (CRITICAL, RECENT_SALES, HISTORICAL)
   * @returns The final state of the loaded stage
   */
  async loadStage(stage: SyncStage): Promise<StagedPullState> {
    const config = SYNC_STAGES[stage];
    const state = this.getState(stage);
    const machine = this.machines.get(stage)!;
    const behavior = config.behavior;

    // Check if we can resume from a previous partial sync
    const canResume = this.canResumeStage(stage);
    const since = config.lookbackDays
      ? this.getSinceDate(config.lookbackDays)
      : undefined;

    // Transition to loading state via state machine
    machine.transition("start");

    const entityList = getEntitiesForStage(stage).join(", ");
    console.log(
      `[StagedPullCoordinator] ${stage} starting${canResume ? " (resuming)" : ""} - Entities: ${entityList}`
    );

    try {
      const result = await this.executePaginatedLoad({
        entityTypes: getEntitiesForStage(stage),
        since: canResume ? undefined : since,
        cursorKey: stage.toLowerCase(),
        behavior,
      });

      // Success - transition to complete
      machine.transition("success");
      state.changesApplied = result.totalApplied;

      console.log(
        `[StagedPullCoordinator] ${stage} complete: ${result.totalApplied} changes in ${result.batches} batches`
      );
    } catch (error) {
      // Failure - transition to error
      machine.transition("fail");
      state.error = error instanceof Error ? error.message : String(error);

      if (behavior.onError === "throw") {
        console.error(
          `[StagedPullCoordinator] ${stage} failed:`,
          state.error
        );
        throw error;
      } else {
        console.warn(
          `[StagedPullCoordinator] ${stage} error (non-blocking):`,
          state.error
        );
      }
    }

    return state;
  }

  /**
   * Executes a paginated load operation with loop protection and error handling.
   * Contains the common logic shared across all sync stages.
   *
   * @param config - Configuration for the paginated load
   * @returns Result with total changes applied and batch count
   */
  private async executePaginatedLoad(
    config: PaginatedLoadConfig
  ): Promise<PaginatedLoadResult> {
    const { entityTypes, since, cursorKey, behavior } = config;

    let totalApplied = 0;
    let hasMore = true;
    let lastCursor: string | null = null;
    let batches = 0;
    let iterations = 0;
    let consecutiveErrors = 0;

    while (hasMore && !this.aborted && navigator.onLine) {
      iterations++;

      // Loop protection: max iterations
      if (iterations > behavior.maxIterations) {
        throw new Error(
          `Loop protection: exceeded ${behavior.maxIterations} iterations`
        );
      }

      try {
        const result = await this.pullService.pullWithOptions({
          entityTypes,
          since,
          cursorKey,
        });

        if (!result.success) {
          consecutiveErrors++;

          // Retry logic for transient failures
          if (consecutiveErrors <= behavior.retryAttempts) {
            console.warn(
              `[StagedPullCoordinator] Batch failed (attempt ${consecutiveErrors}/${behavior.retryAttempts}), retrying...`
            );
            await this.sleep(behavior.retryDelayMs ?? 1000);
            continue;
          }

          throw new Error(
            result.error ||
              `Failed after ${behavior.retryAttempts} retry attempts`
          );
        }

        // Reset consecutive errors on success
        consecutiveErrors = 0;
        totalApplied += result.changesApplied;

        // Detect stuck cursor: cursor not advancing with no changes
        if (
          hasMore &&
          result.nextSince === lastCursor &&
          result.changesApplied === 0
        ) {
          console.warn(
            `[StagedPullCoordinator] Cursor stuck at ${String(lastCursor)}, breaking loop`
          );
          break;
        }

        hasMore = result.hasMore;
        lastCursor = result.nextSince;
        batches++;

        // Delay between batches for background stages
        if (hasMore && behavior.batchDelayMs) {
          await this.sleep(behavior.batchDelayMs);
        }
      } catch (error) {
        // If we've exhausted retries, propagate the error
        if (consecutiveErrors > behavior.retryAttempts) {
          throw error;
        }
        // Otherwise, the retry logic above will handle it
      }
    }

    return { totalApplied, batches };
  }

  /**
   * Stage 1: Load critical reference data (blocking)
   * - customers, products, product_variants
   * - Last 30 days
   * - App waits for this to complete
   *
   * @deprecated Use loadStage("CRITICAL") instead. Note: loadStage throws on error while this method returns error state.
   */
  async loadCriticalData(): Promise<StagedPullState> {
    try {
      return await this.loadStage("CRITICAL");
    } catch (error) {
      // Backward compatibility: return error state instead of throwing
      const state = this.getState("CRITICAL");
      return state;
    }
  }

  /**
   * Stage 2: Load recent sales data (blocking)
   * - sales, sale_items
   * - Last 7 days
   * - App waits for this to complete
   *
   * @deprecated Use loadStage("RECENT_SALES") instead. Note: loadStage throws on error while this method returns error state.
   */
  async loadRecentSales(): Promise<StagedPullState> {
    try {
      return await this.loadStage("RECENT_SALES");
    } catch (error) {
      // Backward compatibility: return error state instead of throwing
      const state = this.getState("RECENT_SALES");
      return state;
    }
  }

  /**
   * Stage 3: Load historical data (background/non-blocking)
   * - abonos, purchases, distribuciones, etc.
   * - All historical data
   * - App is usable during this stage
   *
   * @deprecated Use loadStage("HISTORICAL") instead. Note: loadStage throws on error while this method returns error state.
   */
  async loadHistoricalData(): Promise<StagedPullState> {
    // HISTORICAL has onError: "continue" so it never throws
    return this.loadStage("HISTORICAL");
  }

  /**
   * Execute the full staged loading sequence
   * Returns after critical and recent stages (app is usable)
   * Historical stage runs in background
   */
  async executeStagedLoad(): Promise<{
    critical: StagedPullState;
    recent: StagedPullState;
    historical: Promise<StagedPullState>;
  }> {
    this.aborted = false;

    // Stage 1: Critical (blocking)
    const critical = await this.loadStage("CRITICAL");

    // Stage 2: Recent Sales (blocking)
    const recent = await this.loadStage("RECENT_SALES");

    // Return control to app - it's now usable
    // Stage 3: Historical (background)
    const historical = this.loadStage("HISTORICAL");

    return { critical, recent, historical };
  }

  /**
   * Get current state of all stages
   */
  getAllState(): StagedPullResult {
    return {
      critical: this.getState("CRITICAL"),
      recent: this.getState("RECENT_SALES"),
      historical: this.getState("HISTORICAL"),
    };
  }

  /**
   * Check if app is usable (critical and recent stages complete)
   */
  isAppUsable(): boolean {
    const critical = this.getState("CRITICAL");
    const recent = this.getState("RECENT_SALES");
    return critical.status === "complete" && recent.status === "complete";
  }

  /**
   * Check if all stages are complete
   */
  isComplete(): boolean {
    return Object.values(this.getAllState()).every(
      (state) => state.status === "complete"
    );
  }

  /**
   * Get total changes applied across all stages
   */
  getTotalChangesApplied(): number {
    return Object.values(this.getAllState()).reduce(
      (sum, state) => sum + state.changesApplied,
      0
    );
  }

  /**
   * Reset all stage states (useful for testing or re-sync)
   */
  reset(): void {
    for (const stage of Object.keys(SYNC_STAGES) as SyncStage[]) {
      // Reset state machine
      this.machines.get(stage)?.reset();

      // Reset state
      this.state.set(stage, {
        stage,
        status: "pending",
        changesApplied: 0,
      });
    }
  }

  /**
   * Abort all in-flight pull operations
   */
  abort(): void {
    this.aborted = true;
    this.pullService.abort();
  }

  private getState(stage: SyncStage): StagedPullState {
    return this.state.get(stage)!;
  }

  private notifyProgress(state: StagedPullState): void {
    this.onProgress?.(state);
  }

  private getSinceDate(days: number | null): string | undefined {
    if (!days) return undefined;

    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
