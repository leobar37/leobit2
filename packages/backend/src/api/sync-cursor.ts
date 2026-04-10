export interface ParseCursorResult {
  valid: boolean;
  date?: Date;
  operationId?: string;
  error?: string;
  isLegacy?: boolean;
}

export function parseCursor(cursor: string): ParseCursorResult {
  if (!cursor || typeof cursor !== "string") {
    return { valid: false, error: "Cursor is required" };
  }

  // New format: timestamp_operationId
  // Split at first underscore because operationId may contain underscores.
  const delimiterIndex = cursor.indexOf("_");
  if (delimiterIndex > 0) {
    const timestampPart = cursor.slice(0, delimiterIndex);
    const operationId = cursor.slice(delimiterIndex + 1);

    const date = new Date(timestampPart);
    if (isNaN(date.getTime())) {
      return { valid: false, error: "Invalid timestamp in cursor" };
    }

    return { valid: true, date, operationId, isLegacy: false };
  }

  // Legacy format: timestamp only
  const date = new Date(cursor);
  if (isNaN(date.getTime())) {
    return {
      valid: false,
      error: "Invalid cursor format. Expected ISO 8601 timestamp.",
    };
  }

  return { valid: true, date, isLegacy: true };
}
