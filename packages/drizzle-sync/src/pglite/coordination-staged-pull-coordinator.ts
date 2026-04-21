/**
 * Staged Pull Coordinator
 *
 * Orchestrates the loading of sync data in configurable stages:
 * - Stages are defined via configuration (not hardcoded)
 * - All processing is sequential to avoid race conditions
 *
 * This is a generic implementation that can be used with any backend
 * sync protocol by providing the appropriate IPullService implementation.
 */

import type { PullResult } from "./types";

// =============================================================================
// Types
// =============================================================================

/**
 * Behavior configuration for a sync stage
 */
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

/**
 * Configuration for a single sync stage
 */
export interface StageConfig<TStage extends string> {
  /** Stage name */
  name: TStage;
  /** Entities that belong to this stage */
  entities: readonly string[];
  /** Lookback days for this stage (null for all historical data) */
  lookbackDays: number | null;
  /** Stage behavior configuration */
  behavior: StageBehaviorConfig;
}

/**
 * Record of stage configurations keyed by stage name
 */
export type SyncStagesConfig<TStage extends string> = Record<TStage, StageConfig<TStage>>;

/**
 * State of a single sync stage
 */
export interface StagedPullState<TStage extends string> {
  stage: TStage;
  status: "pending" | "loading" | "complete" | "error";
  changesApplied: number;
  error?: string;
}

/**
 * Result containing states for all stages
 */
export type StagedPullResult<TStage extends string> = {
  [K in TStage]: StagedPullState<K>;
};

/**
 * Progress callback type
 */
export type StagedPullProgressCallback<TStage extends string> = (
  state: StagedPullState<TStage>
) => void;

/**
 * Interface for the pull service used by the coordinator.
 * Implement this to adapt to your specific sync backend.
 */
export interface IPullService {
  /**
   * Pull changes with specific options for a stage
   */
  pullWithOptions(options: {
    entityTypes?: string[];
    since?: string;
    limit?: number;
    cursorKey?: string;
  }): Promise<PullResult & { nextSince: string | null }>;

  /**
   * Get cursor for a specific stage (for resume capability)
   */
  getStageCursor(stageKey: string): string | null;

  /**
   * Abort any in-flight pull requests
   */
  abort(): void;
}

/**
 * Options for creating a StagedPullCoordinator
 */
export interface StagedPullCoordinatorOptions<TStage extends string> {
  /** The pull service to use */
  pullService: IPullService;
  /** Configuration for all sync stages */
  stages: SyncStagesConfig<TStage>;
  /** Get entities for a specific stage */
  getEntitiesForStage: (stage: TStage) => string[];
  /** Function to get current online status (default: uses navigator.onLine) */
  isOnline?: () => boolean;
}

// =============================================================================
// Simple State Machine (internal)
// =============================================================================

type SimpleStateMachineState = "pending" | "loading" | "paused" | "complete" | "error";
type SimpleStateMachineEvent = "start" | "pause" | "resume" | "success" | "fail" | "retry" | "reset";

interface SimpleStateMachine {
  getState(): SimpleStateMachineState;
  transition(event: SimpleStateMachineEvent): void;
  canTransition(event: SimpleStateMachineEvent): boolean;
  subscribe(callback: (state: SimpleStateMachineState) => void): () => void;
  reset(): void;
}

