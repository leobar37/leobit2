import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import type { SyncEntity, SyncOperationInput } from "../types";

export type {
  SyncEntity,
  SyncOperationType,
  SyncOperationInput,
  SyncOperationResult,
  SyncBatchResult,
} from "../types";

export interface SyncContext {
  ctx: RequestContext;
  correlationId: string;
  batchCorrelationId: string;
}

export interface SyncHandlerResult {
  success: boolean;
  idempotencyKey: string;
  error?: string;
  conflict?: {
    serverVersion: number;
    serverData: Record<string, unknown>;
  };
  serverTimestamp: string;
}

export interface SyncHandlerDeps {
  customerRepo?: unknown;
  saleRepo?: unknown;
  paymentRepo?: unknown;
  distribucionRepo?: unknown;
  distribucionService?: unknown;
}

export interface IConflictResolver {
  checkConflict(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx: DbTransaction
  ): Promise<{ hasConflict: boolean; serverVersion?: number; serverData?: Record<string, unknown> }>;
}

export interface ISyncHandler {
  readonly entityType: SyncEntity;
  validateBusinessRules(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    operation?: string,
    tx?: DbTransaction
  ): Promise<void>;
  execute(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<SyncHandlerResult>;
}

export interface IPipelineStage {
  name: string;
  execute(
    context: SyncContext,
    operation: SyncOperationInput,
    handler: ISyncHandler,
    tx?: DbTransaction
  ): Promise<SyncHandlerResult>;
}

export interface SyncPipelineConfig {
  stages: IPipelineStage[];
  onBeforeExecute?: (context: SyncContext, operation: SyncOperationInput) => void;
  onAfterExecute?: (context: SyncContext, operation: SyncOperationInput, result: SyncHandlerResult) => void;
  onError?: (context: SyncContext, operation: SyncOperationInput, error: Error) => void;
}
