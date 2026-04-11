import { getDatabase } from "~/engine";
import { getStoredAuthToken, getStoredBusinessId } from "~/lib/session-storage";

export async function runManualSync(options?: { actualOnline?: boolean }) {
  const actualOnline = options?.actualOnline ?? (typeof navigator !== "undefined" ? navigator.onLine : true);

  if (!actualOnline) {
    throw new Error("Manual sync is unavailable while offline.");
  }

  const { SyncService } = await import("~/lib/sync/sync-service");
  const { pg } = getDatabase();

  const businessId = getStoredBusinessId() || "";
  const token = getStoredAuthToken() || "";

  const syncService = new SyncService(pg, businessId, token);
  await syncService["processPending"]();
}
