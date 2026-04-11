/**
 * Pull Service
 * Fetches changes from the server using /sync/changes endpoint
 * Updates local PGlite database and invalidates TanStack Query when new data arrives
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { PULL_INTERVAL_MS, MAX_STALE_PULLS, MAX_EMPTY_PULLS } from "./config";
import { getLocalDatabaseNamespace, getPullCursorStorageKey } from "~/lib/session-storage";
import type { PullChange, PullResponse, PullResult, PullStatus } from "./types";
import { syncEvents } from "./sync-events";
import { syncLogger } from "./sync-logger";

// Re-export types for backward compatibility
export type { PullStatus, PullResult, PullChange, PullResponse } from "./types";
import { applyChange, applyChangesBatch } from "./change-applier";
import { calculateBackoffDelay } from "./backoff";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5201";

/**
 * Configuration for pull execution
 */
interface PullExecutionConfig {
  entityTypes?: string[];
  since?: string;
  limit?: number;
  cursorKey?: string;
  useDefaultCursor: boolean;
  applyBackoff: boolean;
}

export class PullService {
  private pg: PGlite;
  private db: ReturnType<typeof drizzle>;
  private businessId: string;
  private authToken: string;
  private syncGroupId: string | null = null;
  private pullIntervalId: ReturnType<typeof setInterval> | null = null;
  private lastSince: string | null = null;
  private onChangesApplied: ((entityTypes: string[]) => void) | null = null;
  
  // Retry backoff state
  private consecutiveFailures: number = 0;
  private currentBackoff: number = 0;
  
  // Status tracking
  private isPullingFlag: boolean = false;
  private lastPullTime: Date | null = null;
  private lastError: string | null = null;
  private cursorStorageKey: string;

  // Cursor persistence failure tracking
  private failedStorageAttempts: number = 0;

  // Stale pull detection - cursor not advancing
  private consecutiveStalePulls: number = 0;
  private lastNextSince: string | null = null;
  private consecutiveEmptyPulls: number = 0;
  private isStuck: boolean = false;

  // Abort controller for cancelling in-flight requests
  private abortController: AbortController | null = null;

  constructor(
    pg: PGlite,
    db: ReturnType<typeof drizzle>,
    businessId: string,
    authToken: string,
    syncGroupId?: string | null
  ) {
    this.pg = pg;
    this.db = db;
    this.businessId = businessId;
    this.authToken = authToken;
    this.syncGroupId = syncGroupId ?? null;
    this.cursorStorageKey = getPullCursorStorageKey(getLocalDatabaseNamespace());
  }

  /**
   * Initialize the pull service
   * Loads cursor from storage and prepares for operation
   */
  async initialize(): Promise<void> {
    this.loadCursor();
    console.log("[PullService] Initialized");
  }

  /**
   * Load cursor from localStorage
   */
  private loadCursor(): void {
    try {
      const stored = localStorage.getItem(this.cursorStorageKey);
      if (stored) {
        this.lastSince = stored;
        console.log(`[PullService] Loaded cursor from storage:`, this.lastSince);
      }
    } catch (e) {
      console.warn(`[PullService] Failed to load cursor from localStorage:`, e);
    }
  }

  /**
   * Save cursor to localStorage
   */
  private saveCursor(cursor: string): void {
    this.lastSince = cursor;
    try {
      localStorage.setItem(this.cursorStorageKey, cursor);
      this.failedStorageAttempts = 0;
    } catch (e) {
      this.failedStorageAttempts++;
      console.warn(`[PullService] Failed to persist cursor to localStorage (attempt ${this.failedStorageAttempts}):`, e);

      if (this.failedStorageAttempts >= 3) {
        console.warn(`[PullService] Clearing cursor to prevent stale sync state after ${this.failedStorageAttempts} failures`);
        this.lastSince = null;
        localStorage.removeItem(this.cursorStorageKey);
        this.failedStorageAttempts = 0;
      }
    }
  }

  /**
   * Clear cursor from localStorage
   */
  clearCursor(): void {
    this.lastSince = null;
    this.failedStorageAttempts = 0;
    try {
      localStorage.removeItem(this.cursorStorageKey);
    } catch (e) {
      console.warn(`[PullService] Failed to clear cursor:`, e);
    }
  }

