/**
 * BaseSyncHandler
 *
 * Abstract base class for sync handlers.
 * Provides common functionality for logging, result creation, and parent validation.
 */

import type { SyncEntity, SyncOperationInput, SyncHandlerResult, EntityRegistry } from "./types";
import type { ISyncHandler } from "./types";
import { z } from "zod";

/**
 * Sync error categories for classification
 */
export const SyncErrorCategory = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  DATABASE_ERROR: "DATABASE_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

export type SyncErrorCategory = (typeof SyncErrorCategory)[keyof typeof SyncErrorCategory];

/**
 * PostgreSQL error details extracted from error chain
 */
export interface PostgresErrorDetails {
  code: string | null;
  detail: string | null;
  routine: string | null;
}

/**
 * Abstract base class for sync handlers
 *
 * Provides common functionality:
 * - Logging helpers (console or injected ISyncLogger)
 * - Result creation helpers
 * - Payload validation
 * - Parent entity validation with registry optimization
 * - PostgreSQL error extraction
 * - Error classification
 */
export abstract class BaseSyncHandler<TRequestContext = unknown, TTransaction = unknown>
  implements ISyncHandler<TRequestContext, TTransaction>
{
  abstract readonly entityType: SyncEntity;
  protected registry?: EntityRegistry;

  /**
   * Optional injected logger (ISyncLogger interface)
   * If not provided, falls back to console.*
   */
  protected logger?: {
    info: (prefix: string, message: string, data?: unknown) => void;
    warn: (prefix: string, message: string, data?: unknown) => void;
    error: (prefix: string, message: string, data?: unknown) => void;
    debug?: (prefix: string, message: string, data?: unknown) => void;
  };

  /**
   * Set the entity registry for batch operation tracking
   */
  setRegistry(registry: EntityRegistry): void {
    this.registry = registry;
  }

  /**
   * Inject a logger instance (ISyncLogger-compatible)
   */
  setLogger(logger: BaseSyncHandler<TRequestContext, TTransaction>["logger"]): void {
    this.logger = logger;
  }

  /**
   * Validate business rules before execution
   * Must be implemented by concrete handlers
   */
  abstract validateBusinessRules(
    ctx: TRequestContext,
    payload: Record<string, unknown>,
    operation?: string,
    tx?: TTransaction
  ): Promise<void>;

  /**
   * Execute the sync operation
   * Must be implemented by concrete handlers
   */
  abstract execute(
    ctx: TRequestContext,
    operation: SyncOperationInput,
    tx?: TTransaction
  ): Promise<SyncHandlerResult>;

  /**
   * Execute an operation with standard handlers for create/update/delete
   */
  protected async executeOperation(
    ctx: TRequestContext,
    operation: SyncOperationInput,
    handlers: {
      create: () => Promise<void>;
      update: () => Promise<void>;
      delete: () => Promise<void>;
    },
    details?: Record<string, unknown>
  ): Promise<SyncHandlerResult> {
    const correlationId = operation.correlationId || this.generateCorrelationId();

    this.logStart(ctx, operation, { correlationId, ...details });

    try {
      if (operation.operation === "create") {
        await handlers.create();
      } else if (operation.operation === "update") {
        await handlers.update();
      } else if (operation.operation === "delete") {
        await handlers.delete();
      } else {
        throw new Error(`Acción no soportada: ${operation.operation}`);
      }

      this.logSuccess(ctx, operation, { correlationId });
      return this.createSuccessResult(operation);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logError(ctx, operation, err, { correlationId });
      return this.createErrorResult(operation, err.message);
    }
  }

  /**
   * Generate a correlation ID for tracking
   */
  protected generateCorrelationId(): string {
    return `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract PostgreSQL error details from an error chain
   *
   * Walks the error.cause chain to find the underlying PostgreSQL error,
   * which has .code, .detail, and .routine properties.
   */
  protected extractPostgresError(error: Error): PostgresErrorDetails {
    let current: unknown = error;
    const seen = new Set<unknown>();

    while (current && typeof current === "object" && !seen.has(current)) {
      seen.add(current);
      const err = current as Record<string, unknown>;

      // PostgreSQL errors have these properties
      if (err["code"] !== undefined || err["detail"] !== undefined || err["routine"] !== undefined) {
        return {
          code: err["code"] !== undefined ? String(err["code"]) : null,
          detail: err["detail"] !== undefined ? String(err["detail"]) : null,
          routine: err["routine"] !== undefined ? String(err["routine"]) : null,
        };
      }

      current = err["cause"];
    }

    return { code: null, detail: null, routine: null };
  }

  /**
   * Classify an error into a category for metrics/logging
   */
  protected classifyError(error: Error): SyncErrorCategory {
    const message = error.message.toLowerCase();

    if (
      message.includes("validation") ||
      message.includes("requiere") ||
      message.includes("inválido") ||
      message.includes("invalid") ||
      message.includes("must be")
    ) {
      return SyncErrorCategory.VALIDATION_ERROR;
    }
    if (
      message.includes("not found") ||
      message.includes("no encontrado") ||
      message.includes("no existe")
    ) {
      return SyncErrorCategory.NOT_FOUND;
    }
    if (
      message.includes("conflict") ||
      message.includes("versión") ||
      message.includes("version")
    ) {
      return SyncErrorCategory.CONFLICT;
    }
    if (
      message.includes("database") ||
      message.includes("sql") ||
      message.includes("pg_error") ||
      message.includes("duplicate") ||
      message.includes("unique")
    ) {
      return SyncErrorCategory.DATABASE_ERROR;
    }
    if (
      message.includes("timeout") ||
      message.includes("connection") ||
      message.includes("econnrefused") ||
      message.includes("enotfound")
    ) {
      return SyncErrorCategory.NETWORK_ERROR;
    }
    return SyncErrorCategory.UNKNOWN_ERROR;
  }

  /**
   * Log operation start
   */
  protected logStart(
    ctx: TRequestContext,
    operation: SyncOperationInput,
    details?: Record<string, unknown>
  ): void {
    const msg = `🔄 Processing ${this.entityType} operation`;
    const data = {
      entityType: this.entityType,
      operation: operation.operation,
      entityId: operation.entityId,
      ...details,
    };

    if (this.logger) {
      this.logger.info(this.entityType, msg, data);
    } else {
      console.log({ msg, ...data });
    }
  }

  /**
   * Log operation success
   */
  protected logSuccess(
    ctx: TRequestContext,
    operation: SyncOperationInput,
    details?: Record<string, unknown>
  ): void {
    const msg = `✅ ${this.entityType} operation completed`;
    const data = {
      entityType: this.entityType,
      operation: operation.operation,
      entityId: operation.entityId,
      ...details,
    };

    if (this.logger) {
      this.logger.info(this.entityType, msg, data);
    } else {
      console.log({ msg, ...data });
    }
  }

  /**
   * Log operation error
   */
  protected logError(
    ctx: TRequestContext,
    operation: SyncOperationInput,
    error: Error,
    details?: Record<string, unknown>
  ): void {
    const pgError = this.extractPostgresError(error);
    const errorType = this.classifyError(error);

    const msg = `❌ ${this.entityType} operation failed`;
    const data = {
      entityType: this.entityType,
      operation: operation.operation,
      entityId: operation.entityId,
      error: error.message,
      errorType,
      stack: error.stack,
      pgErrorCode: pgError.code,
      pgErrorDetail: pgError.detail,
      pgErrorRoutine: pgError.routine,
      ...details,
    };

    if (this.logger) {
      this.logger.error(this.entityType, msg, data);
    } else {
      console.error({ msg, ...data });
    }
  }

  /**
   * Log validation error specifically
   */
  protected logValidationError(
    ctx: TRequestContext,
    operation: SyncOperationInput,
    error: Error,
    payload: Record<string, unknown>,
    validationErrors: string[],
    details?: Record<string, unknown>
  ): void {
    const msg = `🚫 ${this.entityType} validation failed`;
    const data = {
      entityType: this.entityType,
      operation: operation.operation,
      entityId: operation.entityId,
      error: error.message,
      validationErrors,
      payloadKeys: Object.keys(payload),
      ...details,
    };

    if (this.logger) {
      this.logger.error(this.entityType, msg, data);
    } else {
      console.error({ msg, ...data });
    }
  }

  /**
   * Create a success result
   */
  protected createSuccessResult(operation: SyncOperationInput): SyncHandlerResult {
    return {
      success: true,
      idempotencyKey: operation.idempotencyKey,
      serverTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Create an error result
   */
  protected createErrorResult(operation: SyncOperationInput, error: string): SyncHandlerResult {
    return {
      success: false,
      idempotencyKey: operation.idempotencyKey,
      error,
      serverTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Validate payload against Zod schemas
   */
  protected validatePayload(
    payload: Record<string, unknown>,
    createSchema: z.ZodType<unknown>,
    updateSchema?: z.ZodType<unknown>,
    operation?: string
  ): void {
    // For update/delete operations, validation is handled in execute method
    if (operation === "update" && updateSchema) {
      updateSchema.parse(payload);
    } else if (operation === "delete") {
      // No validation needed for delete - entity existence checked in execute
      return;
    } else {
      // For create or when no specific schema available, use create schema
      createSchema.parse(payload);
    }
  }

  /**
   * Check if a parent entity exists, using registry first to avoid DB queries
   * when parent was created in the same batch
   */
  protected async ensureParentExists(
    parentId: string,
    findInDb: () => Promise<unknown>,
    parentName: string
  ): Promise<void> {
    // If parent was created in this batch, skip DB query
    if (this.registry?.wasCreated(parentId)) {
      return;
    }

    // Otherwise verify in database
    const parent = await findInDb();
    if (!parent) {
      throw new Error(`${parentName} ${parentId} no encontrado`);
    }
  }
}
