/**
 * Hook to clear all sync storage and reload the page
 * Use this when Electric returns "must-refetch" or when sync needs to restart from scratch
 */
import { useMutation } from "@tanstack/react-query";
import { clearSyncStorage } from "~/lib/session-storage";

export interface ClearSyncStorageInput {
  /** Whether to reload the page after clearing (default: true) */
  reload?: boolean;
  /** Delay in ms before reloading (default: 300) */
  reloadDelay?: number;
  /** Whether to keep the current auth session (default: true) */
  preserveSession?: boolean;
}

export function useClearSyncStorage() {
  return useMutation({
    mutationFn: async (input: ClearSyncStorageInput = {}) => {
      const {
        reload = true,
        reloadDelay = 300,
        preserveSession = true,
      } = input;

      console.log("[useClearSyncStorage] Starting storage cleanup...");

      try {
        await clearSyncStorage({ preserveSession });
        console.log("[useClearSyncStorage] Storage cleared successfully");

        // Reload page to restart sync from offset 0_0
        if (reload && typeof window !== "undefined") {
          console.log(`[useClearSyncStorage] Reloading in ${reloadDelay}ms...`);
          setTimeout(() => {
            window.location.reload();
          }, reloadDelay);
        }

        return { success: true };
      } catch (error) {
        console.error("[useClearSyncStorage] Error:", error);
        throw error;
      }
    },
  });
}
