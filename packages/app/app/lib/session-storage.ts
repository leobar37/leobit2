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
      console.log(`[Sync] Timeout closing ${dbName}, continuing...`);
      resolve();
    }, 1000);
    
    request.onsuccess = (event) => {
      clearTimeout(timeout);
      const db = (event.target as IDBOpenDBRequest).result;
      try {
        db.close();
        console.log(`[Sync] Closed connection to ${dbName}`);
      } catch (e) {
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
    console.log(`[Sync] Deleting database: ${dbName}...`);
    
    const timeout = setTimeout(() => {
      console.warn(`[Sync] Timeout deleting ${dbName}, skipping...`);
      resolve(false);
    }, 2000);
    
    try {
      const request = window.indexedDB.deleteDatabase(dbName);
      
      request.onsuccess = () => {
        clearTimeout(timeout);
        console.log(`[Sync] ✓ Deleted: ${dbName}`);
        resolve(true);
      };
      
      request.onerror = () => {
        clearTimeout(timeout);
        console.warn(`[Sync] Error deleting ${dbName}:`, request.error);
        resolve(false);
      };
      
      request.onblocked = () => {
        clearTimeout(timeout);
        console.warn(`[Sync] Blocked deleting ${dbName}, forcing close...`);
        // If blocked, we can't do much - resolve anyway
        resolve(false);
      };
    } catch (error) {
      clearTimeout(timeout);
      console.warn(`[Sync] Exception deleting ${dbName}:`, error);
      resolve(false);
    }
  });
}

/**
 * Clear sync-related local storage and IndexedDB state.
 * By default this preserves auth and business context so the user stays signed in.
 */
export async function clearSyncStorage(
  options: ClearSyncStorageOptions = {}
): Promise<void> {
  const { preserveSession = true } = options;

  if (!canUseStorage()) {
    console.log("[Sync] No window/localStorage available, skipping cleanup");
    return;
  }

  console.log("[Sync] Starting storage cleanup...");

  // Clear session only when explicitly requested.
  if (!preserveSession) {
    console.log("[Sync] Clearing auth session...");
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(CURRENT_BUSINESS_ID_KEY);
    console.log("[Sync] Auth session cleared");
  } else {
    console.log("[Sync] Preserving auth session during sync cleanup");
  }

  // Clear IndexedDB databases
  console.log("[Sync] Clearing IndexedDB databases...");
  
  const results: Array<{ name: string; success: boolean }> = [];
  
  // Delete sequentially to avoid race conditions
  for (const dbName of KNOWN_DB_NAMES) {
    const success = await deleteDatabaseWithTimeout(dbName);
    results.push({ name: dbName, success });
  }

  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`[Sync] IndexedDB cleanup: ${succeeded} succeeded, ${failed} failed`);
  console.log("[Sync] Storage cleanup completed");
  
  // If all IndexedDB deletions failed, log a warning but don't throw
  // The page reload will clear any remaining connections
  if (failed === KNOWN_DB_NAMES.length) {
    console.warn("[Sync] Warning: Could not delete IndexedDB databases. Reload should fix any remaining open connections.");
  }
}
