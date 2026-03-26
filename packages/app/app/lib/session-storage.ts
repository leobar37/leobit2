const AUTH_TOKEN_KEY = "bearer_token";
const CURRENT_BUSINESS_ID_KEY = "current_business_id";

// Sync-related localStorage keys
const PULL_CURSOR_KEY = "avileo_pull_cursor";
const SCHEMA_VERSION_KEY = "avileo_schema_version";
const SCHEMA_HASH_KEY = "avileo_schema_hash";
const FORCE_RESET_KEY = "AVILEO_FORCE_RESET";
const CALCULATOR_LAST_KEY = "avileo-calculator-last";
const LOCAL_DB_NAMESPACE_KEY = "avileo_local_db_namespace";
const LOCAL_DB_BASE_NAME = "avileo-pg";

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

export function getLocalDatabaseNamespace(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(LOCAL_DB_NAMESPACE_KEY);
}

export function setLocalDatabaseNamespace(namespace: string) {
  if (!canUseStorage()) return;
  localStorage.setItem(LOCAL_DB_NAMESPACE_KEY, namespace);
}

export function clearLocalDatabaseNamespace() {
  if (!canUseStorage()) return;
  localStorage.removeItem(LOCAL_DB_NAMESPACE_KEY);
}

export function buildLocalDatabaseName(namespace?: string | null) {
  return namespace ? `${LOCAL_DB_BASE_NAME}-${namespace}` : LOCAL_DB_BASE_NAME;
}

export function getLocalDatabaseName(): string {
  return buildLocalDatabaseName(getLocalDatabaseNamespace());
}

export function getPullCursorStorageKey(namespace?: string | null) {
  return namespace ? `${PULL_CURSOR_KEY}:${namespace}` : PULL_CURSOR_KEY;
}

export function clearSyncKeys() {
  if (!canUseStorage()) return;
  
  // Remove base cursor key
  localStorage.removeItem(PULL_CURSOR_KEY);
  
  // Remove all cursor keys with namespace (avileo_pull_cursor:*)
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`${PULL_CURSOR_KEY}:`)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  localStorage.removeItem(SCHEMA_VERSION_KEY);
  localStorage.removeItem(SCHEMA_HASH_KEY);
  localStorage.removeItem(FORCE_RESET_KEY);
  localStorage.removeItem(CALCULATOR_LAST_KEY);
}

export function markLocalDatabaseForReset() {
  if (!canUseStorage()) return;
  localStorage.setItem(FORCE_RESET_KEY, "true");
}

// Known IndexedDB database names used by the app
// Note: 'avileo-pg' is handled by resetDatabase() in ~/engine/db.ts
const KNOWN_DB_NAMES = [
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
    console.log("[ClearSync] Storage not available, skipping");
    return;
  }

  console.log("[ClearSync] Starting IndexedDB cleanup...");

  // Clear session only when not preserving (default now logs out)
  if (!preserveSession) {
    console.log("[ClearSync] Clearing session storage...");
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(CURRENT_BUSINESS_ID_KEY);
    console.log("[ClearSync] Session storage cleared");
  }

  // Always clear sync-related keys (these control sync behavior)
  console.log("[ClearSync] Clearing sync keys...");
  clearSyncKeys();
  console.log("[ClearSync] Sync keys cleared");

  // Clear IndexedDB databases
  const results: Array<{ name: string; success: boolean }> = [];

  // Delete sequentially to avoid race conditions
  for (const dbName of KNOWN_DB_NAMES) {
    console.log(`[ClearSync] Deleting database: ${dbName}...`);
    const success = await deleteDatabaseWithTimeout(dbName);
    results.push({ name: dbName, success });
    console.log(`[ClearSync] Database ${dbName}: ${success ? "deleted" : "failed/skip"}`);
    
    // Small delay between deletions to ensure cleanup
    if (KNOWN_DB_NAMES.indexOf(dbName) < KNOWN_DB_NAMES.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log("[ClearSync] IndexedDB cleanup complete:", results);
}
