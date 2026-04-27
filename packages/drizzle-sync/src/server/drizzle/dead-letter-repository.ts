/**
 * DrizzleSyncDeadLetterRepository
 *
 * Concrete implementation of ISyncDeadLetterRepository using Drizzle ORM.
 */

import { eq, and, desc, count, lt } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  SyncDeadLetterRepository,
  type DeadLetterRecord,
  type ISyncDeadLetterRepository,
} from "../dead-letter-repository";
import type { SyncOperationInput } from "../types";
import type { RepositoryRequestContext } from "../dead-letter-repository";

export interface DrizzleDeadLetterRepoConfig {
  table: PgTable;
  tenantColumn: string;
  db: NodePgDatabase<any>;
}

export class DrizzleSyncDeadLetterRepository<
  TRequestContext extends RepositoryRequestContext = RepositoryRequestContext,
  TTransaction = Parameters<Parameters<NodePgDatabase<any>["transaction"]>[0]>[0]
> extends SyncDeadLetterRepository<TRequestContext, TTransaction>
  implements ISyncDeadLetterRepository<TRequestContext, TTransaction>
{
  protected readonly table: PgTable;
  private readonly config: DrizzleDeadLetterRepoConfig;
  private readonly db: NodePgDatabase<any>;

  constructor(config: DrizzleDeadLetterRepoConfig) {
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
    operation: SyncOperationInput,
    error: string,
    syncAttempts: number,
    tx?: TTransaction
  ): Promise<DeadLetterRecord> {
    const dbOrTx = this.getTx(tx);
    const tenantCol = this.getCol(this.config.tenantColumn);

    const result = await dbOrTx
      .insert(this.table)
      .values({
        [this.config.tenantColumn]: ctx.tenantId,
        operationId: operation.idempotencyKey,
        entity: operation.entityType,
        action: operation.operation,
        entityId: operation.entityId,
        payload: operation.payload,
        error,
        syncAttempts,
        clientTimestamp: new Date(operation.localTimestamp),
        deviceId: operation.deviceId ?? null,
        sourceFingerprint: operation.sourceFingerprint ?? null,
        createdAt: new Date(),
      })
      .returning();

    return this.mapToRecord(result[0]);
  }

  async findMany(
    ctx: TRequestContext,
    options: { limit: number; offset: number; entity?: string }
  ): Promise<DeadLetterRecord[]> {
    const tenantCol = this.getCol(this.config.tenantColumn);
    const conditions = [eq(tenantCol, ctx.tenantId)];

    if (options.entity) {
      conditions.push(eq(this.getCol("entity"), options.entity));
    }

    const results = await this.db
      .select()
      .from(this.table)
      .where(and(...conditions))
      .orderBy(desc(this.getCol("createdAt")))
      .limit(options.limit)
      .offset(options.offset);

    return results.map((r) => this.mapToRecord(r));
  }

  async count(ctx: TRequestContext): Promise<number> {
    const tenantCol = this.getCol(this.config.tenantColumn);

    const result = await this.db
      .select({ count: count() })
      .from(this.table)
      .where(eq(tenantCol, ctx.tenantId));

    return result[0]?.count ?? 0;
  }

  async countByEntity(ctx: TRequestContext, entity: string): Promise<number> {
    const tenantCol = this.getCol(this.config.tenantColumn);
    const entityCol = this.getCol("entity");

    const result = await this.db
      .select({ count: count() })
      .from(this.table)
      .where(and(eq(tenantCol, ctx.tenantId), eq(entityCol, entity)));

    return result[0]?.count ?? 0;
  }

  async findById(ctx: TRequestContext, id: string): Promise<DeadLetterRecord | undefined> {
    const idCol = this.getCol("id");
    const tenantCol = this.getCol(this.config.tenantColumn);

    const result = await this.db
      .select()
      .from(this.table)
      .where(and(eq(tenantCol, ctx.tenantId), eq(idCol, id)))
      .limit(1);

    return result[0] ? this.mapToRecord(result[0]) : undefined;
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

  async deleteOlderThan(days: number): Promise<number> {
    const createdAtCol = this.getCol("createdAt");
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const result = await this.db
      .delete(this.table)
      .where(lt(createdAtCol, cutoff))
      .returning();

    return result.length;
  }

  protected mapToRecord(row: Record<string, any>): DeadLetterRecord {
    return {
      id: row.id,
      operationId: row.operationId,
      entity: row.entity,
      action: row.action,
      entityId: row.entityId,
      payload: row.payload ?? {},
      error: row.error,
      syncAttempts: row.syncAttempts ?? 0,
      originalError: row.originalError ?? undefined,
      clientTimestamp: row.clientTimestamp ?? new Date(),
      deviceId: row.deviceId ?? undefined,
      sourceFingerprint: row.sourceFingerprint ?? undefined,
      createdAt: row.createdAt ?? new Date(),
    };
  }
}
