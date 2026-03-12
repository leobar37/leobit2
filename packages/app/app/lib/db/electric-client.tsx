import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { PGlite } from "@electric-sql/pglite";
import { initAutoSync, forceSyncNow } from "./sync-manager";

interface ElectricContextType {
  isConnected: boolean;
  isSyncing: boolean;
  isReady: boolean;
  error: Error | null;
  pg: PGlite | null;
  forceSync: () => void;
}

const ElectricContext = createContext<ElectricContextType>({
  isConnected: false,
  isSyncing: false,
  isReady: false,
  error: null,
  pg: null,
  forceSync: () => {},
});

// Singleton PGlite promise to prevent concurrent initialization race conditions.
// Storing the Promise (not the resolved instance) ensures that if multiple callers
// invoke getPGlite() before the first create() resolves, they all await the same
// initialization — avoiding the "Response already consumed" WebAssembly error.
let pgPromise: Promise<PGlite> | null = null;

async function getPGlite(): Promise<PGlite> {
  if (!pgPromise) {
    pgPromise = PGlite.create({
      dataDir: "idb://avileo-pg",
    });
  }
  return pgPromise;
}

export function ElectricProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pg, setPg] = useState<PGlite | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initElectric() {
      try {
        const pg = await getPGlite();
        
        if (!mounted) return;
        
        setPg(pg);
        setIsReady(true);
        setIsConnected(true);

        initAutoSync();
        
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsReady(false);
        }
      }
    }

    initElectric();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ElectricContext.Provider value={{ isConnected, isSyncing, isReady, error, pg, forceSync: forceSyncNow }}>
      {children}
    </ElectricContext.Provider>
  );
}

export function useElectric() {
  return useContext(ElectricContext);
}

// Export singleton for direct access
export { getPGlite };