  /**
   * Force reset when sync is stuck
   * Clears all stale state and restarts auto-pull
   */
  forceReset(): void {
    console.log(`[PullService] Force reset triggered`);
    this.isStuck = false;
    this.consecutiveStalePulls = 0;
    this.consecutiveEmptyPulls = 0;
    this.lastNextSince = null;
    this.consecutiveFailures = 0;
    this.currentBackoff = 0;
    this.lastError = null;
    this.clearCursor();
    // Restart auto-pull
    this.startAutoPull();
  }

  /**
   * Check if sync is currently stuck
   */
  getIsStuck(): boolean {
    return this.isStuck;
  }

  /**
   * Set callback for when changes are applied
   */
  setOnChangesApplied(callback: (entityTypes: string[]) => void): void {
    this.onChangesApplied = callback;
  }

  /**
   * Get current pull status
   */
  getStatus(): PullStatus {
    return {
      isPulling: this.isPullingFlag,
      lastPullTime: this.lastPullTime,
      lastError: this.lastError,
      consecutiveFailures: this.consecutiveFailures,
      cursor: this.lastSince,
      isStuck: this.isStuck,
      consecutiveStalePulls: this.consecutiveStalePulls,
    };
  }

  /**
   * Calculate backoff delay based on consecutive failures
   */
  private getBackoffDelay(): number {
    return calculateBackoffDelay(this.consecutiveFailures);
  }

  /**
   * Set the sync group ID for filtering changes
   */
  setSyncGroupId(syncGroupId: string | null): void {
    this.syncGroupId = syncGroupId;
  }

  /**
   * Get current sync group ID
   */
  getSyncGroupId(): string | null {
    return this.syncGroupId;
  }

  /**
   * Fetch changes from the server with pagination support
   * Delegates to executePull with default options
   */
  async pull(): Promise<PullResult> {
    const result = await this.executePull({
      useDefaultCursor: true,
      applyBackoff: true,
    });
    
    return {
      success: result.success,
      changesApplied: result.changesApplied,
      hasMore: result.hasMore,
      error: result.error,
    };
  }

  /**
   * Pull changes with specific options (for staged loading)
   * This method allows filtering by entity types and custom cursors
   * Used by StagedPullCoordinator for loading data in stages
   */
  async pullWithOptions(options: {
    entityTypes?: string[];
    since?: string;
    limit?: number;
    cursorKey?: string;
  }): Promise<PullResult & { nextSince: string | null }> {
    return this.executePull({
      entityTypes: options.entityTypes,
      since: options.since,
      limit: options.limit,
      cursorKey: options.cursorKey,
      useDefaultCursor: false,
      applyBackoff: false,
    });
  }

  /**
   * Core pull execution logic shared by pull() and pullWithOptions().
   * Refactored into smaller private methods for maintainability.
   */
  private async executePull(config: PullExecutionConfig): Promise<PullResult & { nextSince: string | null }> {
    // Guard: prevent concurrent pulls
    const { canProceed, result: earlyResult } = this.canStartPull();
    if (!canProceed) {
      return earlyResult!;
    }

    this.setupPull();

    try {
      // Pre-pull setup: backoff, build URL, fetch
      await this.maybeApplyBackoff(config);
      const url = this.buildPullUrl(config);

      // Execute fetch and handle HTTP/validation errors
      const fetchResult = await this.executeFetch(url, config);
      if (!fetchResult.success) {
        return fetchResult.result;
      }

      const { body, cursor } = fetchResult;
      const { changes, nextSince, hasMore = false } = body.data!;

      // Log received changes
      console.log(`[PULL] 📥 Received ${changes.length} changes`, {
        cursor: cursor?.slice(0, 20),
        nextSince: nextSince?.slice(0, 20),
        hasMore,
      });

      // Stale pull detection
      const staleCheck = this.checkStalePull(config, cursor, nextSince, hasMore, changes.length);
      if (staleCheck.isStuck) {
        return staleCheck.result!;
      }

      // Early exit for no changes
      if (changes.length === 0) {
        console.log(`[PULL] ✅ No new changes`);
        return { success: true, changesApplied: 0, hasMore, nextSince };
      }

      // Persist cursor BEFORE applying changes (crash safety)
      this.persistCursor(config, nextSince);

      // Apply changes and notify
      const { appliedCount } = await this.applyChanges(changes, config);

      return {
        success: true,
        changesApplied: appliedCount,
        hasMore,
        nextSince,
      };
    } catch (error) {
      return this.handlePullError(error, config);
    } finally {
      this.isPullingFlag = false;
    }
  }

