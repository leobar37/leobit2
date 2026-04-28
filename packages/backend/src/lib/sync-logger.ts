import { logger } from "./logger";
import type { RequestContext } from "../context/request-context";

/**
 * Sync Logger Service
 * Provides structured logging with correlation IDs, metrics, and alerts for sync operations
 */

interface SyncMetrics {
  total: number;
  succeeded: number;
  failed: number;
  conflicts: number;
  byEntity: Record<string, {
    total: number;
    succeeded: number;
    failed: number;
    errors: Record<string, number>;
  }>;
}

interface SyncErrorEvent {
  correlationId: string;
  entityType: string;
  operation: string;
  entityId: string;
  error: string;
  errorType: string;
  payload?: Record<string, unknown>;
  validationErrors?: string[];
  businessId: string;
  userId: string;
  timestamp: string;
  stack?: string;
}

interface OperationContext {
  correlationId: string;
  operationId: string;
  entityType: string;
  entityId: string;
  operation: string;
  startTime: number;
}

export class SyncLogger {
  private static instance: SyncLogger;
  private metrics: SyncMetrics;
  private recentErrors: SyncErrorEvent[];
  private readonly MAX_RECENT_ERRORS = 100;
  private readonly ERROR_THRESHOLD = 5; // Alert after 5 similar errors

  constructor() {
    this.metrics = {
      total: 0,
      succeeded: 0,
      failed: 0,
      conflicts: 0,
      byEntity: {},
    };
    this.recentErrors = [];
  }

  static getInstance(): SyncLogger {
    if (!SyncLogger.instance) {
      SyncLogger.instance = new SyncLogger();
    }
    return SyncLogger.instance;
  }

