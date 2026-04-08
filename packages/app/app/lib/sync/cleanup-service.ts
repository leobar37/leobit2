/**
 * Sync Cleanup Service
 * 
 * Handles cleanup of sync data on logout or business switch.
 * Prevents data leakage between sessions and businesses.
 */

import type { PGlite } from "@electric-sql/pglite";
import type { ISyncQueue } from "./types";

export type CleanupScope = "logout" | "business_switch" | "token_expiry";

export interface CleanupResult {
  operationsDeleted: number;
  deadLetterDeleted: number;
  cursorsCleared: boolean;
}

/**
 * Cleanup service for sync data
 */
export class SyncCleanupService {
  constructor(
    private pg: PGlite,
    private businessId: string,
    private queue?: ISyncQueue
  ) {}

  /**
   * Clean up sync data based on scope
   * 
   * - logout: Clear all sync data (user is leaving)
   * - business_switch: Clear cursor only (pending operations stay, go to new business)
   * - token_expiry: Clear pending operations (auth invalidated, can't sync)
   */
  async cleanup(scope: CleanupScope): Promise<CleanupResult> {
    console.log(`[SyncCleanup] Starting cleanup for scope: ${scope}`);

    const result: CleanupResult = {
      operationsDeleted: 0,
      deadLetterDeleted: 0,
      cursorsCleared: false,
    };

    switch (scope) {
      case "logout":
        result.operationsDeleted = await this.clearOperations();
        result.deadLetterDeleted = await this.clearDeadLetter();
        await this.queue?.cleanupCompleted(7);
        result.cursorsCleared = await this.clearCursors();
        break;

      case "business_switch":
        // Only clear cursors - pending operations will sync to new business
        // Also cleanup old completed operations
        await this.queue?.cleanupCompleted(7);
        result.cursorsCleared = await this.clearCursors();
        break;

      case "token_expiry":
        // Clear pending operations - can't sync without valid auth
        result.operationsDeleted = await this.clearOperations();
        result.deadLetterDeleted = await this.clearDeadLetter();
        break;
    }

    console.log(`[SyncCleanup] Completed:`, result);
    return result;
  }

  /**
   * Clear all pending operations
   */
  private async clearOperations(): Promise<number> {
    try {
      const result = await this.pg.query(
        `DELETE FROM sync_operations WHERE business_id = $1 RETURNING id`,
        [this.businessId]
      );
      return result.rows.length;
    } catch (error) {
      console.error("[SyncCleanup] Failed to clear operations:", error);
      return 0;
    }
  }

  /**
   * Clear dead letter queue
   */
  private async clearDeadLetter(): Promise<number> {
    try {
      const result = await this.pg.query(
        `DELETE FROM sync_dead_letter WHERE business_id = $1 RETURNING id`,
        [this.businessId]
      );
      return result.rows.length;
    } catch (error) {
      console.error("[SyncCleanup] Failed to clear dead letter:", error);
      return 0;
    }
  }

  /**
   * Clear all sync-related cursors from localStorage
   */
  private async clearCursors(): Promise<boolean> {
    try {
      // Clear all keys that start with sync cursor prefixes
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("avileo_pull_cursor") || key.startsWith("avileo_sync_cursor"))) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      return true;
    } catch (error) {
      console.error("[SyncCleanup] Failed to clear cursors:", error);
      return false;
    }
  }
}

/**
 * Hook for cleanup operations
 */
export function useSyncCleanup(pg: PGlite, businessId: string) {
  return {
    cleanup: (scope: CleanupScope) => {
      const service = new SyncCleanupService(pg, businessId);
      return service.cleanup(scope);
    },
  };
}
