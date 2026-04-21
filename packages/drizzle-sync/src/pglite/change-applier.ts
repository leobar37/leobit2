/**
 * Change Applier
 * Applies sync changes to the local database using SqlExecutor abstraction
 */

import type { SyncClientEngineContext } from "../client/types";
import type { SqlExecutor } from "./sql-executor";
import type { PullChange } from "./types";
import type { ISyncLogger } from "../core";
import type { ApplyResult, BatchApplyResult, ApplierOptions, ConflictStrategy as ConflictCheckStrategy } from "./change-types";
import { createSqlExecutor } from "./sql-executor";
import { withRetry } from "../core";
import { isValidTableName } from "./schema-mapper";
import { NoOpLogger } from "./change-noop-logger";
import { executeInsert, executeUpdate, executeDelete } from "./change-strategies";
import { checkForConflict, computeConflictedIds } from "./change-conflict-checker";

export class ChangeApplier {
  private readonly executor: SqlExecutor;
  private readonly logger: ISyncLogger;
  private readonly businessId: string;

  constructor(
    private readonly context: SyncClientEngineContext,
    private readonly options?: ApplierOptions
  ) {
    this.executor = createSqlExecutor(context);
    this.logger = options?.logger ?? new NoOpLogger();
    this.businessId = context.businessId;
  }

  /**
   * Apply a single change to the local database with retry logic.
   */
  async apply(change: PullChange): Promise<ApplyResult> {
    const startTime = Date.now();
    const {
      maxRetries = 3,
      checkConflicts = true,
      conflictStrategy = "none",
    } = this.options ?? {};

    const tableName = change.entityType;

    // Validate table name for safety (SQL injection protection)
    if (!isValidTableName(tableName)) {
      return {
        success: false,
        operation: change.operation as 'insert' | 'update' | 'delete',
        entityType: tableName,
        entityId: change.entityId,
        durationMs: Date.now() - startTime,
        error: new Error(`Invalid table name: ${tableName}`),
      };
    }

    try {
      // Check for potential conflict with local unsynced changes
      if (checkConflicts && change.operation === "update") {
        const hasConflict = await checkForConflict(
          this.executor,
          tableName,
          change.entityId,
          conflictStrategy as ConflictCheckStrategy,
          new Set() // Individual checks don't use pre-computed set
        );
        if (hasConflict) {
          this.logger.warn(
            "[ChangeApplier]",
            `Potential conflict: ${tableName}:${change.entityId} has unsynced local changes`
          );
        }
      }

      // Apply operation with retry wrapper
      await withRetry(
        async () => {
          switch (change.operation) {
            case "create":
            case "insert":
              return await executeInsert(this.executor, tableName, change, this.businessId);

            case "update":
              return await executeUpdate(this.executor, tableName, change, this.businessId);

            case "delete":
              return await executeDelete(this.executor, tableName, change, this.businessId);

            default:
              throw new Error(`Unknown operation: ${change.operation}`);
          }
        },
        {
          maxRetries,
          retryDelayMs: 100,
          onRetry: (attempt) => {
            this.logger.warn(
              "[ChangeApplier]",
              `Retrying ${tableName}:${change.entityId} (attempt ${attempt})`
            );
          },
          context: "applyChange",
        }
      );

      return {
        success: true,
        operation: change.operation as 'insert' | 'update' | 'delete',
        entityType: tableName,
        entityId: change.entityId,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        operation: change.operation as 'insert' | 'update' | 'delete',
        entityType: tableName,
        entityId: change.entityId,
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Batch-apply multiple changes with optional transaction support.
   */
  async applyBatch(changes: PullChange[]): Promise<BatchApplyResult> {
    const startTime = Date.now();
    const {
      checkConflicts = true,
      maxRetries = 3,
    } = this.options ?? {};

    // Pre-compute conflicted IDs
    const conflictedIds = checkConflicts 
      ? await computeConflictedIds(this.executor, changes) 
      : new Set<string>();

    const entityTypes = new Set<string>();
    const results: ApplyResult[] = [];
    const failedChanges: Array<{ change: PullChange; error: string }> = [];

    for (const change of changes) {
      const result = await this.apply(change);
      results.push(result);

      if (result.success) {
        entityTypes.add(change.entityType);
      } else {
        this.logger.error(
          "[Pull]",
          `Failed to apply change for ${change.entityType}:${change.entityId}`,
          result.error?.message
        );
        failedChanges.push({ change, error: result.error?.message || "Unknown error" });
      }
    }

    const succeeded = results.filter(r => r.success).length;
    const conflicts = results.filter(r => r.conflictDetected).length;

    return {
      results,
      summary: {
        total: changes.length,
        succeeded,
        failed: failedChanges.length,
        conflicts,
        totalDurationMs: Date.now() - startTime,
      },
      entityTypesAffected: entityTypes,
    };
  }
}
