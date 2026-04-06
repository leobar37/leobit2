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
  getEntitiesForStage 
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

export class StagedPullCoordinator {
  private pullService: PullService;
  private state: Map<SyncStage, StagedPullState> = new Map();
  private onProgress: StagedPullProgressCallback | null = null;
  private aborted = false;

  constructor(pullService: PullService) {
    this.pullService = pullService;
    
    // Initialize state for all stages
    for (const stage of Object.keys(SYNC_STAGES) as SyncStage[]) {
      this.state.set(stage, {
        stage,
        status: "pending",
        changesApplied: 0,
      });
    }
  }

  setOnProgress(callback: StagedPullProgressCallback): void {
    this.onProgress = callback;
  }

  /**
   * Stage 1: Load critical reference data (blocking)
   * - customers, products, product_variants
   * - Last 30 days
   * - App waits for this to complete
   */
  async loadCriticalData(): Promise<StagedPullState> {
    const stage: SyncStage = "CRITICAL";
    const config = SYNC_STAGES[stage];
    const state = this.getState(stage);
    
    state.status = "loading";
    this.notifyProgress(state);

    try {
      const since = this.getSinceDate(config.lookbackDays);
      const entityTypes = getEntitiesForStage(stage);
      
      let totalApplied = 0;
      let hasMore = true;
      let lastCursor: string | null = null;

      // Load all data for this stage (paginated)
      let iterations = 0;
      const MAX_ITERATIONS = 1000; // Safety limit to prevent infinite loops

      while (hasMore && !this.aborted && navigator.onLine) {
        iterations++;
        if (iterations > MAX_ITERATIONS) {
          throw new Error(`Loop protection: exceeded ${MAX_ITERATIONS} iterations in critical stage`);
        }

        const result = await this.pullService.pullWithOptions({
          entityTypes,
          since,
          cursorKey: stage.toLowerCase(),
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to load critical data");
        }

        totalApplied += result.changesApplied;

        // Detect stuck cursor (cursor not advancing but server says there's more)
        if (hasMore && result.nextSince === lastCursor && result.changesApplied === 0) {
          console.warn(`[StagedPullCoordinator] Cursor stuck at ${lastCursor} in critical stage, breaking loop`);
          break;
        }

        hasMore = result.hasMore;
        lastCursor = result.nextSince;
      }

      state.status = "complete";
      state.changesApplied = totalApplied;
    } catch (error) {
      state.status = "error";
      state.error = error instanceof Error ? error.message : String(error);
      console.error(`[StagedPullCoordinator] Critical stage failed:`, state.error);
    }

    this.notifyProgress(state);
    return state;
  }

  /**
   * Stage 2: Load recent sales data (blocking)
   * - sales, sale_items
   * - Last 7 days
   * - App waits for this to complete
   */
  async loadRecentSales(): Promise<StagedPullState> {
    const stage: SyncStage = "RECENT_SALES";
    const config = SYNC_STAGES[stage];
    const state = this.getState(stage);
    
    state.status = "loading";
    this.notifyProgress(state);

    try {
      const since = this.getSinceDate(config.lookbackDays);
      const entityTypes = getEntitiesForStage(stage);
      
      let totalApplied = 0;
      let hasMore = true;
      let lastCursor: string | null = null;

      // Load all data for this stage (paginated)
      let iterations = 0;
      const MAX_ITERATIONS = 1000;

      while (hasMore && !this.aborted && navigator.onLine) {
        iterations++;
        if (iterations > MAX_ITERATIONS) {
          throw new Error(`Loop protection: exceeded ${MAX_ITERATIONS} iterations in recent sales stage`);
        }

        const result = await this.pullService.pullWithOptions({
          entityTypes,
          since,
          cursorKey: stage.toLowerCase(),
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to load recent sales");
        }

        totalApplied += result.changesApplied;

        // Detect stuck cursor
        if (hasMore && result.nextSince === lastCursor && result.changesApplied === 0) {
          console.warn(`[StagedPullCoordinator] Cursor stuck at ${lastCursor} in recent stage, breaking loop`);
          break;
        }

        hasMore = result.hasMore;
        lastCursor = result.nextSince;
      }

      state.status = "complete";
      state.changesApplied = totalApplied;
    } catch (error) {
      state.status = "error";
      state.error = error instanceof Error ? error.message : String(error);
      console.error(`[StagedPullCoordinator] Recent sales stage failed:`, state.error);
    }

    this.notifyProgress(state);
    return state;
  }

  /**
   * Stage 3: Load historical data (background/non-blocking)
   * - abonos, purchases, distribuciones, etc.
   * - All historical data
   * - App is usable during this stage
   */
  async loadHistoricalData(): Promise<StagedPullState> {
    const stage: SyncStage = "HISTORICAL";
    const state = this.getState(stage);
    
    state.status = "loading";
    this.notifyProgress(state);

    try {
      const entityTypes = getEntitiesForStage(stage);

      let totalApplied = 0;
      let hasMore = true;
      let batches = 0;
      let lastCursor: string | null = null;
      let iterations = 0;
      const MAX_ITERATIONS = 1000;

      while (hasMore && !this.aborted && navigator.onLine) {
        iterations++;
        if (iterations > MAX_ITERATIONS) {
          console.warn(`[StagedPullCoordinator] Loop protection: exceeded ${MAX_ITERATIONS} iterations in historical stage`);
          break;
        }

        const result = await this.pullService.pullWithOptions({
          entityTypes,
          cursorKey: stage.toLowerCase(),
        });

        if (!result.success) {
          // For background stage, log error but don't throw immediately
          // Try a couple more times before giving up
          if (batches < 3) {
            console.warn(`[StagedPullCoordinator] Historical batch failed, retrying...`);
            await this.sleep(1000);
            continue;
          }
          throw new Error(result.error || "Failed to load historical data after retries");
        }

        totalApplied += result.changesApplied;

        // Detect stuck cursor
        if (hasMore && result.nextSince === lastCursor && result.changesApplied === 0) {
          console.warn(`[StagedPullCoordinator] Cursor stuck at ${lastCursor} in historical stage, breaking loop`);
          break;
        }

        hasMore = result.hasMore;
        lastCursor = result.nextSince;
        batches++;

        // Small delay between batches to avoid overwhelming the device
        if (hasMore) {
          await this.sleep(100);
        }
      }

      state.status = "complete";
      state.changesApplied = totalApplied;
      console.log(`[StagedPullCoordinator] Historical stage complete: ${totalApplied} changes`);
    } catch (error) {
      state.status = "error";
      state.error = error instanceof Error ? error.message : String(error);
      console.error(`[StagedPullCoordinator] Historical stage failed:`, state.error);
    }

    this.notifyProgress(state);
    return state;
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
    const critical = await this.loadCriticalData();
    
    // Stage 2: Recent Sales (blocking)
    const recent = await this.loadRecentSales();
    
    // Return control to app - it's now usable
    // Stage 3: Historical (background)
    const historical = this.loadHistoricalData();
    
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
