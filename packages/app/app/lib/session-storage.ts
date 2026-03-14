const AUTH_TOKEN_KEY = "bearer_token";
const CURRENT_BUSINESS_ID_KEY = "current_business_id";

export interface ClearSyncStorageOptions {
  preserveSession?: boolean;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getStoredAuthToken(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getStoredBusinessId(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(CURRENT_BUSINESS_ID_KEY);
}

export function setStoredBusinessId(businessId: string) {
  if (!canUseStorage()) return;
  localStorage.setItem(CURRENT_BUSINESS_ID_KEY, businessId);
}

export function clearStoredBusinessId() {
  if (!canUseStorage()) return;
  localStorage.removeItem(CURRENT_BUSINESS_ID_KEY);
}

export function clearStoredAuthState() {
  if (!canUseStorage()) return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(CURRENT_BUSINESS_ID_KEY);
}

// Known IndexedDB database names used by the app
const KNOWN_DB_NAMES = [
  'avileo-pg',
  'pglite', 
  'electric',
  'TanStackDB',
  'tanstack-db'
];

/**
 * Attempt to close any open connections to a database before deleting
 */
async function closeDatabaseConnections(dbName: string): Promise<void> {
  return new Promise((resolve) => {
    const request = window.indexedDB.open(dbName);
    const timeout = setTimeout(() => {
      resolve();
    }, 1000);

    request.onsuccess = (event) => {
      clearTimeout(timeout);
      const db = (event.target as IDBOpenDBRequest).result;
      try {
        db.close();
      } catch {
        // Ignore close errors
      }
      resolve();
    };

    request.onerror = () => {
      clearTimeout(timeout);
      resolve(); // Continue even if we can't close
    };

    request.onblocked = () => {
      clearTimeout(timeout);
      resolve(); // Continue even if blocked
    };
  });
}

/**
 * Delete a database with timeout
 */
async function deleteDatabaseWithTimeout(dbName: string): Promise<boolean> {
  // First try to close any open connections
  await closeDatabaseConnections(dbName);

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(false);
    }, 2000);

    try {
      const request = window.indexedDB.deleteDatabase(dbName);

      request.onsuccess = () => {
        clearTimeout(timeout);
        resolve(true);
      };

      request.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };

      request.onblocked = () => {
        clearTimeout(timeout);
        // If blocked, we can't do much - resolve anyway
        resolve(false);
      };
    } catch {
      clearTimeout(timeout);
      resolve(false);
    }
  });
}

/**
 * Clear sync-related local storage and IndexedDB state.
 * By default this logs out the user (preserveSession: false) for a complete reset.
 */
export async function clearSyncStorage(
  options: ClearSyncStorageOptions = {}
): Promise<void> {
  const { preserveSession = false } = options;

  if (!canUseStorage()) {
    return;
  }

  // Clear session only when not preserving (default now logs out)
  if (!preserveSession) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(CURRENT_BUSINESS_ID_KEY);
  }

  // Clear IndexedDB databases
  const results: Array<{ name: string; success: boolean }> = [];

  // Delete sequentially to avoid race conditions
  for (const dbName of KNOWN_DB_NAMES) {
    const success = await deleteDatabaseWithTimeout(dbName);
    results.push({ name: dbName, success });
  }
}
