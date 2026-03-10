/**
 * Centralized ID generation utility.
 * Ensures consistent ID format across the application.
 * 
 * Backend expects: UUID v4 format (PostgreSQL uuid type)
 * Used for: orders, customers, sales, items, payments, etc.
 */
export function generateId(): string {
  // Use crypto.randomUUID() for proper UUID v4
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Alias for generateId() - for backward compatibility with old code
 * @deprecated Use generateId() instead
 */
export function createSyncId(): string {
  return generateId();
}
