import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";

interface ElectricContextType {
  isConnected: boolean;
  isSyncing: boolean;
}

const ElectricContext = createContext<ElectricContextType>({
  isConnected: false,
  isSyncing: false,
});

export function ElectricProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setIsConnected(true);
  }, []);

  return (
    <ElectricContext.Provider value={{ isConnected, isSyncing }}>
      {children}
    </ElectricContext.Provider>
  );
}

export function useElectric() {
  return useContext(ElectricContext);
}
