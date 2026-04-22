/**
 * Hook to clear all sync storage and reload the page
 * Use this when Electric returns "must-refetch" or when sync needs to restart from scratch
 */
import { useMutation } from "@tanstack/react-query";
import { clearSyncStorage } from "~/lib/session-storage";
import { resetDatabase } from "@avileo/drizzle-sync/client";

export interface ClearSyncStorageInput {
  /** Whether to reload the page after clearing (default: true) */
  reload?: boolean;
  /** Delay in ms before reloading (default: 1000) */
  reloadDelay?: number;
  /** Whether to keep the current auth session (default: false - logs out user) */
  preserveSession?: boolean;
}

export function useClearSyncStorage() {
  return useMutation({
    mutationFn: async (input: ClearSyncStorageInput = {}) => {
      const {
        reload = true,
        reloadDelay = 1000,
        preserveSession = false,
      } = input;

      try {
        console.log("[ClearSync] Starting storage cleanup...");

        // Set flag to force reset and skip data export on next init
        console.log("[ClearSync] Setting force reset flag...");
        localStorage.setItem("AVILEO_FORCE_RESET", "true");

        // First close PGlite properly to avoid connection issues
        console.log("[ClearSync] Closing PGlite database...");
        await resetDatabase();
        console.log("[ClearSync] PGlite database closed");

        // Then clear session storage and IndexedDB
        console.log("[ClearSync] Clearing session storage and other IndexedDBs...");
        await clearSyncStorage({ preserveSession });
        console.log("[ClearSync] Session storage cleared");

        // Reload page to restart sync from offset 0_0
        if (reload && typeof window !== "undefined") {
          console.log(`[ClearSync] Waiting ${reloadDelay}ms before reload...`);

          // Wait for the delay before reloading to ensure all cleanup completes
          await new Promise<void>((resolve) => {
            setTimeout(() => {
              console.log("[ClearSync] Reloading page...");
              window.location.reload();
              resolve();
            }, reloadDelay);
          });
        }

        return { success: true };
      } catch (error) {
        console.error("[ClearSync] Error during cleanup:", error);
        throw error;
      }
    },
  });
}
