/**
 * DrizzleSyncOperationRepository
 *
 * Concrete implementation of ISyncOperationRepository using Drizzle ORM.
 * Receives the table schema and column mappings via configuration.
 */

import { eq, and, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  SyncOperationRepository,
  type SyncOperationRecord,
  type SyncOperationRepositoryOptions,
  type ISyncOperationRepository,
} from "../operation-repository";
import type { SyncOperationInput, RepositoryRequestContext } from "../types";

export interface DrizzleOperationRepoConfig {
  /** Drizzle table instance */
  table: PgTable;
  /** Column name for tenant filtering */
  tenantColumn: string;
  /** Column name for idempotency key */
  idempotencyColumn?: string;
  /** Column name for operation status */
  statusColumn?: string;
  /** Column name for processed timestamp */
  processedAtColumn?: string;
  /** Column name for payload */
  payloadColumn?: string;
  /** Column name for operation entity type */
  entityColumn?: string;
  /** Column name for operation action */
  actionColumn?: string;
  /** Column name for entity ID */
  entityIdColumn?: string;
  /** Column name for client timestamp */
  clientTimestampColumn?: string;
  /** Column name for device ID */
  deviceIdColumn?: string;
  /** Column name for source fingerprint */
  sourceFingerprintColumn?: string;
  /** Drizzle database client */
  db: NodePgDatabase<any>;
}

export class DrizzleSyncOperationRepository<
  TRequestContext extends RepositoryRequestContext = RepositoryRequestContext,
  TTransaction = Parameters<Parameters<NodePgDatabase<any>["transaction"]>[0]>[0]
