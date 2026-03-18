/**
 * PullSyncWrapper Component
 * Wraps children and enables periodic pull sync from server
 */

import { usePullSync } from "~/hooks/use-pull-sync";
import { useEngine } from "~/engine";
import { Loader2 } from "lucide-react";
import { useServices } from "~/lib/sync/service-provider";

interface PullSyncWrapperProps {
  children: React.ReactNode;
}

export function PullSyncWrapper({ children }: PullSyncWrapperProps) {
  const { pg, isInitialized } = useEngine();
  const services = useServices();

  const { db, businessId, authToken } = services;

  // Enable pull sync for sales, customers, and other key entities
  const { isPulling, lastPullResult, forcePull } = usePullSync(
    pg,
    db,
    businessId,
    authToken,
    {
      enabled: isInitialized && !!pg && !!db,
      watchedEntities: ["sales", "customers", "products", "abonos", "distribuciones"],
    }
  );

  return <>{children}</>;
}
