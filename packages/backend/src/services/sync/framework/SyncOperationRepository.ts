import { eq, and } from "drizzle-orm";
import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import { db, syncOperations } from "../../../lib/db";
import type { SyncOperationInput } from "../types";
import { now } from "../../../lib/date-utils";

export interface SyncOperationRecord {
  id: string;
  operationId: string;
  status: "pending" | "processed" | "failed";
  processedAt: Date | null;
  payload: Record<string, unknown>;
}

export class SyncOperationRepository {
  async findByIdempotencyKey(
    ctx: RequestContext,
    idempotencyKey: string,
    tx?: DbTransaction
  ): Promise<SyncOperationRecord | undefined> {
    const dbOrTx = tx || db;

    const result = await dbOrTx.query.syncOperations.findFirst({
      where: and(
        eq(syncOperations.businessId, ctx.businessId),
        eq(syncOperations.operationId, idempotencyKey)
      ),
    });

    if (!result) return undefined;

    return {
      id: result.id,
      operationId: result.operationId,
      status: result.status as "pending" | "processed" | "failed",
      processedAt: result.processedAt,
      payload: result.payload,
    };
  }

  async findByIdempotencyKeyForUpdate(
    ctx: RequestContext,
    idempotencyKey: string,
    tx?: DbTransaction
  ): Promise<SyncOperationRecord | undefined> {
    const dbOrTx = tx || db;

    const [result] = await dbOrTx
      .select()
      .from(syncOperations)
      .where(
        and(
          eq(syncOperations.businessId, ctx.businessId),
          eq(syncOperations.operationId, idempotencyKey)
        )
      )
      .limit(1);

    if (!result) return undefined;

    return {
      id: result.id,
      operationId: result.operationId,
      status: result.status as "pending" | "processed" | "failed",
      processedAt: result.processedAt,
      payload: result.payload,
    };
  }

  async insertOrUpdate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<"inserted" | "updated" | "already-processed"> {
    const dbOrTx = tx || db;

    const existing = await this.findByIdempotencyKeyForUpdate(
      ctx,
      operation.idempotencyKey,
      tx
    );

    if (existing?.status === "processed") {
      return "already-processed";
    }

    if (existing?.status === "pending" || existing?.status === "failed") {
      await dbOrTx
        .update(syncOperations)
        .set({
          entity: operation.entityType,
          action: operation.operation,
          entityId: operation.entityId,
          payload: operation.payload,
          status: "pending",
          clientTimestamp: new Date(operation.localTimestamp),
          error: null,
          processedAt: null,
          syncGroupId: operation.syncGroupId ?? null,
        })
        .where(
          and(
            eq(syncOperations.businessId, ctx.businessId),
            eq(syncOperations.operationId, operation.idempotencyKey)
          )
        );
      return "updated";
    }

    try {
      await dbOrTx.insert(syncOperations).values({
        businessId: ctx.businessId,
        operationId: operation.idempotencyKey,
        entity: operation.entityType,
        action: operation.operation,
        entityId: operation.entityId,
        payload: operation.payload,
        status: "pending",
        clientTimestamp: new Date(operation.localTimestamp),
        syncGroupId: operation.syncGroupId ?? null,
      });
      return "inserted";
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) {
        const recovered = await this.findByIdempotencyKeyForUpdate(
          ctx,
          operation.idempotencyKey,
          tx
        );

        if (
          recovered?.status === "pending" ||
          recovered?.status === "failed"
        ) {
          await dbOrTx
            .update(syncOperations)
            .set({
              entity: operation.entityType,
              action: operation.operation,
              entityId: operation.entityId,
              payload: operation.payload,
              status: "pending",
              clientTimestamp: new Date(operation.localTimestamp),
              error: null,
              processedAt: null,
              syncGroupId: operation.syncGroupId ?? null,
            })
            .where(
              and(
                eq(syncOperations.businessId, ctx.businessId),
                eq(syncOperations.operationId, operation.idempotencyKey)
              )
            );
          return "updated";
        }
        return "already-processed";
      }
      throw error;
    }
  }

  async updateStatus(
    ctx: RequestContext,
    idempotencyKey: string,
    status: "processed" | "failed",
    error: string | null,
    tx?: DbTransaction
  ): Promise<void> {
    const dbOrTx = tx || db;

    await dbOrTx
      .update(syncOperations)
      .set({
        status,
        error,
        processedAt: now(),
      })
      .where(
        and(
          eq(syncOperations.businessId, ctx.businessId),
          eq(syncOperations.operationId, idempotencyKey)
        )
      );
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    if (error && typeof error === "object") {
      const pgError = error as { code?: string };
      return pgError.code === "23505";
    }
    return false;
  }
}
