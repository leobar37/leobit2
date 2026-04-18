import type { SyncOperationInput } from "../types";
import type { DbTransaction } from "../../../lib/txid";
import type {
  SyncContext,
  SyncHandlerResult,
  ISyncHandler,
} from "./types";
import { syncOperationSchema } from "../schemas";
import { ZodError } from "zod";

function validateStructure(
  _context: SyncContext,
  operation: SyncOperationInput
): SyncHandlerResult | null {
  const result = syncOperationSchema.safeParse(operation);

  if (!result.success) {
    const zodError = result.error as ZodError;
    return {
      success: false,
      idempotencyKey: operation.idempotencyKey,
      error: `Invalid operation structure: ${zodError.issues.map((e) => e.message).join(", ")}`,
      serverTimestamp: new Date().toISOString(),
    };
  }

  return null;
}

async function validateBusinessRules(
  context: SyncContext,
  operation: SyncOperationInput,
  handler: ISyncHandler,
  tx?: DbTransaction
): Promise<SyncHandlerResult | null> {
  try {
    await handler.validateBusinessRules(
      context.ctx,
      operation.payload,
      operation.operation,
      tx
    );
    return null;
  } catch (error) {
    return {
      success: false,
      idempotencyKey: operation.idempotencyKey,
      error: error instanceof Error ? error.message : "Validation failed",
      serverTimestamp: new Date().toISOString(),
    };
  }
}

async function executeHandler(
  context: SyncContext,
  operation: SyncOperationInput,
  handler: ISyncHandler,
  tx?: DbTransaction
): Promise<SyncHandlerResult> {
  return handler.execute(context.ctx, operation, tx);
}

export class SyncPipeline {
  async execute(
    context: SyncContext,
    operation: SyncOperationInput,
    handler: ISyncHandler,
    tx?: DbTransaction
  ): Promise<SyncHandlerResult> {
    let result = validateStructure(context, operation);
    if (result) return result;

    result = await validateBusinessRules(context, operation, handler, tx);
    if (result) return result;

    return executeHandler(context, operation, handler, tx);
  }
}

export const syncPipeline = new SyncPipeline();
