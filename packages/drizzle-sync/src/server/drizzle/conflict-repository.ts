/**
 * DrizzleSyncConflictRepository
 *
 * Concrete implementation of ISyncConflictRepository using Drizzle ORM.
 */

import { eq, and, desc, count } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  SyncConflictRepository,
  type SyncConflict,
  type ConflictResolutionData,
  type ISyncConflictRepository,
} from "../conflict-repository";
import type { RepositoryRequestContext } from "../conflict-repository";

export interface DrizzleConflictRepoConfig {
  table: PgTable;
  tenantColumn: string;
  db: NodePgDatabase<any>;
}

export class DrizzleSyncConflictRepository<
  TRequestContext extends RepositoryRequestContext = RepositoryRequestContext,
  TTransaction = Parameters<Parameters<NodePgDatabase<any>["transaction"]>[0]>[0]
> extends SyncConflictRepository<TRequestContext, TTransaction>
  implements ISyncConflictRepository<TRequestContext, TTransaction>
{
  protected readonly table: PgTable;
  private readonly config: DrizzleConflictRepoConfig;
  private readonly db: NodePgDatabase<any>;

  constructor(config: DrizzleConflictRepoConfig) {
    super();
    this.config = config;
    this.table = config.table;
    this.db = config.db;
  }

  private getTx(tx?: TTransaction): any {
    return tx ?? this.db;
  }

  private getCol(name: string) {
    return (this.table as any)[name];
  }

  async create(
    ctx: TRequestContext,
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
    tx?: TTransaction
  ): Promise<SyncConflict> {
    const dbOrTx = this.getTx(tx);
    const tenantCol = this.getCol(this.config.tenantColumn);

    const result = await dbOrTx
      .insert(this.table)
      .values({
        [this.config.tenantColumn]: ctx.tenantId,
        operationId: data.operationId,
        entityType: data.entityType,
        entityId: data.entityId,
        localData: data.localData,
        serverData: data.serverData,
        localVersion: data.localVersion,
        serverVersion: data.serverVersion,
        status: "pending",
        sourceDeviceId: data.sourceDeviceId ?? null,
        sourceFingerprint: data.sourceFingerprint ?? null,
        createdAt: new Date(),
      })
      .returning();

    return this.mapToConflict(result[0]);
  }

  async findById(ctx: TRequestContext, id: string): Promise<SyncConflict | undefined> {
    const idCol = this.getCol("id");
    const tenantCol = this.getCol(this.config.tenantColumn);

    const result = await this.db
      .select()
      .from(this.table)
      .where(and(eq(tenantCol, ctx.tenantId), eq(idCol, id)))
      .limit(1);

    return result[0] ? this.mapToConflict(result[0]) : undefined;
  }

  async findByOperationId(
    ctx: TRequestContext,
    operationId: string
  ): Promise<SyncConflict | undefined> {
    const opIdCol = this.getCol("operationId");
    const tenantCol = this.getCol(this.config.tenantColumn);

    const result = await this.db
      .select()
      .from(this.table)
      .where(and(eq(tenantCol, ctx.tenantId), eq(opIdCol, operationId)))
      .limit(1);

    return result[0] ? this.mapToConflict(result[0]) : undefined;
  }

  async findPending(
    ctx: TRequestContext,
    options?: { limit?: number; offset?: number }
  ): Promise<SyncConflict[]> {
    const tenantCol = this.getCol(this.config.tenantColumn);
    const statusCol = this.getCol("status");

    let query = this.db
      .select()
      .from(this.table)
      .where(and(eq(tenantCol, ctx.tenantId), eq(statusCol, "pending")))
      .orderBy(desc(this.getCol("createdAt")));

    const queryAny = query as any;
    if (options?.limit) {
      queryAny.limit(options.limit);
    }
    if (options?.offset) {
      queryAny.offset(options.offset);
    }

    const results = await queryAny;
    return results.map((r: any) => this.mapToConflict(r));
  }

  async findMany(
    ctx: TRequestContext,
    options?: {
      status?: string;
      entityType?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<SyncConflict[]> {
    const tenantCol = this.getCol(this.config.tenantColumn);
    const conditions = [eq(tenantCol, ctx.tenantId)];

    if (options?.status) {
      conditions.push(eq(this.getCol("status"), options.status));
    }
    if (options?.entityType) {
      conditions.push(eq(this.getCol("entityType"), options.entityType));
    }

    let query = this.db
      .select()
      .from(this.table)
      .where(and(...conditions))
      .orderBy(desc(this.getCol("createdAt")));

    const queryAny = query as any;
    if (options?.limit) {
      queryAny.limit(options.limit);
    }
    if (options?.offset) {
      queryAny.offset(options.offset);
    }

    const results = await queryAny;
    return results.map((r: any) => this.mapToConflict(r));
  }

  async countPending(ctx: TRequestContext): Promise<number> {
    const tenantCol = this.getCol(this.config.tenantColumn);
    const statusCol = this.getCol("status");

    const result = await this.db
      .select({ count: count() })
      .from(this.table)
      .where(and(eq(tenantCol, ctx.tenantId), eq(statusCol, "pending")));

    return result[0]?.count ?? 0;
  }

  async resolve(
    ctx: TRequestContext,
    id: string,
    resolution: ConflictResolutionData,
    tx?: TTransaction
  ): Promise<SyncConflict | undefined> {
    const dbOrTx = this.getTx(tx);
    const idCol = this.getCol("id");
    const tenantCol = this.getCol(this.config.tenantColumn);

    const updateData: Record<string, any> = {
      status: "resolved",
      resolution: resolution.resolution,
      resolvedAt: new Date(),
    };

    if (resolution.mergedData !== undefined) {
      updateData["serverData"] = resolution.mergedData;
    }

    // resolvedBy requires ctx.userId
    if ((ctx as any).userId) {
      updateData["resolvedBy"] = (ctx as any).userId;
    }

    const result = await dbOrTx
      .update(this.table)
      .set(updateData)
      .where(and(eq(tenantCol, ctx.tenantId), eq(idCol, id)))
      .returning();

    return result[0] ? this.mapToConflict(result[0]) : undefined;
  }

  async delete(ctx: TRequestContext, id: string): Promise<boolean> {
    const idCol = this.getCol("id");
    const tenantCol = this.getCol(this.config.tenantColumn);

    const result = await this.db
      .delete(this.table)
      .where(and(eq(tenantCol, ctx.tenantId), eq(idCol, id)))
      .returning();

    return result.length > 0;
  }

  async deleteByOperationId(
    ctx: TRequestContext,
    operationId: string,
    tx?: TTransaction
  ): Promise<boolean> {
    const dbOrTx = this.getTx(tx);
    const opIdCol = this.getCol("operationId");
    const tenantCol = this.getCol(this.config.tenantColumn);

    const result = await dbOrTx
      .delete(this.table)
      .where(and(eq(tenantCol, ctx.tenantId), eq(opIdCol, operationId)))
      .returning();

    return result.length > 0;
  }

  protected mapToConflict(row: Record<string, any>): SyncConflict {
    return {
      id: row.id,
      tenantId: row[this.config.tenantColumn],
      operationId: row.operationId,
      entityType: row.entityType,
      entityId: row.entityId,
      localData: row.localData ?? {},
      serverData: row.serverData ?? {},
      localVersion: row.localVersion ?? 0,
      serverVersion: row.serverVersion ?? 0,
      status: row.status,
      resolution: row.resolution ?? null,
      resolvedBy: row.resolvedBy ?? null,
      resolvedAt: row.resolvedAt ?? null,
      sourceDeviceId: row.sourceDeviceId ?? undefined,
      sourceFingerprint: row.sourceFingerprint ?? undefined,
      createdAt: row.createdAt ?? new Date(),
    };
  }
}
