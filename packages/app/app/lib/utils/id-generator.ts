/**
 * Centralized ID generation utility.
 * Ensures consistent ID format across the application.
 *
 * Backend expects: UUID v4 format (PostgreSQL uuid type)
 * Used for: orders, customers, sales, items, payments, etc.
 */
export function generateId(): string {
  return crypto.randomUUID();
}
