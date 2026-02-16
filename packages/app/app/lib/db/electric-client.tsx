import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import { useSyncEngine } from "~/hooks/use-sync-engine";
import type { SyncOperation } from "~/lib/db/schema";

interface ElectricContextType {
  isConnected: boolean;
  isSyncing: boolean;
  enqueue: (operation: Omit<SyncOperation, "id" | "timestamp" | "attempts">) => Promise<string>;
  forceSync: () => Promise<void>;
}

const ElectricContext = createContext<ElectricContextType>({
  isConnected: false,
  isSyncing: false,
  enqueue: async () => "",
  forceSync: async () => undefined,
});

export function ElectricProvider({ children }: { children: ReactNode }) {
  const { isConnected, isSyncing, enqueue, forceSync } = useSyncEngine({
    autoStart: false,
  });

  return (
    <ElectricContext.Provider value={{ isConnected, isSyncing, enqueue, forceSync }}>
      {children}
    </ElectricContext.Provider>
  );
}

export function useElectric() {
  return useContext(ElectricContext);
}