  /**
   * Generate a correlation ID for tracking an operation across the stack
   */
  generateCorrelationId(): string {
    return `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start tracking an operation
   */
  startOperation(ctx: RequestContext, params: {
    operationId: string;
    entityType: string;
    entityId: string;
    operation: string;
    correlationId?: string;
  }): OperationContext {
    const correlationId = params.correlationId || this.generateCorrelationId();
    const context: OperationContext = {
      correlationId,
      operationId: params.operationId,
      entityType: params.entityType,
      entityId: params.entityId,
      operation: params.operation,
      startTime: Date.now(),
    };

    logger.info({
      msg: "🚀 Sync operation started",
      correlationId,
      operationId: params.operationId,
      entityType: params.entityType,
      entityId: params.entityId,
      operation: params.operation,
      businessId: ctx.businessId,
      userId: ctx.businessUserId,
    });

    return context;
  }

  /**
   * Log successful operation completion
   */
  logSuccess(ctx: RequestContext, opContext: OperationContext, details?: Record<string, unknown>): void {
    const duration = Date.now() - opContext.startTime;
    
    this.updateMetrics(opContext.entityType, "success");

    logger.info({
      msg: "✅ Sync operation completed",
      correlationId: opContext.correlationId,
      operationId: opContext.operationId,
      entityType: opContext.entityType,
      entityId: opContext.entityId,
      operation: opContext.operation,
      duration,
      businessId: ctx.businessId,
      ...details,
    });
  }

  /**
   * Log operation failure with full context
   */
  logError(ctx: RequestContext, opContext: OperationContext, error: Error, payload?: Record<string, unknown>): void {
    const duration = Date.now() - opContext.startTime;
    const errorType = this.classifyError(error);
    
    this.updateMetrics(opContext.entityType, "failure", error.message);

    const errorEvent: SyncErrorEvent = {
      correlationId: opContext.correlationId,
      entityType: opContext.entityType,
      operation: opContext.operation,
      entityId: opContext.entityId,
      error: error.message,
      errorType,
      payload: this.sanitizePayload(payload),
      businessId: ctx.businessId,
      userId: ctx.businessUserId,
      timestamp: new Date().toISOString(),
      stack: error.stack,
    };

    this.trackError(errorEvent);

    // Log structured error
    logger.error({
      msg: "❌ Sync operation failed",
      correlationId: opContext.correlationId,
      operationId: opContext.operationId,
      entityType: opContext.entityType,
      entityId: opContext.entityId,
      operation: opContext.operation,
      error: error.message,
      errorType,
      duration,
      businessId: ctx.businessId,
      userId: ctx.businessUserId,
      payload: errorEvent.payload,
      stack: error.stack,
      similarErrors: this.getSimilarErrorCount(errorEvent),
    });

    // Alert if threshold reached
    if (this.shouldAlert(errorEvent)) {
      this.triggerAlert(errorEvent);
    }
  }

  /**
   * Log validation error specifically
   */
  logValidationError(ctx: RequestContext, opContext: OperationContext, error: Error, payload: Record<string, unknown>, validationErrors: string[]): void {
    const errorEvent: SyncErrorEvent = {
      correlationId: opContext.correlationId,
      entityType: opContext.entityType,
      operation: opContext.operation,
      entityId: opContext.entityId,
      error: error.message,
      errorType: "VALIDATION_ERROR",
      payload: this.sanitizePayload(payload),
      validationErrors,
      businessId: ctx.businessId,
      userId: ctx.businessUserId,
      timestamp: new Date().toISOString(),
    };

    this.trackError(errorEvent);

    logger.error({
      msg: "🚫 Sync validation failed",
      correlationId: opContext.correlationId,
      operationId: opContext.operationId,
      entityType: opContext.entityType,
      entityId: opContext.entityId,
      operation: opContext.operation,
      error: error.message,
      validationErrors,
      businessId: ctx.businessId,
      payload: errorEvent.payload,
      payloadKeys: Object.keys(payload || {}),
      hasItems: Array.isArray(payload?.items),
      itemCount: Array.isArray(payload?.items) ? (payload.items as unknown[]).length : 0,
    });
  }

  /**
   * Log upsert/skip events
   */
  logUpsertSkip(ctx: RequestContext, opContext: OperationContext, reason: string, payload?: Record<string, unknown>): void {
    logger.warn({
      msg: "⚠️ Sync upsert skipped",
      correlationId: opContext.correlationId,
      operationId: opContext.operationId,
      entityType: opContext.entityType,
      entityId: opContext.entityId,
      operation: opContext.operation,
      reason,
      businessId: ctx.businessId,
      payloadKeys: payload ? Object.keys(payload) : undefined,
    });
  }

  /**
   * Get current metrics
   */
  getMetrics(): SyncMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 20): SyncErrorEvent[] {
    return this.recentErrors.slice(0, limit);
  }

  /**
   * Get error summary for dashboard
   */
  getErrorSummary(): {
    totalRecentErrors: number;
    topErrorTypes: Array<{ type: string; count: number }>;
    topEntities: Array<{ entity: string; failureRate: string }>;
  } {
    const errorTypes: Record<string, number> = {};
    const entityStats: Record<string, { total: number; failed: number }> = {};

    this.recentErrors.forEach((err) => {
      errorTypes[err.errorType] = (errorTypes[err.errorType] || 0) + 1;
      
      if (!entityStats[err.entityType]) {
        entityStats[err.entityType] = { total: 0, failed: 0 };
      }
      entityStats[err.entityType].failed++;
    });

    // Add totals from metrics
    Object.entries(this.metrics.byEntity).forEach(([entity, stats]) => {
      if (!entityStats[entity]) {
        entityStats[entity] = { total: 0, failed: 0 };
      }
      entityStats[entity].total = stats.total;
    });

    return {
      totalRecentErrors: this.recentErrors.length,
      topErrorTypes: Object.entries(errorTypes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type, count })),
      topEntities: Object.entries(entityStats)
        .map(([entity, stats]) => ({
          entity,
          failureRate: stats.total > 0 
            ? `${((stats.failed / stats.total) * 100).toFixed(1)}%` 
            : "0%",
        }))
        .sort((a, b) => parseFloat(b.failureRate) - parseFloat(a.failureRate))
        .slice(0, 5),
    };
  }

  private updateMetrics(entityType: string, result: "success" | "failure", errorMessage?: string): void {
    this.metrics.total++;
    
    if (result === "success") {
      this.metrics.succeeded++;
    } else {
      this.metrics.failed++;
    }

    if (!this.metrics.byEntity[entityType]) {
      this.metrics.byEntity[entityType] = {
        total: 0,
        succeeded: 0,
        failed: 0,
        errors: {},
      };
    }

    const entityMetrics = this.metrics.byEntity[entityType];
    entityMetrics.total++;
    
    if (result === "success") {
      entityMetrics.succeeded++;
    } else {
      entityMetrics.failed++;
      if (errorMessage) {
        entityMetrics.errors[errorMessage] = (entityMetrics.errors[errorMessage] || 0) + 1;
      }
    }
  }

  private classifyError(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes("validation") || message.includes("requiere") || message.includes("inválido")) {
      return "VALIDATION_ERROR";
    }
    if (message.includes("not found") || message.includes("no encontrado")) {
      return "NOT_FOUND";
    }
    if (message.includes("conflict") || message.includes("versión")) {
      return "CONFLICT";
    }
    if (message.includes("database") || message.includes("sql")) {
      return "DATABASE_ERROR";
    }
    if (message.includes("timeout") || message.includes("connection")) {
      return "NETWORK_ERROR";
    }
    return "UNKNOWN_ERROR";
  }

  private sanitizePayload(payload?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!payload) return undefined;
    
    // Remove sensitive data if any
    const sanitized = { ...payload };
    
    // Truncate large arrays for logging
    if (Array.isArray(sanitized.items) && sanitized.items.length > 10) {
      sanitized.items = [
        ...sanitized.items.slice(0, 5),
        `... and ${sanitized.items.length - 5} more items`,
      ];
    }
    
    return sanitized;
  }

  private trackError(errorEvent: SyncErrorEvent): void {
    this.recentErrors.unshift(errorEvent);
    if (this.recentErrors.length > this.MAX_RECENT_ERRORS) {
      this.recentErrors.pop();
    }
  }

  private getSimilarErrorCount(errorEvent: SyncErrorEvent): number {
    return this.recentErrors.filter((e) => 
      e.entityType === errorEvent.entityType &&
      e.errorType === errorEvent.errorType &&
      e.error === errorEvent.error
    ).length;
  }

  private shouldAlert(errorEvent: SyncErrorEvent): boolean {
    return this.getSimilarErrorCount(errorEvent) >= this.ERROR_THRESHOLD;
  }

  private triggerAlert(errorEvent: SyncErrorEvent): void {
    logger.error({
      msg: "🚨 SYNC ALERT: Multiple similar errors detected",
      correlationId: errorEvent.correlationId,
      entityType: errorEvent.entityType,
      operation: errorEvent.operation,
      errorType: errorEvent.errorType,
      error: errorEvent.error,
      errorCount: this.ERROR_THRESHOLD,
      businessId: errorEvent.businessId,
      recommendation: "Check sync configuration and data consistency",
    });
  }
}

// Export singleton instance
export const syncLogger = SyncLogger.getInstance();
