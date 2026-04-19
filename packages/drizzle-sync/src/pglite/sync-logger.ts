/**
 * Sync Logger
 *
 * In-memory ring-buffer that captures info, warn and error log entries from the sync subsystem.
 * Entries are also forwarded to console.info / console.warn / console.error so devtools are not affected.
 *
 * Implements ISyncLogger interface from core for cross-platform compatibility.
 *
 * Usage:
 *   import { syncLogger } from "./sync-logger";
 *   syncLogger.info("[PgSyncQueue]", "Enqueued operation", { id: "123" });
 *   syncLogger.warn("[PULL]", "Empty pull detected", { count: 3 });
 *   syncLogger.error("[SYNC]", "Operation failed", { id: "123" });
 *   const entries = syncLogger.getEntries();
 */

import type { ISyncLogger } from "../core";
import type { SyncLogLevel, SyncLogEntry } from "./types";

const MAX_ENTRIES = 50;

/**
 * Sync logger implementation.
 *
 * Provides in-memory ring-buffer logging for sync operations.
 * This is the PGlite-specific implementation that matches the existing
 * implementation in packages/app/app/lib/sync/sync-logger.ts.
 *
 * Implements ISyncLogger interface for compatibility with the core logging contract.
 */
export class SyncLogger implements ISyncLogger {
  private entries: SyncLogEntry[] = [];

  private push(entry: SyncLogEntry): void {
    this.entries.push(entry);
    if (this.entries.length > MAX_ENTRIES) {
      this.entries.shift();
    }
  }

  private makeId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  info(prefix: string, message: string, data?: unknown): void {
    const entry: SyncLogEntry = {
      id: this.makeId(),
      timestamp: new Date(),
      level: "info",
      prefix,
      message,
      data,
    };
    this.push(entry);
    if (data !== undefined) {
      console.info(`[${prefix}] ${message}`, data);
    } else {
      console.info(`[${prefix}] ${message}`);
    }
  }

  warn(prefix: string, message: string, data?: unknown): void {
    const entry: SyncLogEntry = {
      id: this.makeId(),
      timestamp: new Date(),
      level: "warn",
      prefix,
      message,
      data,
    };
    this.push(entry);
    if (data !== undefined) {
      console.warn(`[${prefix}] ${message}`, data);
    } else {
      console.warn(`[${prefix}] ${message}`);
    }
  }

  error(prefix: string, message: string, data?: unknown): void {
    const entry: SyncLogEntry = {
      id: this.makeId(),
      timestamp: new Date(),
      level: "error",
      prefix,
      message,
      data,
    };
    this.push(entry);
    if (data !== undefined) {
      console.error(`[${prefix}] ${message}`, data);
    } else {
      console.error(`[${prefix}] ${message}`);
    }
  }

  /**
   * Returns all buffered entries, oldest first (newest last).
   */
  getEntries(): SyncLogEntry[] {
    return this.entries;
  }

  /**
   * Returns entries optionally filtered by level and limited in count.
   */
  getRecent(level?: SyncLogLevel, limit?: number): SyncLogEntry[] {
    let result = level ? this.entries.filter((e) => e.level === level) : this.entries;
    if (limit) {
      result = result.slice(-limit);
    }
    return result;
  }

  clear(): void {
    this.entries = [];
  }
}

/**
 * Global singleton instance for the sync subsystem.
 */
export const syncLogger = new SyncLogger();
