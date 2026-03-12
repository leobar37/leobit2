/**
 * Write Engine
 * Handles writes to API with offline queue support
 * Push: API (online) or IndexedDB queue (offline)
 * Pull: ElectricSQL sync (automatic)
 */
import { api } from "~/lib/api-client";

// Queue storage keys
const QUEUE_STORE = "avileo-write-queue";
const QUEUE_DB_VERSION = 1;

interface PendingWrite {
  id: string;
  endpoint: string;
  method: "POST" | "PUT" | "DELETE" | "PATCH";
  body: unknown;
  attempts: number;
  createdAt: number;
  lastError?: string;
}

interface WriteResult {
  success: boolean;
  data?: unknown;
  error?: string;
  queued?: boolean;
}

/**
 * Execute a write operation
 * Online: Direct API call
 * Offline: Queue for later processing
 */
export async function pushWrite(
  endpoint: string,
  method: "POST" | "PUT" | "DELETE" | "PATCH",
  body: unknown
): Promise<WriteResult> {
  // Check online status
  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const result = await executeWrite({ endpoint, method, body });
      return { success: true, data: result };
    } catch (error) {
      // If API fails, queue for retry
      const pendingWrite: PendingWrite = {
        id: crypto.randomUUID(),
        endpoint,
        method,
        body,
        attempts: 1,
        createdAt: Date.now(),
        lastError: error instanceof Error ? error.message : String(error),
      };
      await queueWrite(pendingWrite);
      return {
        success: false,
        error: String(error),
        queued: true,
      };
    }
  }

  // Offline: queue the write
  const pendingWrite: PendingWrite = {
    id: crypto.randomUUID(),
    endpoint,
    method,
    body,
    attempts: 0,
    createdAt: Date.now(),
  };
  await queueWrite(pendingWrite);

  return { success: true, queued: true };
}

/**
 * Execute write directly via API
 */
async function executeWrite({
  endpoint,
  method,
  body,
}: {
  endpoint: string;
  method: string;
  body: unknown;
}): Promise<unknown> {
  // Parse endpoint to construct API call
  // Format: "/api/entity" or "/api/entity/id" or "/api/entity/id/action"
  const parts = endpoint.replace(/^\//, "").split("/");

  if (parts.length < 2) {
    throw new Error(`Invalid endpoint: ${endpoint}`);
  }

  const resource = parts[1];
  const id = parts[2];
  const action = parts[3];

  // Build API path
  let apiPath: unknown = api;

  // Navigate to resource
  if (resource in (apiPath as Record<string, unknown>)) {
    apiPath = (apiPath as Record<string, unknown>)[resource];
  } else {
    throw new Error(`Unknown resource: ${resource}`);
  }

  // Navigate to ID if present
  if (id) {
    if (typeof apiPath === "function") {
      apiPath = (apiPath as (params: { id: string }) => unknown)({ id });
    }
  }

  // Navigate to action if present
  if (action) {
    if (action in (apiPath as Record<string, unknown>)) {
      apiPath = (apiPath as Record<string, unknown>)[action];
    }
  }

  // Execute method
  let response: { data?: unknown; error?: { value: unknown } };

  switch (method) {
    case "POST":
      response = await (apiPath as { post: (body: unknown) => Promise<{ data?: unknown; error?: { value: unknown } }> }).post(body);
      break;
    case "PUT":
      response = await (apiPath as { put: (body: unknown) => Promise<{ data?: unknown; error?: { value: unknown } }> }).put(body);
      break;
    case "PATCH":
      response = await (apiPath as { patch: (body: unknown) => Promise<{ data?: unknown; error?: { value: unknown } }> }).patch(body);
      break;
    case "DELETE":
      response = await (apiPath as { delete: () => Promise<{ data?: unknown; error?: { value: unknown } }> }).delete();
      break;
    default:
      throw new Error(`Unknown method: ${method}`);
  }

  if (response.error) {
    throw new Error(String(response.error.value));
  }

  return response.data;
}

/**
 * Queue a write for later processing
 */
async function queueWrite(write: PendingWrite): Promise<void> {
  const db = await openQueueDB();
  const transaction = db.transaction([QUEUE_STORE], "readwrite");
  const store = transaction.objectStore(QUEUE_STORE);

  await new Promise<void>((resolve, reject) => {
    const request = store.add(write);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  db.close();
}

/**
 * Get all pending writes
 */
export async function getPendingWrites(): Promise<PendingWrite[]> {
  const db = await openQueueDB();
  const transaction = db.transaction([QUEUE_STORE], "readonly");
  const store = transaction.objectStore(QUEUE_STORE);

  const writes = await new Promise<PendingWrite[]>((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as PendingWrite[]);
    request.onerror = () => reject(request.error);
  });

  db.close();
  return writes.sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Remove a write from queue
 */
async function removeWrite(id: string): Promise<void> {
  const db = await openQueueDB();
  const transaction = db.transaction([QUEUE_STORE], "readwrite");
  const store = transaction.objectStore(QUEUE_STORE);

  await new Promise<void>((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  db.close();
}

/**
 * Update write attempts and error
 */
async function updateWrite(write: PendingWrite): Promise<void> {
  const db = await openQueueDB();
  const transaction = db.transaction([QUEUE_STORE], "readwrite");
  const store = transaction.objectStore(QUEUE_STORE);

  await new Promise<void>((resolve, reject) => {
    const request = store.put(write);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  db.close();
}

/**
 * Process all pending writes
 * Called when coming back online
 */
export async function processQueue(): Promise<{
  processed: number;
  failed: number;
  errors: string[];
}> {
  const writes = await getPendingWrites();
  const result = { processed: 0, failed: 0, errors: [] as string[] };

  for (const write of writes) {
    try {
      await executeWrite({
        endpoint: write.endpoint,
        method: write.method,
        body: write.body,
      });
      await removeWrite(write.id);
      result.processed++;
    } catch (error) {
      write.attempts++;
      write.lastError = error instanceof Error ? error.message : String(error);

      // Max 5 attempts, then mark as failed
      if (write.attempts >= 5) {
        result.failed++;
        result.errors.push(`${write.endpoint}: ${write.lastError}`);
        // Keep in queue for manual retry
      }

      await updateWrite(write);
    }
  }

  return result;
}

/**
 * Get queue status
 */
export async function getQueueStatus(): Promise<{
  pending: number;
  failed: number;
}> {
  const writes = await getPendingWrites();
  return {
    pending: writes.filter((w) => w.attempts < 5).length,
    failed: writes.filter((w) => w.attempts >= 5).length,
  };
}

/**
 * Clear all pending writes (use with caution)
 */
export async function clearQueue(): Promise<void> {
  const db = await openQueueDB();
  const transaction = db.transaction([QUEUE_STORE], "readwrite");
  const store = transaction.objectStore(QUEUE_STORE);

  await new Promise<void>((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  db.close();
}

/**
 * Open IndexedDB for queue
 */
function openQueueDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("AvileoWriteQueue", QUEUE_DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
      }
    };
  });
}

/**
 * Setup online/offline listeners
 */
export function setupNetworkListeners(
  onOnline?: () => void,
  onOffline?: () => void
): () => void {
  const handleOnline = () => {
    // Process queue when coming back online
    processQueue().then((result) => {
      if (result.processed > 0) {
        console.log(`Processed ${result.processed} pending writes`);
      }
      if (result.failed > 0) {
        console.error(`${result.failed} writes failed`, result.errors);
      }
    });
    onOnline?.();
  };

  const handleOffline = () => {
    onOffline?.();
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
