export function isOnline(): boolean {
  const online = typeof navigator !== "undefined" && navigator.onLine;
  console.log("[Offline] isOnline check:", online, "| navigator.onLine:", navigator.onLine);
  return online;
}
