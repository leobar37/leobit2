import type { SyncOperation } from "~/lib/db/schema";

const DB_NAME = "avileo-sync";
const DB_VERSION = 1;
const STORE_NAME = "operations";

// Exponential backoff configuration
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000; // 1 second
const MAX_DELAY_MS = 60000; // 60 seconds

function calculateExponentialBackoff(retryCount: number): number {
  // Formula: min(BASE_DELAY * (2 ^ retryCount), MAX_DELAY)
  const delay = Math.min(
    BASE_DELAY_MS * Math.pow(2, retryCount),
    MAX_DELAY_MS
  );
  // Add jitter: ±20% randomization to prevent thundering herd
  const jitter = delay * (0.8 + Math.random() * 0.4);
  return Math.floor(jitter);
}

export type QueueStatus = "pending" | "processed" | "failed";

export interface QueueOperation extends SyncOperation {
  status: QueueStatus;
  retryCount: number;
  createdAt: number;
  updatedAt: number;
  nextRetryAt?: number; // Timestamp for next retry attempt
}

function hasIndexedDb(): boolean {
  return typeof indexedDB !== "undefined";
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

async function openDb(): Promise<IDBDatabase> {
  if (!hasIndexedDb()) {
    throw new Error("IndexedDB is not available");
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("nextRetryAt", "nextRetryAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore) => Promise<T>
): Promise<T> {
  const db = await openDb();

  try {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const value = await handler(store);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
      tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    });

    return value;
  } finally {
    db.close();
  }
}

export async function enqueue(operation: SyncOperation): Promise<QueueOperation> {
  const now = Date.now();

  const queueItem: QueueOperation = {
    ...operation,
    status: "pending",
    retryCount: 0,
    createdAt: now,
    updatedAt: now,
    nextRetryAt: now, // Immediately available for sync
  };

  if (!hasIndexedDb()) {
    return queueItem;
  }

  await withStore("readwrite", async (store) => {
    await requestToPromise(store.put(queueItem));
    return undefined;
  });

  return queueItem;
}

export async function listPending(limit = 50): Promise<QueueOperation[]> {
  if (!hasIndexedDb()) {
    return [];
  }

  return withStore("readonly", async (store) => {
    const index = store.index("status");
    const rows = await requestToPromise(index.getAll("pending"));
    const now = Date.now();
    const pending = (rows as QueueOperation[])
      .filter((op) => !op.nextRetryAt || op.nextRetryAt <= now) // Only include operations ready for retry
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, limit);
    return pending;
  });
}

export async function getPendingCount(): Promise<number> {
  if (!hasIndexedDb()) {
    return 0;
  }

  return withStore("readonly", async (store) => {
    const index = store.index("status");
    const count = await requestToPromise(index.count("pending"));
    return count;
  });
}

export async function getOperationById(operationId: string): Promise<QueueOperation | undefined> {
  if (!hasIndexedDb()) {
    return undefined;
  }

  return withStore("readonly", async (store) => {
    const op = (await requestToPromise(store.get(operationId))) as QueueOperation | undefined;
    return op;
  });
}



export async function markProcessed(operationId: string): Promise<void> {
  if (!hasIndexedDb()) {
    return;
  }

  await withStore("readwrite", async (store) => {
    const existing = (await requestToPromise(store.get(operationId))) as QueueOperation | undefined;
    if (!existing) {
      return;
    }

    existing.status = "processed";
    existing.updatedAt = Date.now();
    existing.lastError = undefined;
    existing.nextRetryAt = undefined;
    await requestToPromise(store.put(existing));
  });
}

export async function markFailed(
  operationId: string,
  error: string,
  retryable = true
): Promise<void> {
  if (!hasIndexedDb()) {
    return;
  }

  await withStore("readwrite", async (store) => {
    const existing = (await requestToPromise(store.get(operationId))) as QueueOperation | undefined;
    if (!existing) {
      return;
    }

    existing.retryCount += 1;
    existing.lastError = error;
    existing.updatedAt = Date.now();

    // Determine if operation should be retried
    const shouldRetry = retryable && existing.retryCount < MAX_RETRIES;

    if (shouldRetry) {
      // Calculate next retry time with exponential backoff
      const delayMs = calculateExponentialBackoff(existing.retryCount);
      existing.nextRetryAt = Date.now() + delayMs;
      existing.status = "pending";

      // Log retry info for debugging
      console.debug(
        `[Sync Queue] Operation ${operationId} retry ${existing.retryCount}/${MAX_RETRIES}`,
        `retrying in ${Math.round(delayMs / 1000)}s`,
        `error: ${error}`
      );
    } else {
      // Max retries exceeded or non-retryable error
      existing.status = "failed";
      console.error(
        `[Sync Queue] Operation ${operationId} failed after ${existing.retryCount} retries`,
        `error: ${error}`
      );
    }

    await requestToPromise(store.put(existing));
  });
}

/**
 * Get retry statistics for monitoring and debugging
 */
export async function getRetryStats(): Promise<{
  pending: number;
  failed: number;
  totalRetries: number;
  avgRetries: number;
}> {
  if (!hasIndexedDb()) {
    return { pending: 0, failed: 0, totalRetries: 0, avgRetries: 0 };
  }

  return withStore("readonly", async (store) => {
    const all = await requestToPromise(store.getAll());
    const operations = all as QueueOperation[];

    const pending = operations.filter((op) => op.status === "pending").length;
    const failed = operations.filter((op) => op.status === "failed").length;
    const totalRetries = operations.reduce((sum, op) => sum + op.retryCount, 0);
    const avgRetries = operations.length > 0 ? totalRetries / operations.length : 0;

    return { pending, failed, totalRetries, avgRetries };
  });
}

/**
 * Clear all operations (use with caution - typically for testing only)
 */
export async function clear(): Promise<void> {
  if (!hasIndexedDb()) {
    return;
  }

  await withStore("readwrite", async (store) => {
    await requestToPromise(store.clear());
  });
}
