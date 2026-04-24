/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine;
}