function createSimpleStateMachine(): SimpleStateMachine {
  let state: SimpleStateMachineState = "pending";
  const subscribers = new Set<(state: SimpleStateMachineState) => void>();

  const transitions: Record<SimpleStateMachineState, Partial<Record<SimpleStateMachineEvent, SimpleStateMachineState>>> = {
    pending: { start: "loading" },
    loading: { success: "complete", fail: "error", pause: "paused" },
    paused: { resume: "loading", reset: "pending" },
    complete: { reset: "pending" },
    error: { retry: "loading", reset: "pending" },
  };

  return {
    getState: () => state,
    transition(event: SimpleStateMachineEvent) {
      const nextState = transitions[state]?.[event];
      if (nextState) {
        state = nextState;
        subscribers.forEach((cb) => cb(state));
      }
    },
    canTransition(event: SimpleStateMachineEvent) {
      return !!transitions[state]?.[event];
    },
    subscribe(callback: (state: SimpleStateMachineState) => void) {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
    reset() {
      state = "pending";
      subscribers.forEach((cb) => cb(state));
    },
  };
}

// =============================================================================
// Configuration for executing a paginated load operation
// =============================================================================

interface PaginatedLoadConfig<TStage extends string> {
  stage: TStage;
  entityTypes: string[];
  since?: string;
  cursorKey: string;
  behavior: StageBehaviorConfig;
}

// =============================================================================
// Staged Pull Coordinator
// =============================================================================

/**
 * Staged Pull Coordinator
 *
 * Orchestrates loading sync data in configurable stages with:
 * - Automatic state machine management per stage
 * - Resume capability (continuing from saved cursor)
 * - Loop protection and retry logic
 * - Progress callbacks
 *
 * @example
 * ```typescript
 * const coordinator = new StagedPullCoordinator({
 *   pullService: myPullService,
 *   stages: {
 *     CRITICAL: { name: "CRITICAL", entities: ["customers", "products"], lookbackDays: 30, behavior: {...} },
 *     RECENT_SALES: { name: "RECENT_SALES", entities: ["sales", "sale_items"], lookbackDays: 7, behavior: {...} },
 *     HISTORICAL: { name: "HISTORICAL", entities: ["abonos", "purchases"], lookbackDays: null, behavior: {...} },
 *   },
 *   getEntitiesForStage: (stage) => stages[stage].entities,
 * });
 *
 * coordinator.setOnProgress((state) => console.log(`${state.stage}: ${state.status}`));
 *
 * const { critical, recent, historical } = await coordinator.executeStagedLoad();
 * ```
 */
export class StagedPullCoordinator<TStage extends string> {
  private pullService: IPullService;
  private stages: SyncStagesConfig<TStage>;
  private getEntitiesForStage: (stage: TStage) => string[];
  private isOnline: () => boolean;
  private state: Map<TStage, StagedPullState<TStage>> = new Map();
  private machines: Map<TStage, SimpleStateMachine> = new Map();
  private onProgress: StagedPullProgressCallback<TStage> | null = null;
  private aborted = false;

  constructor(options: StagedPullCoordinatorOptions<TStage>) {
    this.pullService = options.pullService;
    this.stages = options.stages;
    this.getEntitiesForStage = options.getEntitiesForStage;
    this.isOnline = options.isOnline ?? (() => typeof navigator !== "undefined" && navigator.onLine);

    // Initialize state and state machines for all stages
    const stageNames = Object.keys(this.stages) as TStage[];
    for (const stage of stageNames) {
      // Initialize state
      const stageState: StagedPullState<TStage> = {
        stage,
        status: "pending",
        changesApplied: 0,
      };
      this.state.set(stage, stageState);

      // Initialize state machine with subscriptions
      const machine = createSimpleStateMachine();
      machine.subscribe((status) => {
        const currentState = this.state.get(stage)!;
        currentState.status = status as StagedPullState<TStage>["status"];
        this.notifyProgress(currentState);
      });
      this.machines.set(stage, machine);
    }
  }

  /**
   * Set progress callback
   */
  setOnProgress(callback: StagedPullProgressCallback<TStage>): void {
    this.onProgress = callback;
  }

  /**
   * Check if a stage can be resumed from a saved cursor
   */
  canResumeStage(stage: TStage): boolean {
    const cursor = this.pullService.getStageCursor(stage.toLowerCase());
    return cursor !== null && cursor !== undefined;
  }

  /**
   * Generic stage loader. Loads any sync stage based on its configuration.
   * This is the primary method for loading data - specific methods delegate here.
   *
   * @param stage - The sync stage to load
   * @returns The final state of the loaded stage
   */
  async loadStage(stage: TStage): Promise<StagedPullState<TStage>> {
    const config = this.stages[stage];
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

    const entityList = this.getEntitiesForStage(stage).join(", ");
    console.log(
      `[StagedPullCoordinator] ${stage} starting${canResume ? " (resuming)" : ""} - Entities: ${entityList}`
    );

    try {
      const result = await this.executePaginatedLoad({
        stage,
        entityTypes: this.getEntitiesForStage(stage),
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
   */
  private async executePaginatedLoad(
    config: PaginatedLoadConfig<TStage>
  ): Promise<{ totalApplied: number; batches: number }> {
    const { stage, entityTypes, since, cursorKey, behavior } = config;

    let totalApplied = 0;
    let hasMore = true;
    let lastCursor: string | null = null;
    let batches = 0;
    let iterations = 0;
    let consecutiveErrors = 0;

    while (hasMore && !this.aborted && this.isOnline()) {
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
   * Execute the full staged loading sequence
   * Returns after critical and recent stages (app is usable)
   * Historical stage runs in background
   */
  async executeStagedLoad(): Promise<{
    critical: StagedPullState<TStage>;
    recent: StagedPullState<TStage>;
    historical: Promise<StagedPullState<TStage>>;
  }> {
    this.aborted = false;

    const stageNames = Object.keys(this.stages) as TStage[];

    // If only one stage, execute it directly
    if (stageNames.length === 1) {
      const stage = stageNames[0];
      return {
        critical: await this.loadStage(stage),
        recent: await this.loadStage(stage),
        historical: Promise.resolve(await this.loadStage(stage)),
      } as any;
    }

    // Stage 1: Critical (blocking)
    const critical = await this.loadStage(stageNames[0]);

    // Stage 2: Recent Sales (blocking)
    const recent = await this.loadStage(stageNames[1]);

    // Return control to app - it's now usable
    // Stage 3: Historical (background)
    const historical = this.loadStage(stageNames[2] ?? stageNames[stageNames.length - 1]);

    return { critical, recent, historical };
  }

  /**
   * Get current state of a specific stage
   */
  getStageState(stage: TStage): StagedPullState<TStage> {
    return this.state.get(stage)!;
  }

  /**
   * Get current state of all stages
   */
  getAllState(): StagedPullResult<TStage> {
    const result = {} as StagedPullResult<TStage>;
    for (const stage of Object.keys(this.stages) as TStage[]) {
      result[stage] = this.state.get(stage)!;
    }
    return result;
  }

  /**
   * Check if app is usable (first two stages complete)
   */
  isAppUsable(): boolean {
    const stageNames = Object.keys(this.stages) as TStage[];
    if (stageNames.length < 2) return true;

    const first = this.state.get(stageNames[0])!;
    const second = this.state.get(stageNames[1])!;
    return first.status === "complete" && second.status === "complete";
  }

  /**
   * Check if all stages are complete
   */
  isComplete(): boolean {
    const states = Object.values(this.getAllState()) as StagedPullState<TStage>[];
    return states.every(
      (state) => state.status === "complete"
    );
  }

  /**
   * Get total changes applied across all stages
   */
  getTotalChangesApplied(): number {
    const states = Object.values(this.getAllState()) as StagedPullState<TStage>[];
    return states.reduce(
      (sum, state) => sum + state.changesApplied,
      0
    );
  }

  /**
   * Reset all stage states (useful for testing or re-sync)
   */
  reset(): void {
    for (const stage of Object.keys(this.stages) as TStage[]) {
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

  private getState(stage: TStage): StagedPullState<TStage> {
    return this.state.get(stage)!;
  }

  private notifyProgress(state: StagedPullState<TStage>): void {
    this.onProgress?.(state);
  }

  private getSinceDate(days: number | null): string | undefined {
    if (!days) return undefined;

    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }

  private sleep(ms: number | undefined): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms ?? 1000));
  }
}