  // ==================== Private Helper Methods ====================

  /**
   * Check if pull can proceed (not already in progress)
   */
  private canStartPull(): { canProceed: boolean; result?: PullResult & { nextSince: string | null } } {
    if (this.isPullingFlag) {
      return {
        canProceed: false,
        result: {
          success: false,
          changesApplied: 0,
          hasMore: false,
          error: "Pull already in progress",
          nextSince: null,
        },
      };
    }
    return { canProceed: true };
  }

  /**
   * Setup abort controller for the pull
   */
  private setupPull(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    this.isPullingFlag = true;
  }

  /**
   * Apply backoff delay if needed
   */
  private async maybeApplyBackoff(config: PullExecutionConfig): Promise<void> {
    if (config.applyBackoff && this.currentBackoff > 0) {
      console.log(`[PullService] Waiting ${this.currentBackoff}ms due to previous failures`);
      await new Promise((resolve) => setTimeout(resolve, this.currentBackoff));
    }
  }

  /**
   * Build the pull URL with all query parameters
   */
  private buildPullUrl(config: PullExecutionConfig): URL {
    const url = new URL(`${API_URL}/sync/changes`);

    // Determine which cursor to use
    // Priority: 1) saved stage cursor, 2) since parameter, 3) default cursor
    const cursor = config.useDefaultCursor
      ? this.lastSince
      : (this.loadStageCursor(config.cursorKey) ?? config.since);

    if (cursor) {
      url.searchParams.set("since", cursor);
    }

    url.searchParams.set("limit", String(config.limit ?? 100));

    // Add entity types filter for staged loading
    if (config.entityTypes && config.entityTypes.length > 0) {
      url.searchParams.set("entityTypes", config.entityTypes.join(","));
    }

    if (this.syncGroupId) {
      url.searchParams.set("syncGroupId", this.syncGroupId);
    }

    return url;
  }

  /**
   * Execute the fetch request and handle HTTP errors
   */
  private async executeFetch(
    url: URL,
    config: PullExecutionConfig
  ): Promise<
    | { success: true; body: { success: boolean; data?: PullResponse; error?: { code: string; message: string } }; cursor: string | null }
    | { success: false; result: PullResult & { nextSince: string | null } }
  > {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.authToken}`,
        "x-business-id": this.businessId,
      },
      signal: this.abortController!.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();

      if (config.applyBackoff) {
        this.consecutiveFailures++;
        this.currentBackoff = this.getBackoffDelay();
        this.lastError = `Pull failed: ${response.status} ${errorText}`;
      }

      return {
        success: false,
        result: {
          success: false,
          changesApplied: 0,
          hasMore: false,
          error: config.applyBackoff ? (this.lastError ?? undefined) : `Pull failed: ${response.status} ${errorText}`,
          nextSince: null,
        },
      };
    }

    const body = (await response.json()) as {
      success: boolean;
      data?: PullResponse;
      error?: { code: string; message: string };
    };

    // Validate response
    if (!body.success || !body.data?.changes) {
      const errorMsg = body.error?.message || "Invalid response from server";

      if (config.applyBackoff) {
        this.consecutiveFailures++;
        this.currentBackoff = this.getBackoffDelay();
        this.lastError = errorMsg;
      }

      return {
        success: false,
        result: {
          success: false,
          changesApplied: 0,
          hasMore: false,
          error: errorMsg,
          nextSince: null,
        },
      };
    }

    // Success - reset failure count
    if (config.applyBackoff) {
      this.consecutiveFailures = 0;
      this.currentBackoff = 0;
      this.lastError = null;
    }

    // Extract cursor from URL for logging
    const cursor = url.searchParams.get("since");

    return { success: true, body, cursor };
  }

  /**
   * Check for stale pull conditions
   */
  private checkStalePull(
    config: PullExecutionConfig,
    cursor: string | null,
    nextSince: string,
    hasMore: boolean,
    changesCount: number
  ): { isStuck: boolean; result?: PullResult & { nextSince: string | null } } {
    if (!config.applyBackoff) {
      return { isStuck: false };
    }

    const cursorAdvanced = nextSince && nextSince !== this.lastNextSince;

    if (cursorAdvanced) {
      // Cursor advanced - reset stale counters
      this.consecutiveStalePulls = 0;
      this.consecutiveEmptyPulls = 0;
      console.log(`[PULL] ✅ Cursor advanced, stale counters reset`);
    } else if (hasMore) {
      // Cursor didn't advance but server says there's more - potential infinite loop
      if (changesCount === 0) {
        this.consecutiveEmptyPulls++;
        syncLogger.warn("[PULL]", `Empty pull #${this.consecutiveEmptyPulls} with hasMore=true`);

