/**
 * Sync Mutex - Coordinates push and pull operations to prevent race conditions
 *
 * Problem: Push (client → server) and Pull (server → client) can run concurrently,
 * causing data corruption when both modify the same records.
 *
 * Solution: A simple mutex that ensures only one sync operation runs at a time.
 * If an operation is in progress, subsequent operations wait in a queue.
 */

/**
 * Type of sync operation
 */
export type SyncOperationType = "push" | "pull";

/**
 * Interface for a sync mutex implementation
 */
export interface ISyncMutex {
  /**
   * Attempt to acquire the mutex for a sync operation.
   * If mutex is busy, the operation is queued and waits.
   *
   * @param type - The type of sync operation ("push" or "pull")
   * @returns Promise that resolves when mutex is acquired
   */
  acquire(type: SyncOperationType): Promise<boolean>;

  /**
   * Release the mutex, allowing the next queued operation to proceed.
   */
  release(): void;

  /**
   * Check if mutex is currently locked.
   */
  isBusy(): boolean;

  /**
   * Get the currently running operation type.
   */
  getCurrentOperation(): SyncOperationType | null;

  /**
   * Get the number of operations waiting in queue.
   */
  getQueueLength(): number;

  /**
   * Reset the mutex (useful for testing or recovery scenarios).
   * Clears all pending operations.
   */
  reset(): void;
}

interface QueuedOperation {
  type: SyncOperationType;
  resolve: (value: boolean) => void;
  reject: (reason: Error) => void;
}

/**
 * SyncMutex - Coordinates sync operations to prevent race conditions
 *
 * Ensures only one sync operation (push or pull) runs at a time.
 * Same-type operations are allowed to run concurrently (re-entrant).
 */
export class SyncMutex implements ISyncMutex {
  private isLocked = false;
  private currentOperation: SyncOperationType | null = null;
  private queue: QueuedOperation[] = [];

  /**
   * Attempt to acquire the mutex for a sync operation.
   * If mutex is free, acquire immediately
   *
   * @param type - The type of sync operation ("push" or "pull")
   * @returns Promise that resolves when mutex is acquired
   */
  async acquire(type: SyncOperationType): Promise<boolean> {
    // If mutex is free, acquire immediately
    if (!this.isLocked) {
      this.isLocked = true;
      this.currentOperation = type;
      return true;
    }

    // If same operation type is already running, allow it (re-entrant for same type)
    // This allows multiple pushes to queue but blocks pull during push
    if (this.currentOperation === type) {
      return true;
    }

    // Different operation type - must wait
    return new Promise((resolve, reject) => {
      this.queue.push({ type, resolve, reject });
    });
  }

  /**
   * Release the mutex, allowing the next queued operation to proceed.
   */
  release(): void {
    this.isLocked = false;
    this.currentOperation = null;

    // Process next item in queue
    const next = this.queue.shift();
    if (next) {
      this.isLocked = true;
      this.currentOperation = next.type;
      next.resolve(true);
    }
  }

  /**
   * Check if mutex is currently locked.
   */
  isBusy(): boolean {
    return this.isLocked;
  }

  /**
   * Get the currently running operation type.
   */
  getCurrentOperation(): SyncOperationType | null {
    return this.currentOperation;
  }

  /**
   * Get the number of operations waiting in queue.
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Reset the mutex (useful for testing or recovery scenarios).
   * Clears all pending operations.
   */
  reset(): void {
    // Reject all pending operations
    for (const op of this.queue) {
      op.reject(new Error("Sync mutex reset - operation cancelled"));
    }
    this.queue = [];
    this.isLocked = false;
    this.currentOperation = null;
  }
}

/**
 * Factory function to create a new SyncMutex instance.
 */
export function createSyncMutex(): ISyncMutex {
  return new SyncMutex();
}
