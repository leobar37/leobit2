import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import type { SyncOperationInput, SyncEntity } from "../types";
import type { ISyncHandler, SyncHandlerResult } from "../framework/types";
import { logger } from "../../../lib/logger";
import { syncLogger } from "../sync-logger";
import { toISODate, now } from "../../../lib/date-utils";

export abstract class BaseSyncHandler implements ISyncHandler {
  abstract readonly entityType: SyncEntity;

  abstract validateBusinessRules(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    tx?: DbTransaction
  ): Promise<void>;

  abstract execute(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<SyncHandlerResult>;

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

    logger.error({
      msg: `❌ ${this.entityType} operation failed`,
      correlationId,
      operation: operation.operation,
      entityId: operation.entityId,
      error: error.message,
      stack: error.stack,
      ...details,
    });
  }

  protected requiredString(value: unknown, field: string): string {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
    throw new Error(`${field} es requerido`);
  }

  protected optionalString(value: unknown): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    return undefined;
  }

  protected requiredNumericString(value: unknown, field: string): string {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value.toString();
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed.toString();
      }
    }
    throw new Error(`${field} inválido`);
  }

  protected optionalNumericString(value: unknown): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return value.toString();
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed.toString() : undefined;
    }
    return undefined;
  }

  protected normalizedAmount(value: number, field: string): number {
    if (!Number.isFinite(value)) {
      throw new Error(`${field} inválido`);
    }
    return Math.max(0, Number(value.toFixed(2)));
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
}
