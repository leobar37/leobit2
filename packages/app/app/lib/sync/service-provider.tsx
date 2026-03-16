import { createContext, useContext, useMemo, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { SyncService, type SyncStatus } from "../sync/sync-service";
import { PullService, type PullStatus } from "../sync/pull-service";
import { CustomerService } from "../services/customer-service";
import { SaleService } from "../services/sale-service";
import { PaymentService } from "../services/payment-service";
import { PurchaseService } from "../services/purchase-service";
import { ProductService } from "../services/product-service";
import { InventoryService } from "../services/inventory-service";
import { TagService } from "../services/tag-service";
import { CustomerTagService } from "../services/customer-tag-service";
import { VisitaService } from "../services/visita-service";
import { CustomerGroupService } from "../services/customer-group-service";
import type { ConflictStrategy } from "../sync/config";

export interface ServicesContextValue {
  pg: PGlite;
  db: ReturnType<typeof drizzle>;
  syncService: SyncService;
  pullService: PullService;
  customerService: CustomerService;
  saleService: SaleService;
  paymentService: PaymentService;
  purchaseService: PurchaseService;
  productService: ProductService;
  inventoryService: InventoryService;
  tagService: TagService;
  customerTagService: CustomerTagService;
  visitaService: VisitaService;
  customerGroupService: CustomerGroupService;
  businessId: string;
  authToken: string;
}

export interface SyncState {
  /** Pull sync status (server to client) */
  pull: PullStatus;
  /** Push sync status (client to server) */
  push: SyncStatus;
  /** Whether any sync is in progress */
  isSyncing: boolean;
  /** Whether the app is online */
  isOnline: boolean;
  /** Last successful sync time */
  lastSyncTime: Date | null;
}

const ServicesContext = createContext<ServicesContextValue | null>(null);
const SyncStateContext = createContext<SyncState | null>(null);

interface ServicesProviderProps {
  pg: PGlite;
  db: ReturnType<typeof drizzle>;
  businessId: string;
  authToken: string;
  children: ReactNode;
}

export function ServicesProvider({
  pg,
  db,
  businessId,
  authToken,
  children,
}: ServicesProviderProps) {
  // Use refs to ensure single instances
  const syncServiceRef = useRef<SyncService | null>(null);
  const pullServiceRef = useRef<PullService | null>(null);

  // Create services once per provider lifecycle
  const services = useMemo(() => {
    // Create SyncService if not exists
    if (!syncServiceRef.current) {
      syncServiceRef.current = new SyncService(pg, businessId, authToken);
    }

    // Create PullService if not exists
    if (!pullServiceRef.current) {
      pullServiceRef.current = new PullService(pg, db, businessId, authToken);
    }

    const syncService = syncServiceRef.current;
    const pullService = pullServiceRef.current;

    const customerService = new CustomerService(pg, db, syncService, businessId);
    const saleService = new SaleService(pg, db, syncService, businessId);
    const paymentService = new PaymentService(pg, db, syncService, businessId);
    const purchaseService = new PurchaseService(pg, db, syncService, businessId);
    const productService = new ProductService(pg, db, syncService, businessId);
    const inventoryService = new InventoryService(pg, db, syncService, businessId);
    const tagService = new TagService(pg, db, syncService, businessId);
    const customerTagService = new CustomerTagService(pg, db, syncService, businessId);
    const visitaService = new VisitaService(pg, db, syncService, businessId);
    const customerGroupService = new CustomerGroupService(pg, db, syncService, businessId);

    return {
      pg,
      db,
      syncService,
      pullService,
      customerService,
      saleService,
      paymentService,
      purchaseService,
      productService,
      inventoryService,
      tagService,
      customerTagService,
      visitaService,
      customerGroupService,
      businessId,
      authToken,
    };
  }, [pg, db, businessId, authToken]);

  // Start auto-sync when services are ready
  useEffect(() => {
    const syncService = syncServiceRef.current;
    const pullService = pullServiceRef.current;

    if (!syncService || !pullService) return;

    // Start auto-sync for outgoing operations (client to server)
    syncService.startAutoSync();
    console.log("[ServicesProvider] SyncService auto-sync started");

    // Start auto-pull for incoming changes (server to client)
    pullService.startAutoPull();
    console.log("[ServicesProvider] PullService auto-pull started");

    return () => {
      syncService.stopAutoSync();
      pullService.stopAutoPull();
      console.log("[ServicesProvider] Sync services stopped");
    };
  }, []);

  return (
    <ServicesContext.Provider value={services}>
      <SyncStateProvider>
        {children}
      </SyncStateProvider>
    </ServicesContext.Provider>
  );
}

/**
 * Provider that exposes sync state to consumers
 */
function SyncStateProvider({ children }: { children: ReactNode }) {
  const [pullStatus, setPullStatus] = useState<PullStatus>({
    isPulling: false,
    lastPullTime: null,
    lastError: null,
    consecutiveFailures: 0,
    cursor: null,
  });
  
  const [pushStatus, setPushStatus] = useState<SyncStatus>({
    pending: 0,
    processing: 0,
    syncing: 0,
    completed: 0,
    failed: 0,
    conflict: 0,
    deadLetter: 0,
    total: 0,
  });
  
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  // Get services from context
  const services = useContext(ServicesContext);

  // Update sync status periodically
  useEffect(() => {
    if (!services) return;

    const updateStatus = async () => {
      try {
        const pull = services.pullService.getStatus();
        setPullStatus(pull);

        const push = await services.syncService.getStatus();
        setPushStatus(push);
      } catch (error) {
        console.error("[SyncStateProvider] Failed to get sync status:", error);
      }
    };

    // Update immediately
    updateStatus();

    // Then update every 5 seconds
    const interval = setInterval(updateStatus, 5000);

    return () => clearInterval(interval);
  }, [services]);

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Compute derived state
  const syncState = useMemo<SyncState>(() => {
    const isSyncing = pullStatus.isPulling || pushStatus.processing > 0 || pushStatus.syncing > 0;
    
    // Use the most recent sync time
    const lastSyncTime = pullStatus.lastPullTime;

    return {
      pull: pullStatus,
      push: pushStatus,
      isSyncing,
      isOnline,
      lastSyncTime,
    };
  }, [pullStatus, pushStatus, isOnline]);

  return (
    <SyncStateContext.Provider value={syncState}>
      {children}
    </SyncStateContext.Provider>
  );
}

export function useServices(): ServicesContextValue {
  const context = useContext(ServicesContext);

  if (!context) {
    throw new Error("useServices must be used within a ServicesProvider");
  }

  return context;
}

export function useSyncService(): SyncService | null {
  const context = useContext(ServicesContext);
  if (!context) {
    return null;
  }
  return context.syncService;
}

export function usePullService(): PullService | null {
  const context = useContext(ServicesContext);
  if (!context) {
    return null;
  }
  return context.pullService;
}

/**
 * Hook to get current sync state
 */
export function useSyncState(): SyncState {
  const context = useContext(SyncStateContext);
  if (!context) {
    // Return default state if not in provider
    return {
      pull: {
        isPulling: false,
        lastPullTime: null,
        lastError: null,
        consecutiveFailures: 0,
        cursor: null,
      },
      push: {
        pending: 0,
        processing: 0,
        syncing: 0,
        completed: 0,
        failed: 0,
        conflict: 0,
        deadLetter: 0,
        total: 0,
      },
      isSyncing: false,
      isOnline: true,
      lastSyncTime: null,
    };
  }
  return context;
}

/**
 * Hook to check if there are pending operations to sync
 */
export function useHasPendingSync(): boolean {
  const { push } = useSyncState();
  return push.pending > 0 || push.processing > 0;
}

/**
 * Hook to check if there are failed sync operations
 */
export function useHasFailedSync(): boolean {
  const { push } = useSyncState();
  return push.failed > 0 || push.deadLetter > 0;
}

export function useCustomerService(): CustomerService {
  const { customerService } = useServices();
  return customerService;
}

export function useSaleService(): SaleService {
  const { saleService } = useServices();
  return saleService;
}

export function usePaymentService(): PaymentService {
  const { paymentService } = useServices();
  return paymentService;
}

export function usePurchaseService(): PurchaseService {
  const { purchaseService } = useServices();
  return purchaseService;
}

export function useProductService(): ProductService {
  const { productService } = useServices();
  return productService;
}

export function useInventoryService(): InventoryService {
  const { inventoryService } = useServices();
  return inventoryService;
}

export function useTagService(): TagService {
  const { tagService } = useServices();
  return tagService;
}

export function useCustomerTagService(): CustomerTagService {
  const { customerTagService } = useServices();
  return customerTagService;
}

export function useVisitaService(): VisitaService {
  const { visitaService } = useServices();
  return visitaService;
}

export function useCustomerGroupService(): CustomerGroupService {
  const { customerGroupService } = useServices();
  return customerGroupService;
}

export function usePGlite(): PGlite {
  const { pg } = useServices();
  return pg;
}

export function useDrizzle(): ReturnType<typeof drizzle> {
  const { db } = useServices();
  return db;
}

export function useBusinessId(): string {
  const { businessId } = useServices();
  return businessId;
}

export function useAuthToken(): string {
  const { authToken } = useServices();
  return authToken;
}

export type { ConflictStrategy };
