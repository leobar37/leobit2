/**
 * SyncConflictRepository
 *
 * Repository for managing sync conflict records.
 * Handles conflict creation, resolution, and querying.
 */

import type { SyncOperationInput } from "./types";

/**
 * Sync conflict record
 */
export interface SyncConflict {
  id: string;
  tenantId: string;
  operationId: string;
  entityType: string;
  entityId: string;
  localData: Record<string, unknown>;
  serverData: Record<string, unknown>;
  localVersion: number;
  serverVersion: number;
  status: "pending" | "resolved";
  resolution: "server" | "local" | "merge" | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  sourceDeviceId?: string;
  sourceFingerprint?: string;
  createdAt: Date;
}

/**
 * Resolution data for conflict resolution
 */
export interface ConflictResolutionData {
  resolution: "server" | "local" | "merge";
  mergedData?: Record<string, unknown>;
}

/**
 * Request context interface for repositories
 */
export interface RepositoryRequestContext {
  tenantId: string;
  userId?: string;
}

/**
 * Database/transaction type - generic placeholder
 */
export type DbTransaction = unknown;

/**
 * Table schema type - generic placeholder
 */
export type SyncConflictsTable = unknown;

/**
 * Repository interface for sync conflicts
 */
export interface ISyncConflictRepository<
  TRequestContext extends RepositoryRequestContext = RepositoryRequestContext,
  TTransaction = DbTransaction
> {
  create(
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
  ): Promise<SyncConflict>;

  findById(ctx: TRequestContext, id: string): Promise<SyncConflict | undefined>;

  findByOperationId(
    ctx: TRequestContext,
    operationId: string
  ): Promise<SyncConflict | undefined>;

  findPending(
    ctx: TRequestContext,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<SyncConflict[]>;

  findMany(
    ctx: TRequestContext,
    options?: {
      status?: string;
      entityType?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<SyncConflict[]>;

  countPending(ctx: TRequestContext): Promise<number>;

  resolve(
    ctx: TRequestContext,
    id: string,
    resolution: ConflictResolutionData,
    tx?: TTransaction
  ): Promise<SyncConflict | undefined>;

  delete(ctx: TRequestContext, id: string): Promise<boolean>;

  deleteByOperationId(
    ctx: TRequestContext,
    operationId: string,
    tx?: TTransaction
  ): Promise<boolean>;
}

/**
 * Abstract base class for sync conflict repositories
 *
 * Provides the core logic for conflict persistence.
 * Concrete implementations must provide database access methods.
 */
export abstract class SyncConflictRepository<
  TRequestContext extends RepositoryRequestContext = RepositoryRequestContext,
  TTransaction = DbTransaction,
  TTable = SyncConflictsTable
> implements ISyncConflictRepository<TRequestContext, TTransaction>
{
  protected abstract readonly table: TTable;

  /**
   * Create a new conflict record
   */
  abstract create(
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
  ): Promise<SyncConflict>;

  /**
   * Find conflict by ID
   */
  abstract findById(
    ctx: TRequestContext,
    id: string
  ): Promise<SyncConflict | undefined>;

  /**
   * Find conflict by operation ID
   */
  abstract findByOperationId(
    ctx: TRequestContext,
    operationId: string
  ): Promise<SyncConflict | undefined>;

  /**
   * Find pending conflicts by business
   */
  abstract findPending(
    ctx: TRequestContext,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<SyncConflict[]>;

  /**
   * Find conflicts by business with filters
   */
  abstract findMany(
    ctx: TRequestContext,
    options?: {
      status?: string;
      entityType?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<SyncConflict[]>;

  /**
   * Count pending conflicts
   */
  abstract countPending(ctx: TRequestContext): Promise<number>;

  /**
   * Resolve a conflict
   */
  abstract resolve(
    ctx: TRequestContext,
    id: string,
    resolution: ConflictResolutionData,
    tx?: TTransaction
  ): Promise<SyncConflict | undefined>;

  /**
   * Delete a conflict
   */
  abstract delete(ctx: TRequestContext, id: string): Promise<boolean>;

  /**
   * Delete conflict by operation ID
   */
  abstract deleteByOperationId(
    ctx: TRequestContext,
    operationId: string,
    tx?: TTransaction
  ): Promise<boolean>;
}
