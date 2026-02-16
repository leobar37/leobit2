import { useEffect, useState } from "react";
import { syncClient, type SyncEngineState } from "~/lib/sync/client";
import type { SyncOperation } from "~/lib/db/schema";

const initialState: SyncEngineState = {
  status: "idle",
  pendingCount: 0,
  lastSyncAt: null,
  isSyncing: false,
  isConnected: true,
  lastError: null,
};

export function useSyncEngine(options?: { autoStart?: boolean }) {
  const autoStart = options?.autoStart ?? true;
  const [state, setState] = useState<SyncEngineState>(
    syncClient.getState() ?? initialState
  );

  useEffect(() => {
    const unsubscribe = syncClient.subscribe(setState);

    if (autoStart) {
      syncClient.start();
    }

    return () => {
      unsubscribe();
      if (autoStart) {
        syncClient.stop();
      }
    };
  }, [autoStart]);

  return {
    ...state,
    enqueue: (operation: Omit<SyncOperation, "id" | "timestamp" | "attempts">) =>
      syncClient.enqueueOperation(operation),
    forceSync: () => syncClient.forceSync(),
  };
}
