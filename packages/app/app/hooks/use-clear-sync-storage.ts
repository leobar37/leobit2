/**
 * Hook to clear all sync storage and reload the page
 * Use this when Electric returns "must-refetch" or when sync needs to restart from scratch
 */
import { useMutation } from "@tanstack/react-query";
import { clearSyncStorage } from "~/lib/session-storage";
import { resetDatabase } from "~/engine";

export interface ClearSyncStorageInput {
  /** Whether to reload the page after clearing (default: true) */
  reload?: boolean;
  /** Delay in ms before reloading (default: 300) */
  reloadDelay?: number;
  /** Whether to keep the current auth session (default: false - logs out user) */
  preserveSession?: boolean;
}

export function useClearSyncStorage() {
  return useMutation({
    mutationFn: async (input: ClearSyncStorageInput = {}) => {
      const {
        reload = true,
        reloadDelay = 300,
        preserveSession = false,
      } = input;

      try {
        // First close PGlite properly to avoid connection issues
        await resetDatabase();

        // Then clear session storage and IndexedDB
        await clearSyncStorage({ preserveSession });

        // Reload page to restart sync from offset 0_0
        if (reload && typeof window !== "undefined") {
          setTimeout(() => {
            window.location.reload();
          }, reloadDelay);
        }

        return { success: true };
      } catch (error) {
        throw error;
      }
    },
  });
}
