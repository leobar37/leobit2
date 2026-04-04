/**
 * Sync Queue Interface
 * 
 * Defines the contract for managing the sync operations queue.
 * This abstraction allows for different implementations (PGlite, in-memory, etc.)
 * and enables easier testing.
 */

import type { SyncOperationRecord, DeadLetterOperationRecord, SyncStatus, EnqueueParams } from "../sync-service";

/**
 * Interface for sync queue operations
 */
export interface ISyncQueue {
  /**
   * Add an operation to the queue
   */
  enqueue(params: EnqueueParams): Promise<string>;

  /**
   * Get pending operations (status = pending or failed)
   */
  getPending(limit: number): Promise<SyncOperationRecord[]>;

  /**
   * Get a single operation by ID
   */
  getById(id: string): Promise<SyncOperationRecord | null>;

  /**
   * Get operations by entity type and ID with specific statuses
   */
  getByEntityType(entityType: string, entityId: string, statuses: string[]): Promise<SyncOperationRecord[]>;

  /**
   * Mark an operation as processing
   */
  markProcessing(id: string): Promise<void>;

  /**
   * Mark an operation as completed
   */
  markCompleted(id: string): Promise<void>;

  /**
   * Mark an operation as failed
   */
  markFailed(id: string, error: string, attempts: number): Promise<void>;

  /**
   * Mark an operation as having a conflict
   */
  markConflict(id: string, conflictData: unknown): Promise<void>;

  /**
   * Move an operation to the dead letter queue
   */
  moveToDeadLetter(operation: SyncOperationRecord, error: string): Promise<void>;

  /**
   * Get current queue status counts
   */
  getStatus(): Promise<SyncStatus>;

  /**
   * Delete an operation from the queue
   */
  deleteOperation(id: string): Promise<boolean>;

  /**
   * Retry a failed operation
   */
  retryOperation(id: string): Promise<boolean>;

  /**
   * Get failed operations
   */
  getFailedOperations(limit: number): Promise<SyncOperationRecord[]>;

  /**
   * Get dead letter operations
   */
  getDeadLetterOperations(limit: number): Promise<DeadLetterOperationRecord[]>;
}
