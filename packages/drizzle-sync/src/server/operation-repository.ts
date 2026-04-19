/**
 * SyncOperationRepository
 *
 * Repository for managing sync operation records.
 * Handles idempotency, status updates, and operation persistence.
 */

import type { SyncOperationInput } from "./types";

/**
 * Sync operation record from database
 */
export interface SyncOperationRecord {
  id: string;
  operationId: string;
  status: "pending" | "processed" | "failed";
  processedAt: Date | null;
  payload: Record<string, unknown>;
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
export type SyncOperationsTable = unknown;

/**
 * Repository interface for sync operations
 */
export interface ISyncOperationRepository<
  TRequestContext extends RepositoryRequestContext = RepositoryRequestContext,
  TTransaction = DbTransaction
> {
  findByIdempotencyKey(
    ctx: TRequestContext,
    idempotencyKey: string,
    tx?: TTransaction
  ): Promise<SyncOperationRecord | undefined>;

  findByIdempotencyKeyForUpdate(
    ctx: TRequestContext,
    idempotencyKey: string,
    tx?: TTransaction
  ): Promise<SyncOperationRecord | undefined>;

  insertOrUpdate(
    ctx: TRequestContext,
    operation: SyncOperationInput,
    tx?: TTransaction
  ): Promise<"inserted" | "updated" | "already-processed">;

  updateStatus(
    ctx: TRequestContext,
    idempotencyKey: string,
    status: "processed" | "failed",
    error: string | null,
    tx?: TTransaction,
    payload?: Record<string, unknown>
  ): Promise<void>;
}

/**
 * Options for creating a SyncOperationRepository
 */
export interface SyncOperationRepositoryOptions {
  /** Function to check if error is a unique constraint violation */
  isUniqueConstraintViolation: (error: unknown) => boolean;
  /** Function to get current timestamp */
  now: () => Date;
}

/**
 * Abstract base class for sync operation repositories
 *
 * Provides the core logic for operation persistence.
 * Concrete implementations must provide database access methods.
 */
export abstract class SyncOperationRepository<
  TRequestContext extends RepositoryRequestContext = RepositoryRequestContext,
  TTransaction = DbTransaction,
  TTable = SyncOperationsTable
> implements ISyncOperationRepository<TRequestContext, TTransaction>
{
  protected abstract readonly table: TTable;
  protected readonly options: SyncOperationRepositoryOptions;

  constructor(options: Partial<SyncOperationRepositoryOptions> = {}) {
    this.options = {
      isUniqueConstraintViolation: options.isUniqueConstraintViolation ?? this.defaultIsUniqueConstraintViolation,
      now: options.now ?? (() => new Date()),
    };
  }

  /**
   * Find operation by idempotency key
   */
  abstract findByIdempotencyKey(
    ctx: TRequestContext,
    idempotencyKey: string,
    tx?: TTransaction
  ): Promise<SyncOperationRecord | undefined>;

  /**
   * Find operation by idempotency key for update (with row lock)
   */
  abstract findByIdempotencyKeyForUpdate(
    ctx: TRequestContext,
    idempotencyKey: string,
    tx?: TTransaction
  ): Promise<SyncOperationRecord | undefined>;

  /**
   * Insert or update an operation
   *
   * Returns:
   * - "inserted" if a new record was created
   * - "updated" if an existing pending/failed record was updated
   * - "already-processed" if the record was already processed
   */
  async insertOrUpdate(
    ctx: TRequestContext,
    operation: SyncOperationInput,
    tx?: TTransaction
  ): Promise<"inserted" | "updated" | "already-processed"> {
    const existing = await this.findByIdempotencyKeyForUpdate(
      ctx,
      operation.idempotencyKey,
      tx
    );

    if (existing?.status === "processed") {
      return "already-processed";
    }

    if (existing?.status === "pending" || existing?.status === "failed") {
      await this.updateExistingOperation(ctx, operation, tx);
      return "updated";
    }

    try {
      await this.insertNewOperation(ctx, operation, tx);
      return "inserted";
    } catch (error) {
      if (this.options.isUniqueConstraintViolation(error)) {
        const recovered = await this.findByIdempotencyKeyForUpdate(
          ctx,
          operation.idempotencyKey,
          tx
        );

        if (
          recovered?.status === "pending" ||
          recovered?.status === "failed"
        ) {
          await this.updateExistingOperation(ctx, operation, tx);
          return "updated";
        }
        return "already-processed";
      }
      throw error;
    }
  }

  /**
   * Update operation status
   */
  abstract updateStatus(
    ctx: TRequestContext,
    idempotencyKey: string,
    status: "processed" | "failed",
    error: string | null,
    tx?: TTransaction,
    payload?: Record<string, unknown>
  ): Promise<void>;

  // Protected methods for concrete implementations

  /**
   * Update an existing operation record
   */
  protected abstract updateExistingOperation(
    ctx: TRequestContext,
    operation: SyncOperationInput,
    tx?: TTransaction
  ): Promise<void>;

  /**
   * Insert a new operation record
   */
  protected abstract insertNewOperation(
    ctx: TRequestContext,
    operation: SyncOperationInput,
    tx?: TTransaction
  ): Promise<void>;

  /**
   * Default unique constraint violation check
   */
  protected defaultIsUniqueConstraintViolation(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes("unique") || message.includes("duplicate");
    }
    return false;
  }
}
