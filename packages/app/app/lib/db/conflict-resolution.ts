/**
 * Conflict resolution strategies for offline-first sync
 */

export type ConflictStrategy = "last-write-wins" | "server-wins" | "client-wins" | "manual";

interface Conflict {
  entity: string;
  entityId: string;
  localVersion: unknown;
  serverVersion: unknown;
  localTimestamp: number;
  serverTimestamp: number;
}

/**
 * Resolve conflict using last-write-wins strategy
 */
export function resolveLastWriteWins(conflict: Conflict): "local" | "server" {
  return conflict.localTimestamp > conflict.serverTimestamp ? "local" : "server";
}

/**
 * Resolve conflict - server always wins
 */
export function resolveServerWins(): "server" {
  return "server";
}

/**
 * Resolve conflict - client always wins
 */
export function resolveClientWins(): "local" {
  return "local";
}

/**
 * Default conflict resolver using last-write-wins
 */
export function resolveConflict(
  conflict: Conflict,
  strategy: ConflictStrategy = "last-write-wins"
): "local" | "server" | "manual" {
  switch (strategy) {
    case "last-write-wins":
      return resolveLastWriteWins(conflict);
    case "server-wins":
      return resolveServerWins();
    case "client-wins":
      return resolveClientWins();
    case "manual":
      return "manual";
    default:
      return resolveLastWriteWins(conflict);
  }
}

/**
 * Detect if there's a conflict between local and server versions
 */
export function detectConflict(
  local: { updatedAt: number | Date; [key: string]: unknown },
  server: { updatedAt: number | Date; [key: string]: unknown }
): boolean {
  const localTime = local.updatedAt instanceof Date ? local.updatedAt.getTime() : local.updatedAt;
  const serverTime = server.updatedAt instanceof Date ? server.updatedAt.getTime() : server.updatedAt;

  // If timestamps are different, there's a potential conflict
  return localTime !== serverTime;
}

/**
 * Merge local and server versions (simple merge for non-conflicting fields)
 */
export function mergeVersions<T extends Record<string, unknown>>(
  local: T,
  server: T,
  conflictFields: (keyof T)[]
): T {
  const merged = { ...server };

  // For non-conflict fields, use local values
  for (const key of Object.keys(local)) {
    if (!conflictFields.includes(key)) {
      (merged as Record<string, unknown>)[key] = local[key];
    }
  }

  return merged;
}
