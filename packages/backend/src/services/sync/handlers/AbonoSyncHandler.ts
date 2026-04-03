import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import type { SyncOperationInput } from "../types";
import type { SyncHandlerResult } from "../framework/types";
import type { PaymentRepository } from "../../repository/payment.repository";
import type { CustomerRepository } from "../../repository/customer.repository";
import { BaseSyncHandler } from "./BaseSyncHandler";
import { abonoCreateSchema, abonoUpdateSchema } from "../schemas";

export class AbonoSyncHandler extends BaseSyncHandler {
  readonly entityType = "abonos" as const;

  constructor(
    private paymentRepo: PaymentRepository,
    private customerRepo: CustomerRepository
  ) {
    super();
  }

  async validateBusinessRules(
    _ctx: RequestContext,
    payload: Record<string, unknown>,
    operation?: string,
    _tx?: DbTransaction
  ): Promise<void> {
    this.validatePayload(payload, abonoCreateSchema, abonoUpdateSchema, operation);
  }

  async execute(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<SyncHandlerResult> {
    this.logStart(ctx, operation);

    try {
      if (operation.operation === "create") {
        await this.handleCreate(ctx, operation, tx);
      } else if (operation.operation === "update") {
        await this.handleUpdate(ctx, operation, tx);
      } else if (operation.operation === "delete") {
        await this.handleDelete(ctx, operation, tx);
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
    tx?: DbTransaction
  ): Promise<void> {
    // Auto-inyectar sellerId desde contexto si no está presente en payload
    // Esto asegura que siempre tengamos un sellerId válido
    const rawPayload = operation.payload;
    const payloadWithSeller = {
      ...rawPayload,
      sellerId: rawPayload.sellerId || ctx.businessUserId,
    };

    const parsed = abonoCreateSchema.parse(payloadWithSeller);

    // Use registry-aware parent check to avoid DB query when customer was created in same batch
    await this.ensureParentExists(
      parsed.customerId,
      () => this.customerRepo.findById(ctx, parsed.customerId, tx),
      "Cliente"
    );

    await this.paymentRepo.create(ctx, {
      id: operation.entityId,
      customerId: parsed.customerId,
      amount: parsed.amount,
      paymentMethod: parsed.paymentMethod,
      notes: parsed.notes,
    }, tx);
    // Note: sellerId is automatically injected by paymentRepo from ctx.businessUserId
  }

  private async handleDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    const existing = await this.paymentRepo.findById(ctx, operation.entityId, tx);
    if (!existing) {
      return;
    }

    await this.paymentRepo.delete(ctx, operation.entityId, tx);
  }

  private async handleUpdate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    const parsed = abonoUpdateSchema.parse(operation.payload);

    const existing = await this.paymentRepo.findById(ctx, operation.entityId, tx);
    if (!existing) {
      throw new Error("Abono no encontrado");
    }

    await this.paymentRepo.update(ctx, operation.entityId, {
      proofImageId: parsed.proofImageId,
      referenceNumber: parsed.referenceNumber,
      notes: parsed.notes,
    }, tx);
  }
}
