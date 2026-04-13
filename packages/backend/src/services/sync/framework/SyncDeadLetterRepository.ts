import { eq, and, desc } from "drizzle-orm";
import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import { db, syncDeadLetter } from "../../../lib/db";
import type { SyncOperationInput } from "../types";

export interface DeadLetterRecord {
  id: string;
  operationId: string;
  entity: string;
  action: string;
  entityId: string;
  payload: Record<string, unknown>;
  error: string;
  syncAttempts: number;
  originalError?: string;
  clientTimestamp: Date;
  deviceId?: string;
  sourceFingerprint?: string;
  createdAt: Date;
}

export class SyncDeadLetterRepository {
  async create(
    ctx: RequestContext,
    operation: SyncOperationInput,
    error: string,
    syncAttempts: number,
    tx?: DbTransaction
  ): Promise<DeadLetterRecord> {
    const dbOrTx = tx || db;

    const [result] = await dbOrTx
      .insert(syncDeadLetter)
      .values({
        businessId: ctx.businessId,
        operationId: operation.idempotencyKey,
        entity: operation.entityType,
        action: operation.operation,
        entityId: operation.entityId,
        payload: operation.payload,
        error,
        syncAttempts,
        originalError: operation.error ?? null,
        clientTimestamp: new Date(operation.localTimestamp),
        deviceId: operation.deviceId ?? null,
        sourceFingerprint: operation.sourceFingerprint ?? null,
      })
      .returning();

    return this.mapToRecord(result);
  }

  async findByBusiness(
    ctx: RequestContext,
    options: { limit: number; offset: number; entity?: string }
  ): Promise<DeadLetterRecord[]> {
    const whereClause = and(
      eq(syncDeadLetter.businessId, ctx.businessId),
      options.entity ? eq(syncDeadLetter.entity, options.entity) : undefined
    );

    const results = await db
      .select()
      .from(syncDeadLetter)
      .where(whereClause)
      .orderBy(desc(syncDeadLetter.createdAt))
      .limit(options.limit)
      .offset(options.offset);

    return results.map((r) => this.mapToRecord(r));
  }

  async countByBusiness(ctx: RequestContext): Promise<number> {
    const result = await db
      .select({ count: db.fn.count() })
      .from(syncDeadLetter)
      .where(eq(syncDeadLetter.businessId, ctx.businessId));

    return Number(result[0]?.count ?? 0);
  }

  async countByBusinessAndEntity(
    ctx: RequestContext,
    entity: string
  ): Promise<number> {
    const result = await db
      .select({ count: db.fn.count() })
      .from(syncDeadLetter)
      .where(
        and(
          eq(syncDeadLetter.businessId, ctx.businessId),
          eq(syncDeadLetter.entity, entity)
        )
      );

    return Number(result[0]?.count ?? 0);
  }

  async findById(
    ctx: RequestContext,
    id: string
  ): Promise<DeadLetterRecord | undefined> {
    const result = await db
      .select()
      .from(syncDeadLetter)
      .where(and(eq(syncDeadLetter.id, id), eq(syncDeadLetter.businessId, ctx.businessId)))
      .limit(1);

    return result[0] ? this.mapToRecord(result[0]) : undefined;
  }

  async delete(ctx: RequestContext, id: string): Promise<boolean> {
    const result = await db
      .delete(syncDeadLetter)
      .where(and(eq(syncDeadLetter.id, id), eq(syncDeadLetter.businessId, ctx.businessId)))
      .returning({ id: syncDeadLetter.id });

    return result.length > 0;
  }

  async deleteOlderThan(days: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const result = await db
      .delete(syncDeadLetter)
      .where(eq(syncDeadLetter.createdAt, cutoff.toISOString()))
      .returning({ id: syncDeadLetter.id });

    return result.length;
  }

  private mapToRecord(row: typeof syncDeadLetter.$inferSelect): DeadLetterRecord {
    return {
      id: row.id,
      operationId: row.operationId,
      entity: row.entity,
      action: row.action,
      entityId: row.entityId,
      payload: row.payload as Record<string, unknown>,
      error: row.error,
      syncAttempts: row.syncAttempts,
      originalError: row.originalError ?? undefined,
      clientTimestamp: row.clientTimestamp,
      deviceId: row.deviceId ?? undefined,
      sourceFingerprint: row.sourceFingerprint ?? undefined,
      createdAt: row.createdAt,
    };
  }
}
