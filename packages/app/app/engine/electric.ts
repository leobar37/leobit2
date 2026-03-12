/**
 * Electric Sync Configuration
 * Handles sync shapes from PostgreSQL to PGlite
 * 
 * NOTE: ElectricSQL sync with PGlite requires the sync extension.
 * This is a placeholder implementation that will work once ElectricSQL
 * is properly configured on the backend.
 */
import { PGlite } from "@electric-sql/pglite";

const ELECTRIC_URL = import.meta.env.VITE_ELECTRIC_URL || "http://localhost:3000";

interface SyncConfig {
  pg: PGlite;
  businessId: string;
  token: string;
}

/**
 * Start syncing all shapes for a business
 * Returns cleanup function to stop sync
 * 
 * TODO: Implement actual ElectricSQL sync once backend is configured
 */
export async function startSync({
  pg,
  businessId,
  token,
}: SyncConfig): Promise<() => void> {
  // For now, return a no-op cleanup function
  // ElectricSQL sync will be implemented when backend is ready
  console.log("[Electric] Sync started for business:", businessId);
  
  return () => {
    console.log("[Electric] Sync stopped");
  };
}

/**
 * Stop all syncs
 */
export function stopSync(cleanup: (() => void) | null): void {
  if (cleanup) {
    cleanup();
  }
}
