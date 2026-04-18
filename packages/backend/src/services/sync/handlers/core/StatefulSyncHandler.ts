import type { RequestContext } from "../../../../context/request-context";
import type { DbTransaction } from "../../../../lib/txid";
import type { SyncOperationInput } from "../../types";
import type { SyncHandlerResult } from "../../framework/types";
import { BaseSyncHandler } from "../BaseSyncHandler";

export abstract class StatefulSyncHandler<TExisting = unknown> extends BaseSyncHandler {
  protected async executeStateful(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx: DbTransaction | undefined,
    details?: Record<string, unknown>
  ): Promise<SyncHandlerResult> {
    return this.executeOperation(
      ctx,
      operation,
      {
        create: async () => {
          await this.handleCreate(ctx, operation, tx);
        },
        update: async () => {
          const existing = await this.loadExistingForUpdate(ctx, operation, tx);
          await this.handleUpdate(ctx, operation, existing, tx);
        },
        delete: async () => {
          const existing = await this.loadExistingForDelete(ctx, operation, tx);
          await this.handleDelete(ctx, operation, existing, tx);
        },
      },
      details
    );
  }

  protected abstract handleCreate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void>;

  protected abstract handleUpdate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    existing: TExisting | undefined,
    tx?: DbTransaction
  ): Promise<void>;

  protected abstract handleDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
    existing: TExisting | undefined,
    tx?: DbTransaction
  ): Promise<void>;

  protected abstract loadExistingForUpdate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<TExisting | undefined>;

  protected abstract loadExistingForDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<TExisting | undefined>;
}