        if (this.consecutiveEmptyPulls >= MAX_EMPTY_PULLS) {
          this.isStuck = true;
          syncLogger.error("[PULL]", `STUCK: ${MAX_EMPTY_PULLS} consecutive empty pulls`);
          syncEvents.emit("pull:stale", {
            consecutiveStalePulls: this.consecutiveEmptyPulls,
            reason: "empty-pulls",
          });
          this.stopAutoPull();
          return {
            isStuck: true,
            result: {
              success: false,
              changesApplied: 0,
              hasMore: false,
              error: `Sync stuck: ${MAX_EMPTY_PULLS} empty pulls. Please refresh or re-login.`,
              nextSince: null,
            },
          };
        }
      } else {
        // Cursor didn't advance but we got changes - still counts as stale
        this.consecutiveStalePulls++;
        syncLogger.warn("[PULL]", `Cursor stuck #${this.consecutiveStalePulls} (got ${changesCount} changes but cursor same)`);

        if (this.consecutiveStalePulls >= MAX_STALE_PULLS) {
          this.isStuck = true;
          syncLogger.error("[PULL]", `STUCK: Cursor stuck after ${MAX_STALE_PULLS} pulls`);
          syncEvents.emit("pull:stale", {
            consecutiveStalePulls: this.consecutiveStalePulls,
            reason: "cursor-stuck",
          });
          this.stopAutoPull();
          return {
            isStuck: true,
            result: {
              success: false,
              changesApplied: 0,
              hasMore: false,
              error: `Sync stuck: cursor not advancing after ${MAX_STALE_PULLS} pulls. Please refresh or re-login.`,
              nextSince: null,
            },
          };
        }
      }
    }

    // Update last cursor for next comparison
    this.lastNextSince = nextSince;

    return { isStuck: false };
  }

  /**
   * Persist the cursor to storage
   */
  private persistCursor(config: PullExecutionConfig, nextSince: string | undefined): void {
    if (!nextSince) return;

    if (config.cursorKey) {
      this.saveStageCursor(config.cursorKey, nextSince);
    } else if (config.useDefaultCursor) {
      this.saveCursor(nextSince);
      console.log(`[PULL] 💾 Cursor saved:`, {
        cursor: nextSince.slice(0, 20),
        memoryCursor: this.lastSince?.slice(0, 20),
        storageOk: this.failedStorageAttempts === 0,
      });
    }
  }

  /**
   * Apply changes to local database and notify listeners
   */
  private async applyChanges(
    changes: PullChange[],
    config: PullExecutionConfig
  ): Promise<{ appliedCount: number; entityTypes: Set<string> }> {
    const { entityTypes, failedChanges } = await applyChangesBatch(
      this.pg,
      this.db,
      changes,
      this.businessId
    );
    const appliedCount = changes.length - failedChanges.length;

    // Update last pull time
    if (config.applyBackoff) {
      this.lastPullTime = new Date();
    }

    // Notify about changes via callback and events
    if (entityTypes.size > 0) {
      if (this.onChangesApplied) {
        this.onChangesApplied(Array.from(entityTypes));
      }
      syncEvents.emit("pull:completed", {
        changesApplied: appliedCount,
        entityTypes: Array.from(entityTypes),
      });
    }

    // Log summary
    if (failedChanges.length > 0) {
      syncLogger.warn("[Pull]", `Applied ${appliedCount}/${changes.length} changes. ${failedChanges.length} failed.`);
    } else {
      console.log(`[Pull] ✅ Applied all ${appliedCount} changes successfully`);
    }

    return { appliedCount, entityTypes };
  }

  /**
   * Handle pull error (abort vs other errors)
   */
  private handlePullError(
    error: unknown,
    config: PullExecutionConfig
  ): PullResult & { nextSince: string | null } {
    // Handle abort gracefully
    if (error instanceof Error && error.name === "AbortError") {
      console.log("[PullService] Pull was aborted");
      return {
        success: false,
        changesApplied: 0,
        hasMore: false,
        error: "Aborted",
        nextSince: null,
      };
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (config.applyBackoff) {
      this.consecutiveFailures++;
      this.currentBackoff = this.getBackoffDelay();
      this.lastError = errorMessage;
    }

    syncEvents.emit("pull:error", { error: errorMessage });

    return {
      success: false,
      changesApplied: 0,
      hasMore: false,
      error: errorMessage,
      nextSince: null,
    };
  }

  /**
   * Pull all changes until no more available
   */
  async pullAll(): Promise<{ totalApplied: number; errors: string[] }> {
    let totalApplied = 0;
    const errors: string[] = [];

    while (true) {
      const result = await this.pull();
      
      if (!result.success) {
        if (result.error) {
          errors.push(result.error);
        }
        break;
      }

      totalApplied += result.changesApplied;

      if (!result.hasMore) {
        break;
      }
    }

    return { totalApplied, errors };
  }

  /**
   * Get stage cursor (public accessor for StagedPullCoordinator)
   */
  getStageCursor(stageKey: string): string | null {
    return this.loadStageCursor(stageKey);
  }

  /**
   * Load cursor for a specific stage
   */
  private loadStageCursor(stageKey?: string): string | null {
    if (!stageKey) return this.lastSince;

    try {
      const key = `${this.cursorStorageKey}_${stageKey}`;
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`[PullService] Failed to load stage cursor:`, e);
      return null;
    }
  }

  /**
   * Save cursor for a specific stage
   */
  private saveStageCursor(stageKey: string, cursor: string): void {
    try {
      const key = `${this.cursorStorageKey}_${stageKey}`;
      localStorage.setItem(key, cursor);
    } catch (e) {
      console.warn(`[PullService] Failed to save stage cursor:`, e);
    }
  }

  /**
   * Start periodic pull
   */
  startAutoPull(): void {
    if (this.pullIntervalId) {
      return;
    }

    // Reset stale pull detection state for clean restart
    this.isStuck = false;
    this.consecutiveStalePulls = 0;
    this.consecutiveEmptyPulls = 0;

    this.pullIntervalId = setInterval(async () => {
      if (navigator.onLine && !this.isPullingFlag) {
        await this.pull();
      }
    }, PULL_INTERVAL_MS);

    // Also do an immediate pull when starting
    this.pull();
  }

  /**
   * Stop periodic pull
   */
  stopAutoPull(): void {
    if (this.pullIntervalId) {
      clearInterval(this.pullIntervalId);
      this.pullIntervalId = null;
    }
    // Cancel any in-flight request
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Check if auto pull is currently running
   */
  isRunning(): boolean {
    return !!this.pullIntervalId;
  }

  /**
   * Abort any in-flight pull request
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Force a pull and wait for it to complete
   */
  async forcePullNow(): Promise<PullResult> {
    return this.pull();
  }

  /**
   * Get last sync timestamp
   */
  getLastSince(): string | null {
    return this.lastSince;
  }
}
