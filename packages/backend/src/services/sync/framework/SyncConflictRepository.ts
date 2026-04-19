import { eq, and, desc, asc } from "drizzle-orm";
import { db, syncConflicts } from "../../../lib/db";
import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import type { ConflictResolutionData, ISyncConflictRepository, SyncConflict as LibSyncConflict } from "@avileo/drizzle-sync/server";
import type { SyncConflict as DrizzleSyncConflict } from "../../../db/schema";

// Re-export library types for backward compatibility with backend code
export type { ConflictResolutionData };
export type SyncConflict = LibSyncConflict;

export class SyncConflictRepository implements ISyncConflictRepository<RequestContext, DbTransaction> {
  async create(
    ctx: RequestContext,
    data: {
      operationId: string;
      entityType: string;
      entityId: string;
      localData: Record<string, unknown>;
      serverData: Record<string, unknown>;
      localVersion: number;
      serverVersion: number;
      sourceDeviceId?: string;
      sourceFingerprint?: string;
    },
    tx?: DbTransaction
  ): Promise<LibSyncConflict> {
    const executor = tx || db;

    const [conflict] = await executor
      .insert(syncConflicts)
      .values({
        businessId: ctx.businessId,
        operationId: data.operationId,
        entityType: data.entityType,
        entityId: data.entityId,
        localData: data.localData,
        serverData: data.serverData,
        localVersion: data.localVersion,
        serverVersion: data.serverVersion,
        status: "pending",
        sourceDeviceId: data.sourceDeviceId,
        sourceFingerprint: data.sourceFingerprint,
      })
      .returning();

    return conflict as LibSyncConflict;
  }

  async findById(
    ctx: RequestContext,
    id: string
  ): Promise<LibSyncConflict | undefined> {
    const conflict = await db.query.syncConflicts.findFirst({
      where: and(
        eq(syncConflicts.id, id),
        eq(syncConflicts.businessId, ctx.businessId)
      ),
    });
    return conflict as LibSyncConflict | undefined;
  }

  async findByOperationId(
    ctx: RequestContext,
    operationId: string
  ): Promise<LibSyncConflict | undefined> {
    const conflict = await db.query.syncConflicts.findFirst({
      where: and(
        eq(syncConflicts.operationId, operationId),
        eq(syncConflicts.businessId, ctx.businessId)
      ),
    });
    return conflict as LibSyncConflict | undefined;
  }

  async findPendingByBusiness(
    ctx: RequestContext,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<LibSyncConflict[]> {
    const conflicts = await db.query.syncConflicts.findMany({
      where: and(
        eq(syncConflicts.businessId, ctx.businessId),
        eq(syncConflicts.status, "pending")
      ),
      orderBy: asc(syncConflicts.createdAt),
      limit: options?.limit,
      offset: options?.offset,
    });
    return conflicts as LibSyncConflict[];
  }

  async findByBusiness(
    ctx: RequestContext,
    options?: {
      status?: string;
      entityType?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<LibSyncConflict[]> {
    const conditions = [eq(syncConflicts.businessId, ctx.businessId)];

    if (options?.status) {
      conditions.push(eq(syncConflicts.status, options.status));
    }

    if (options?.entityType) {
      conditions.push(eq(syncConflicts.entityType, options.entityType));
    }

    const conflicts = await db.query.syncConflicts.findMany({
      where: and(...conditions),
      orderBy: desc(syncConflicts.createdAt),
      limit: options?.limit,
      offset: options?.offset,
    });
    return conflicts as LibSyncConflict[];
  }

  async countPending(ctx: RequestContext): Promise<number> {
    const result = await db
      .select({ count: syncConflicts.id })
      .from(syncConflicts)
      .where(
        and(
          eq(syncConflicts.businessId, ctx.businessId),
          eq(syncConflicts.status, "pending")
        )
      );

    return result.length;
  }

  async resolve(
    ctx: RequestContext,
    id: string,
    resolution: ConflictResolutionData,
    tx?: DbTransaction
  ): Promise<LibSyncConflict | undefined> {
    const executor = tx || db;

    const [conflict] = await executor
      .update(syncConflicts)
      .set({
        status: "resolved",
        resolution: resolution.resolution,
        resolvedBy: ctx.businessUserId,
        resolvedAt: new Date(),
      })
      .where(
        and(
          eq(syncConflicts.id, id),
          eq(syncConflicts.businessId, ctx.businessId)
        )
      )
      .returning();

    return conflict as LibSyncConflict | undefined;
  }

  async delete(ctx: RequestContext, id: string): Promise<boolean> {
    const result = await db
      .delete(syncConflicts)
      .where(
        and(
          eq(syncConflicts.id, id),
          eq(syncConflicts.businessId, ctx.businessId)
        )
      );

    return true;
  }

  async deleteByOperationId(
    ctx: RequestContext,
    operationId: string,
    tx?: DbTransaction
  ): Promise<boolean> {
    const executor = tx || db;

    await executor
      .delete(syncConflicts)
      .where(
        and(
          eq(syncConflicts.operationId, operationId),
          eq(syncConflicts.businessId, ctx.businessId)
        )
      );

    return true;
  }
}
