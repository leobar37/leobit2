/**
 * SyncDeadLetterRepository
 *
 * Repository for managing dead letter queue records.
 * Handles failed operations that exceeded retry limits.
 */

import type { SyncOperationInput } from "./types";

/**
 * Dead letter record
 */
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

/**
 * Request context interface for repositories
 */
export interface RepositoryRequestContext {
  businessId: string;
  businessUserId?: string;
}

/**
 * Database/transaction type - generic placeholder
 */
export type DbTransaction = unknown;

/**
 * Table schema type - generic placeholder
 */
export type SyncDeadLetterTable = unknown;

/**
 * Repository interface for dead letter queue
 */
export interface ISyncDeadLetterRepository<
  TRequestContext extends RepositoryRequestContext = RepositoryRequestContext,
  TTransaction = DbTransaction
> {
  create(
    ctx: TRequestContext,
    operation: SyncOperationInput,
    error: string,
    syncAttempts: number,
    tx?: TTransaction
  ): Promise<DeadLetterRecord>;

  findByBusiness(
    ctx: TRequestContext,
    options: { limit: number; offset: number; entity?: string }
  ): Promise<DeadLetterRecord[]>;

  countByBusiness(ctx: TRequestContext): Promise<number>;

  countByBusinessAndEntity(ctx: TRequestContext, entity: string): Promise<number>;

  findById(ctx: TRequestContext, id: string): Promise<DeadLetterRecord | undefined>;

  delete(ctx: TRequestContext, id: string): Promise<boolean>;

  deleteOlderThan(days: number): Promise<number>;
}

/**
 * Abstract base class for dead letter repositories
 *
 * Provides the core logic for dead letter persistence.
 * Concrete implementations must provide database access methods.
 */
export abstract class SyncDeadLetterRepository<
  TRequestContext extends RepositoryRequestContext = RepositoryRequestContext,
  TTransaction = DbTransaction,
  TTable = SyncDeadLetterTable
> implements ISyncDeadLetterRepository<TRequestContext, TTransaction>
{
  protected abstract readonly table: TTable;

  /**
   * Create a new dead letter record
   */
  abstract create(
    ctx: TRequestContext,
    operation: SyncOperationInput,
    error: string,
    syncAttempts: number,
    tx?: TTransaction
  ): Promise<DeadLetterRecord>;

  /**
   * Find dead letter records by business
   */
  abstract findByBusiness(
    ctx: TRequestContext,
    options: { limit: number; offset: number; entity?: string }
  ): Promise<DeadLetterRecord[]>;

  /**
   * Count dead letter records by business
   */
  abstract countByBusiness(ctx: TRequestContext): Promise<number>;

  /**
   * Count dead letter records by business and entity
   */
  abstract countByBusinessAndEntity(
    ctx: TRequestContext,
    entity: string
  ): Promise<number>;

  /**
   * Find dead letter record by ID
   */
  abstract findById(
    ctx: TRequestContext,
    id: string
  ): Promise<DeadLetterRecord | undefined>;

  /**
   * Delete a dead letter record
   */
  abstract delete(ctx: TRequestContext, id: string): Promise<boolean>;

  /**
   * Delete dead letter records older than specified days
   */
  abstract deleteOlderThan(days: number): Promise<number>;

  /**
   * Map a database row to a DeadLetterRecord
   */
  protected mapToRecord(row: Record<string, unknown>): DeadLetterRecord {
    return {
      id: row.id as string,
      operationId: row.operationId as string,
      entity: row.entity as string,
      action: row.action as string,
      entityId: row.entityId as string,
      payload: row.payload as Record<string, unknown>,
      error: row.error as string,
      syncAttempts: row.syncAttempts as number,
      originalError: row.originalError as string | undefined,
      clientTimestamp: row.clientTimestamp as Date,
      deviceId: row.deviceId as string | undefined,
      sourceFingerprint: row.sourceFingerprint as string | undefined,
      createdAt: row.createdAt as Date,
    };
  }
}
