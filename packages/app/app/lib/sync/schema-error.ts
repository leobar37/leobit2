/**
 * Schema Error Detection
 *
 * Utilities for detecting database schema-related errors
 * that indicate the need for a database reset.
 */

/**
 * Check if an error is related to database schema issues
 * These errors typically indicate schema mismatch between
 * local IndexedDB and expected schema, requiring a reset.
 */
export function isSchemaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();
  return (
    (lowerMessage.includes("column") &&
      (lowerMessage.includes("does not exist") || lowerMessage.includes("no existe"))) ||
    (lowerMessage.includes("relation") && lowerMessage.includes("does not exist")) ||
    lowerMessage.includes("schema") ||
    lowerMessage.includes("syntax error")
  );
}