> extends SyncOperationRepository<TRequestContext, TTransaction>
  implements ISyncOperationRepository<TRequestContext, TTransaction>
{
  protected readonly table: PgTable;
  private readonly config: DrizzleOperationRepoConfig;
  private readonly db: NodePgDatabase<any>;

  constructor(config: DrizzleOperationRepoConfig, options?: Partial<SyncOperationRepositoryOptions>) {
    super(options);
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

  async findByIdempotencyKey(
    ctx: TRequestContext,
    idempotencyKey: string,
    tx?: TTransaction
  ): Promise<SyncOperationRecord | undefined> {
    const dbOrTx = this.getTx(tx);
    const idempotencyCol = this.getCol(this.config.idempotencyColumn ?? "operationId");
    const tenantCol = this.getCol(this.config.tenantColumn);

    const result = await dbOrTx
      .select()
      .from(this.table)
      .where(and(eq(tenantCol, ctx.tenantId), eq(idempotencyCol, idempotencyKey)))
      .limit(1);

    if (!result[0]) return undefined;
    return this.mapToRecord(result[0]);
  }

  async findByIdempotencyKeyForUpdate(
    ctx: TRequestContext,
    idempotencyKey: string,
    tx?: TTransaction
  ): Promise<SyncOperationRecord | undefined> {
    // For row locking, we need a transaction
    if (!tx) {
      return this.findByIdempotencyKey(ctx, idempotencyKey);
    }

    const idempotencyCol = this.getCol(this.config.idempotencyColumn ?? "operationId");
    const tenantCol = this.getCol(this.config.tenantColumn);

    const result = await (tx as any)
      .select()
      .from(this.table)
      .where(and(eq(tenantCol, ctx.tenantId), eq(idempotencyCol, idempotencyKey)))
      .for("update")
      .limit(1);

    if (!result[0]) return undefined;
    return this.mapToRecord(result[0]);
  }

  async updateStatus(
    ctx: TRequestContext,
    idempotencyKey: string,
    status: "processed" | "failed",
    error: string | null,
    tx?: TTransaction,
    payload?: Record<string, unknown>
  ): Promise<void> {
    const dbOrTx = this.getTx(tx);
    const idempotencyCol = this.getCol(this.config.idempotencyColumn ?? "operationId");
    const tenantCol = this.getCol(this.config.tenantColumn);
    const statusCol = this.getCol(this.config.statusColumn ?? "status");
    const processedAtCol = this.getCol(this.config.processedAtColumn ?? "processedAt");
    const payloadCol = this.getCol(this.config.payloadColumn ?? "payload");

    const updateData: Record<string, any> = {
      [statusCol.name]: status,
      [processedAtCol.name]: status === "processed" ? new Date() : null,
    };

    if (error !== null) {
      updateData["error"] = error;
    }

    if (payload !== undefined) {
      updateData[payloadCol.name] = payload;
    }

    await dbOrTx
      .update(this.table)
      .set(updateData)
      .where(and(eq(tenantCol, ctx.tenantId), eq(idempotencyCol, idempotencyKey)));
  }

  protected async updateExistingOperation(
    ctx: TRequestContext,
    operation: SyncOperationInput,
    tx?: TTransaction
  ): Promise<void> {
    const dbOrTx = this.getTx(tx);
    const idempotencyCol = this.getCol(this.config.idempotencyColumn ?? "operationId");
    const tenantCol = this.getCol(this.config.tenantColumn);
    const entityCol = this.getCol(this.config.entityColumn ?? "entity");
    const actionCol = this.getCol(this.config.actionColumn ?? "action");
    const entityIdCol = this.getCol(this.config.entityIdColumn ?? "entityId");
    const payloadCol = this.getCol(this.config.payloadColumn ?? "payload");
    const clientTimestampCol = this.getCol(this.config.clientTimestampColumn ?? "clientTimestamp");

    await dbOrTx
      .update(this.table)
      .set({
        [entityCol.name]: operation.entityType,
        [actionCol.name]: operation.operation,
        [entityIdCol.name]: operation.entityId,
        [payloadCol.name]: operation.payload,
        [clientTimestampCol.name]: new Date(operation.localTimestamp),
        status: "pending",
      })
      .where(and(eq(tenantCol, ctx.tenantId), eq(idempotencyCol, operation.idempotencyKey)));
  }

  protected async insertNewOperation(
    ctx: TRequestContext,
    operation: SyncOperationInput,
    tx?: TTransaction
  ): Promise<void> {
    const dbOrTx = this.getTx(tx);
    const payloadCol = this.getCol(this.config.payloadColumn ?? "payload");
    const clientTimestampCol = this.getCol(this.config.clientTimestampColumn ?? "clientTimestamp");
    const deviceIdCol = this.config.deviceIdColumn
      ? this.getCol(this.config.deviceIdColumn)
      : null;
    const sourceFingerprintCol = this.config.sourceFingerprintColumn
      ? this.getCol(this.config.sourceFingerprintColumn)
      : null;

    const insertData: Record<string, any> = {
      [this.config.tenantColumn]: ctx.tenantId,
      [this.config.idempotencyColumn ?? "operationId"]: operation.idempotencyKey,
      [this.config.entityColumn ?? "entity"]: operation.entityType,
      [this.config.actionColumn ?? "action"]: operation.operation,
      [this.config.entityIdColumn ?? "entityId"]: operation.entityId,
      [payloadCol.name]: operation.payload,
      [clientTimestampCol.name]: new Date(operation.localTimestamp),
      status: "pending",
    };

    if (deviceIdCol && operation.deviceId) {
      insertData[deviceIdCol.name] = operation.deviceId;
    }

    if (sourceFingerprintCol && operation.sourceFingerprint) {
      insertData[sourceFingerprintCol.name] = operation.sourceFingerprint;
    }

    await dbOrTx.insert(this.table).values(insertData);
  }

  async findMany(
    ctx: TRequestContext,
    options: {
      status?: string;
      since?: Date;
      limit?: number;
      entityTypes?: string[];
      cursorOperationId?: string;
    }
  ): Promise<SyncOperationRecord[]> {
    const dbOrTx = this.getTx();
    const tenantCol = this.getCol(this.config.tenantColumn);
    const conditions: any[] = [eq(tenantCol, ctx.tenantId)];

    if (options.status) {
      const statusCol = this.getCol(this.config.statusColumn ?? "status");
      conditions.push(eq(statusCol, options.status));
    }

    if (options.since) {
      const processedAtCol = this.getCol(this.config.processedAtColumn ?? "processedAt");
      conditions.push(sql`${processedAtCol} > ${options.since}`);
    }

    if (options.entityTypes && options.entityTypes.length > 0) {
      const entityCol = this.getCol(this.config.entityColumn ?? "entity");
      conditions.push(sql`${entityCol} IN (${options.entityTypes.join(",")})`);
    }

    let query = dbOrTx
      .select()
      .from(this.table)
      .where(and(...conditions))
      .orderBy(sql`${this.getCol(this.config.processedAtColumn ?? "processedAt")} ASC`);

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const results = await query;
    return results.map((r: any) => this.mapToRecord(r));
  }

  protected mapToRecord(row: Record<string, any>): SyncOperationRecord {
    const payloadCol = this.getCol(this.config.payloadColumn ?? "payload");
    const processedAtCol = this.getCol(this.config.processedAtColumn ?? "processedAt");

    return {
      id: row.id ?? row[this.getCol("id")?.name],
      operationId: row[this.config.idempotencyColumn ?? "operationId"],
      status: row[this.config.statusColumn ?? "status"],
      processedAt: row[processedAtCol?.name] ?? null,
      payload: row[payloadCol?.name] ?? {},
    };
  }
}
