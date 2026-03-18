import type { RequestContext } from "../../../context/request-context";
import type { SyncOperationInput } from "../types";
import type { SyncHandlerResult } from "../framework/types";
import type { CustomerGroupRepository } from "../../repository/customer-group.repository";
import { BaseSyncHandler } from "./BaseSyncHandler";
import { customerGroupMemberCreateSchema, customerGroupMemberUpdateSchema } from "../schemas";

export class CustomerGroupMemberSyncHandler extends BaseSyncHandler {
  readonly entityType = "customer_group_members" as const;

  constructor(private customerGroupRepo: CustomerGroupRepository) {
    super();
  }

  async validateBusinessRules(
    _ctx: RequestContext,
    payload: Record<string, unknown>,
    operation?: string,
  ): Promise<void> {
    this.validatePayload(payload, customerGroupMemberCreateSchema, customerGroupMemberUpdateSchema, operation);
  }

  async execute(
    ctx: RequestContext,
    operation: SyncOperationInput,
  ): Promise<SyncHandlerResult> {
    this.logStart(ctx, operation);

    try {
      if (operation.operation === "create") {
        await this.handleCreate(ctx, operation);
      } else if (operation.operation === "delete") {
        await this.handleDelete(ctx, operation);
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

  private async handleCreate(
    ctx: RequestContext,
    operation: SyncOperationInput,
  ): Promise<void> {
    const parsed = customerGroupMemberCreateSchema.parse(operation.payload);

    try {
      await this.customerGroupRepo.addMembers(ctx, parsed.groupId, [parsed.customerId]);
    } catch (error) {
      if (error instanceof Error && error.message === "Group not found") {
        this.logStart(ctx, operation, { reason: "Group not found - skipping (group will be created separately)" });
        return;
      }
      throw error;
    }
  }

  private async handleDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
  ): Promise<void> {
    const parsed = customerGroupMemberCreateSchema.parse(operation.payload);

    try {
      await this.customerGroupRepo.removeMember(ctx, parsed.groupId, parsed.customerId);
    } catch (error) {
      if (error instanceof Error && error.message === "Group not found") {
        this.logStart(ctx, operation, { reason: "Group not found - skipping delete" });
        return;
      }
      throw error;
    }
  }
}
