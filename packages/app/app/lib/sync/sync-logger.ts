/**
 * Sync Logger
 *
 * In-memory ring-buffer that captures warn and error log entries from the sync subsystem.
 * Entries are also forwarded to console.warn / console.error so devtools are not affected.
 *
 * Usage:
 *   import { syncLogger } from "~/lib/sync/sync-logger";
 *   syncLogger.warn("[PULL]", "Empty pull detected", { count: 3 });
 *   syncLogger.error("[SYNC]", "Operation failed", { id: "123" });
 *   const entries = syncLogger.getEntries();
 */

export interface SyncLogEntry {
  id: string;
  timestamp: Date;
  level: "warn" | "error";
  prefix: string;
  message: string;
  data?: unknown;
}

const MAX_ENTRIES = 50;

export class SyncLogger {
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
  getRecent(level?: "warn" | "error", limit?: number): SyncLogEntry[] {
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

export const syncLogger = new SyncLogger();
