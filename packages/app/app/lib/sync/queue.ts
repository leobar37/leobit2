import type { SyncOperation } from "~/lib/db/schema";

const DB_NAME = "avileo-sync";
const DB_VERSION = 1;
const STORE_NAME = "operations";

export type QueueStatus = "pending" | "processed" | "failed";

export interface QueueOperation extends SyncOperation {
  status: QueueStatus;
  retryCount: number;
  createdAt: number;
  updatedAt: number;
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
    const pending = (rows as QueueOperation[])
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

    existing.status = retryable ? "pending" : "failed";
    existing.retryCount += 1;
    existing.lastError = error;
    existing.updatedAt = Date.now();
    await requestToPromise(store.put(existing));
  });
}
