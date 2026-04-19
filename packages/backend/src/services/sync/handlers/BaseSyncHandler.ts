import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import type { SyncOperationInput, SyncEntity } from "../types";
import type { ISyncHandler, SyncHandlerResult } from "../framework/types";
import type { EntityRegistry } from "@avileo/drizzle-sync/server";
import { logger } from "../../../lib/logger";
import { syncLogger } from "../sync-logger";
import { toISODate, now } from "../../../lib/date-utils";
import { z } from "zod";

export abstract class BaseSyncHandler implements ISyncHandler {
  abstract readonly entityType: SyncEntity;
  protected registry?: EntityRegistry;

  setRegistry(registry: EntityRegistry): void {
    this.registry = registry;
  }

  abstract validateBusinessRules(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    operation?: string,
    tx?: DbTransaction
  ): Promise<void>;

  abstract execute(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<SyncHandlerResult>;

  protected async executeOperation(
    ctx: RequestContext,
    operation: SyncOperationInput,
    handlers: {
      create: () => Promise<void>;
      update: () => Promise<void>;
      delete: () => Promise<void>;
    },
    details?: Record<string, unknown>
  ): Promise<SyncHandlerResult> {
    this.logStart(ctx, operation, details);

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

      this.logSuccess(ctx, operation);
      return this.createSuccessResult(operation);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logError(ctx, operation, err);
      return this.createErrorResult(operation, err.message);
    }
  }

  protected logStart(
    ctx: RequestContext,
    operation: SyncOperationInput,
    details?: Record<string, unknown>
  ): void {
    logger.info({
      msg: `🔄 Processing ${this.entityType} operation`,
      operation: operation.operation,
      entityId: operation.entityId,
      businessId: ctx.businessId,
      userId: ctx.businessUserId,
      ...details,
    });
  }

  protected logSuccess(
    ctx: RequestContext,
    operation: SyncOperationInput,
    details?: Record<string, unknown>
  ): void {
    logger.info({
      msg: `✅ ${this.entityType} operation completed`,
      operation: operation.operation,
      entityId: operation.entityId,
      ...details,
    });
  }

  protected logError(
    ctx: RequestContext,
    operation: SyncOperationInput,
    error: Error,
    details?: Record<string, unknown>
  ): void {
    const correlationId = operation.correlationId || syncLogger.generateCorrelationId();

    // Extract the underlying PostgreSQL error from DrizzleQueryError.cause
    const pgError = (error as any).cause?.cause ?? (error as any).cause ?? error;
    const pgErrorCode = pgError.code || null;
    const pgErrorDetail = pgError.detail || null;
    const pgErrorRoutine = pgError.routine || null;

    logger.error({
      msg: `❌ ${this.entityType} operation failed`,
      correlationId,
      operation: operation.operation,
      entityId: operation.entityId,
      error: error.message,
      pgErrorCode,
      pgErrorDetail,
      pgErrorRoutine,
      stack: error.stack,
      ...details,
    });
  }

  protected createSuccessResult(operation: SyncOperationInput): SyncHandlerResult {
    return {
      success: true,
      idempotencyKey: operation.idempotencyKey,
      serverTimestamp: toISODate(now()),
    };
  }

  protected createErrorResult(operation: SyncOperationInput, error: string): SyncHandlerResult {
    return {
      success: false,
      idempotencyKey: operation.idempotencyKey,
      error,
      serverTimestamp: toISODate(now()),
    };
  }

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
