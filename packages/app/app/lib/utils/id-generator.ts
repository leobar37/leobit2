/**
 * Centralized ID generation utility.
 * Ensures consistent ID format across the application.
 *
 * Backend expects: UUID v4 format (PostgreSQL uuid type)
 * Used for: orders, customers, sales, items, payments, etc.
 */
export function generateId(): string {
  // Always use crypto.randomUUID() for proper UUID v4
  // This is available in all modern browsers and Node.js 19+
  return crypto.randomUUID();
}

/**
 * Alias for generateId() - for backward compatibility with old code
 * @deprecated Use generateId() instead
 */
export function createSyncId(): string {
  return generateId();
}
