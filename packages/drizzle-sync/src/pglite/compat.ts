/**
 * Backward Compatibility Layer
 *
 * Provides legacy exports for apps still using the old API surface.
 * These wrappers delegate to the new domain classes internally.
 */

import type { PGlite } from "@electric-sql/pglite";
import type { SyncClientEngineContext } from "../client";
import type { PullChange } from "./types";
import type { ISyncLogger, SyncLogEntry } from "../core";
import { ChangeApplier } from "./change-applier";
import type { ApplyResult, ApplierOptions } from "./change-types";

// ---------------------------------------------------------------------------
// Ring Buffer Logger (legacy singleton)
// ---------------------------------------------------------------------------

const MAX_ENTRIES = 500;

class RingBufferLogger implements ISyncLogger {
  private entries: SyncLogEntry[] = [];
  private idCounter = 0;

  private push(level: SyncLogEntry["level"], prefix: string, message: string, data?: unknown): void {
    const entry: SyncLogEntry = {
      id: String(++this.idCounter),
      timestamp: new Date(),
      level,
      prefix,
      message,
      data,
    };
    this.entries.push(entry);
    if (this.entries.length > MAX_ENTRIES) {
      this.entries.shift();
    }
    // Also mirror to console for debuggability
    const consoleMethod = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    consoleMethod(`[${prefix}] ${message}`, data ?? "");
  }

  info(prefix: string, message: string, data?: unknown): void {
    this.push("info", prefix, message, data);
  }

  warn(prefix: string, message: string, data?: unknown): void {
    this.push("warn", prefix, message, data);
  }

  error(prefix: string, message: string, data?: unknown): void {
    this.push("error", prefix, message, data);
  }

  debug(prefix: string, message: string, data?: unknown): void {
    this.push("debug", prefix, message, data);
  }

  getEntries(): SyncLogEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
  }
}

/** Legacy singleton logger used by the app layer. */
export const syncLogger = new RingBufferLogger();

// ---------------------------------------------------------------------------
// applyChange / applyChangesBatch wrappers
// ---------------------------------------------------------------------------

/** Options accepted by the legacy applyChange functions. */
export interface LegacyApplyOptions {
  maxRetries?: number;
  checkConflicts?: boolean;
  conflictStrategy?: ApplierOptions["conflictStrategy"];
  useTransaction?: boolean;
  logger?: ISyncLogger;
}

function buildContext(pg: PGlite, tenantId: string, tenantColumn?: string): SyncClientEngineContext {
  return {
    pg,
    tenantId,
    tenantColumn: tenantColumn ?? "tenant_id",
    db: undefined as any,
    userId: "",
    syncService: {} as any,
  };
}

/**
 * Legacy wrapper: apply a single change.
 * @deprecated Use `new ChangeApplier(context).apply(change)` instead.
 */
export async function applyChange(
  pg: PGlite,
  change: PullChange,
  tenantId: string,
  opts?: LegacyApplyOptions,
  tenantColumn?: string
): Promise<ApplyResult> {
  const context = buildContext(pg, tenantId, tenantColumn);
  const applier = new ChangeApplier(context, {
    maxRetries: opts?.maxRetries,
    checkConflicts: opts?.checkConflicts,
    conflictStrategy: opts?.conflictStrategy,
    logger: opts?.logger ?? syncLogger,
  });
  return applier.apply(change);
}

/**
 * Legacy wrapper: apply multiple changes.
 * @deprecated Use `new ChangeApplier(context).applyBatch(changes)` instead.
 */
export async function applyChangesBatch(
  pg: PGlite,
  changes: PullChange[],
  tenantId: string,
  opts?: LegacyApplyOptions,
  tenantColumn?: string
): Promise<{
  entityTypes: Set<string>;
  failedChanges: Array<{ change: PullChange; error: string }>;
}> {
  const context = buildContext(pg, tenantId, tenantColumn);
  const applier = new ChangeApplier(context, {
    maxRetries: opts?.maxRetries,
    checkConflicts: opts?.checkConflicts,
    conflictStrategy: opts?.conflictStrategy,
    logger: opts?.logger ?? syncLogger,
  });

  const batchResult = await applier.applyBatch(changes);

  // Map new result shape back to legacy shape
  const failedChanges: Array<{ change: PullChange; error: string }> = [];
  for (let i = 0; i < changes.length; i++) {
    const result = batchResult.results[i];
    if (!result.success) {
      failedChanges.push({
        change: changes[i],
        error: result.error?.message || "Unknown error",
      });
    }
  }

  return {
    entityTypes: batchResult.entityTypesAffected,
    failedChanges,
  };
}
