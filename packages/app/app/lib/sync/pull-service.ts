/**
 * Pull Service
 * Fetches changes from the server using /sync/changes endpoint
 * Updates local PGlite database and invalidates TanStack Query when new data arrives
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { PULL_INTERVAL_MS } from "./config";
import { getLocalDatabaseNamespace, getPullCursorStorageKey } from "~/lib/session-storage";
import type { PullChange, PullResponse, PullResult, PullStatus } from "./types";

// Re-export types for backward compatibility
export type { PullStatus, PullResult, PullChange, PullResponse } from "./types";
import { applyChange } from "./change-applier";
import { calculateBackoffDelay } from "./backoff";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5201";

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

    // Load persisted cursor from localStorage
    this.loadCursor();
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
    try {
      localStorage.setItem(this.cursorStorageKey, cursor);
      this.lastSince = cursor;
    } catch (e) {
      console.warn(`[PullService] Failed to save cursor to localStorage:`, e);
    }
  }

  /**
   * Clear cursor from localStorage
   */
  clearCursor(): void {
    try {
      localStorage.removeItem(this.cursorStorageKey);
      this.lastSince = null;
    } catch (e) {
      console.warn(`[PullService] Failed to clear cursor:`, e);
    }
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
   */
  async pull(): Promise<PullResult> {
    // Prevent concurrent pulls
    if (this.isPullingFlag) {
      return { success: false, changesApplied: 0, hasMore: false, error: "Pull already in progress" };
    }

    this.isPullingFlag = true;

    try {
      // Apply backoff if we have consecutive failures
      if (this.currentBackoff > 0) {
        console.log(`[PullService] Waiting ${this.currentBackoff}ms due to previous failures`);
        await new Promise((resolve) => setTimeout(resolve, this.currentBackoff));
      }

      const url = new URL(`${API_URL}/sync/changes`);
      if (this.lastSince) {
        url.searchParams.set("since", this.lastSince);
      }
      url.searchParams.set("limit", "100");
      if (this.syncGroupId) {
        url.searchParams.set("syncGroupId", this.syncGroupId);
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          "x-business-id": this.businessId,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Increment failure count for backoff
        this.consecutiveFailures++;
        this.currentBackoff = this.getBackoffDelay();
        this.lastError = `Pull failed: ${response.status} ${errorText}`;
        
        return {
          success: false,
          changesApplied: 0,
          hasMore: false,
          error: this.lastError,
        };
      }

      const body = (await response.json()) as { 
        success: boolean; 
        data: PullResponse;
        hasMore?: boolean;
      };

      if (!body.success || !body.data?.changes) {
        this.consecutiveFailures++;
        this.currentBackoff = this.getBackoffDelay();
        this.lastError = "Invalid response format";
        
        return {
          success: false,
          changesApplied: 0,
          hasMore: false,
          error: this.lastError,
        };
      }

      // Reset failure count on success
      this.consecutiveFailures = 0;
      this.currentBackoff = 0;
      this.lastError = null;

      const { changes, nextSince, hasMore = false, serverTimestamp } = body.data;

      const entityCounts = changes.reduce((acc, c) => {
        acc[c.entityType] = (acc[c.entityType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log(`[PULL] 📥 Received changes:`, {
        count: changes.length,
        cursor: this.lastSince?.slice(0, 20),
        nextSince: nextSince?.slice(0, 20),
        hasMore,
        serverTimestamp,
        entityTypes: entityCounts,
        // ALL_CHANGES removed - potential circular reference issues
      });

      if (changes.length === 0) {
        console.log(`[PULL] ✅ No new changes`);
        return {
          success: true,
          changesApplied: 0,
          hasMore,
        };
      }

      // Update last pull time
      this.lastPullTime = serverTimestamp ? new Date(serverTimestamp) : new Date();

      if (changes.length === 0) {
        return { success: true, changesApplied: 0, hasMore: false };
      }

      // Apply each change to local database
      const entityTypes = new Set<string>();
      let appliedCount = 0;
      const failedChanges: Array<{ change: PullChange; error: string }> = [];

      for (const change of changes) {
        const result = await applyChange(this.pg, this.db, change, this.businessId);
        
        if (result.success) {
          entityTypes.add(change.entityType);
          appliedCount++;
        } else {
          console.error(`[Pull] Failed to apply change for ${change.entityType}:${change.entityId}:`, result.error);
          failedChanges.push({ change, error: result.error || "Unknown error" });
        }
      }

      // Persist cursor to localStorage only if we applied at least one change
      if (nextSince && appliedCount > 0) {
        this.saveCursor(nextSince);
      }

      // Notify about changes
      if (entityTypes.size > 0 && this.onChangesApplied) {
        this.onChangesApplied(Array.from(entityTypes));
      }

      // Log summary if there were failures
      if (failedChanges.length > 0) {
        console.warn(`[Pull] Applied ${appliedCount}/${changes.length} changes. ${failedChanges.length} failed.`);
      } else {
        console.log(`[Pull] ✅ Applied all ${appliedCount} changes successfully`);
      }

      return {
        success: true,
        changesApplied: appliedCount,
        hasMore,
      };
    } catch (error) {
      // Increment failure count for backoff
      this.consecutiveFailures++;
      this.currentBackoff = this.getBackoffDelay();
      this.lastError = error instanceof Error ? error.message : String(error);
      
      return {
        success: false,
        changesApplied: 0,
        hasMore: false,
        error: this.lastError,
      };
    } finally {
      this.isPullingFlag = false;
    }
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
   * Pull changes with specific options (for staged loading)
   * This method allows filtering by entity types and custom cursors
   * Used by StagedPullCoordinator for loading data in stages
   */
  async pullWithOptions(options: {
    entityTypes?: string[];
    since?: string;
    limit?: number;
    cursorKey?: string; // Key for saving/loading cursor (for per-stage cursors)
  }): Promise<PullResult & { nextSince: string | null }> {
    // Prevent concurrent pulls
    if (this.isPullingFlag) {
      return { success: false, changesApplied: 0, hasMore: false, error: "Pull already in progress", nextSince: null };
    }

    this.isPullingFlag = true;

    try {
      const url = new URL(`${API_URL}/sync/changes`);
      
      // Use provided cursor or load from stage-specific storage
      const cursor = options.since ?? this.loadStageCursor(options.cursorKey);
      if (cursor) {
        url.searchParams.set("since", cursor);
      }
      
      url.searchParams.set("limit", String(options.limit ?? 100));
      
      // Add entity types filter for staged loading
      if (options.entityTypes && options.entityTypes.length > 0) {
        url.searchParams.set("entityTypes", options.entityTypes.join(","));
      }

      if (this.syncGroupId) {
        url.searchParams.set("syncGroupId", this.syncGroupId);
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          "x-business-id": this.businessId,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          changesApplied: 0,
          hasMore: false,
          error: `Pull failed: ${response.status} ${errorText}`,
          nextSince: null,
        };
      }

      const body = (await response.json()) as { 
        success: boolean; 
        data?: PullResponse;
        error?: { code: string; message: string };
      };

      if (!body.success || !body.data) {
        return {
          success: false,
          changesApplied: 0,
          hasMore: false,
          error: body.error?.message || "Invalid response from server",
          nextSince: null,
        };
      }

      const { changes, nextSince, hasMore } = body.data;

      // Apply each change to local database (sequential, no concurrency)
      const entityTypes = new Set<string>();
      let appliedCount = 0;
      const failedChanges: Array<{ change: PullChange; error: string }> = [];

      for (const change of changes) {
        const result = await applyChange(this.pg, this.db, change, this.businessId);
        
        if (result.success) {
          entityTypes.add(change.entityType);
          appliedCount++;
        } else {
          console.error(`[Pull] Failed to apply change for ${change.entityType}:${change.entityId}:`, result.error);
          failedChanges.push({ change, error: result.error || "Unknown error" });
        }
      }

      // Persist cursor to localStorage (stage-specific if provided)
      if (nextSince && appliedCount > 0) {
        if (options.cursorKey) {
          this.saveStageCursor(options.cursorKey, nextSince);
        } else {
          this.saveCursor(nextSince);
        }
      }

      // Notify about changes
      if (entityTypes.size > 0 && this.onChangesApplied) {
        this.onChangesApplied(Array.from(entityTypes));
      }

      return {
        success: true,
        changesApplied: appliedCount,
        hasMore,
        nextSince,
      };
    } catch (error) {
      return {
        success: false,
        changesApplied: 0,
        hasMore: false,
        error: error instanceof Error ? error.message : String(error),
        nextSince: null,
      };
    } finally {
      this.isPullingFlag = false;
    }
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
