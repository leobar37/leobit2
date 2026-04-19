import { createContext, useContext, useMemo, useEffect, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { SyncCoordinator } from "./coordinator";
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
import { DistribucionService } from "../services/distribucion-service";
import { SupplierService } from "../services/supplier-service";
import type { ConflictStrategy } from "../sync/config";
import { addServiceDebugHelpers } from "~/lib/debug";
import { initializeEventBuffer } from "./sync-event-buffer";
import { SyncProvider, useSyncState as useLibrarySyncState } from "@avileo/drizzle-sync/react";
import { createAvileoSyncRuntime } from "./react-runtime";

export interface ServicesContextValue {
  pg: PGlite;
  db: ReturnType<typeof drizzle>;
  coordinator: SyncCoordinator;
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
  distribucionService: DistribucionService;
  supplierService: SupplierService;
  businessId: string;
  businessUserId: string;
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
  /** Whether sync is stuck and needs manual intervention */
  isStuck: boolean;
}

const ServicesContext = createContext<ServicesContextValue | null>(null);
const SyncStateContext = createContext<SyncState | null>(null);

interface ServicesProviderProps {
  pg: PGlite;
  db: ReturnType<typeof drizzle>;
  businessId: string;
  businessUserId: string;
  authToken: string;
  children: ReactNode;
}

export function ServicesProvider({
  pg,
  db,
  businessId,
  businessUserId,
  authToken,
  children,
}: ServicesProviderProps) {
  // Use refs to ensure single instances
  const syncServiceRef = useRef<SyncService | null>(null);
  const pullServiceRef = useRef<PullService | null>(null);
  const coordinatorRef = useRef<SyncCoordinator | null>(null);

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

    if (!coordinatorRef.current) {
      coordinatorRef.current = new SyncCoordinator(syncService, pullService);
    }

    const coordinator = coordinatorRef.current;

    const customerService = new CustomerService(pg, db, syncService, businessId, businessUserId);
    const saleService = new SaleService(pg, db, syncService, businessId, businessUserId);
    const paymentService = new PaymentService(pg, db, syncService, businessId, businessUserId);
    const purchaseService = new PurchaseService(pg, db, syncService, businessId, businessUserId);
    const productService = new ProductService(pg, db, syncService, businessId, businessUserId);
    const inventoryService = new InventoryService(pg, db, syncService, businessId, businessUserId);
    const tagService = new TagService(pg, db, syncService, businessId, businessUserId);
    const customerTagService = new CustomerTagService(pg, db, syncService, businessId, businessUserId);
    const visitaService = new VisitaService(pg, db, syncService, businessId, businessUserId);
    const customerGroupService = new CustomerGroupService(pg, db, syncService, businessId, businessUserId);
    const distribucionService = new DistribucionService(pg, db, syncService, businessId, businessUserId);
    const supplierService = new SupplierService(pg, db, syncService, businessId, businessUserId);

    return {
      pg,
      db,
      coordinator,
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
      distribucionService,
      supplierService,
      businessId,
      businessUserId,
      authToken,
    };
  }, [pg, db, businessId, businessUserId, authToken]);

  // Start auto-sync when services are ready
  useEffect(() => {
    const syncService = syncServiceRef.current;
    const pullService = pullServiceRef.current;
    const coordinator = coordinatorRef.current;

    if (!syncService || !pullService || !coordinator) return;

    let eventBufferCleanup: (() => void) | null = null;

    // Initialize services before starting
    const initAndStart = async () => {
      const perfStart = performance.now();
      try {
        const pushInitStart = performance.now();
        await syncService.initialize();
        const pushInitMs = performance.now() - pushInitStart;

        const pullInitStart = performance.now();
        await pullService.initialize();
        const pullInitMs = performance.now() - pullInitStart;

        const coordinatorStart = performance.now();
        coordinator.start();
        const coordinatorMs = performance.now() - coordinatorStart;

        eventBufferCleanup = initializeEventBuffer();

        console.log("[Perf][ServicesProvider] startup", {
          pushInitMs: Number(pushInitMs.toFixed(2)),
          pullInitMs: Number(pullInitMs.toFixed(2)),
          coordinatorMs: Number(coordinatorMs.toFixed(2)),
          totalMs: Number((performance.now() - perfStart).toFixed(2)),
        });
      } catch (error) {
        console.error("[ServicesProvider] Failed to initialize sync services:", error);
      }
    };
    
    initAndStart();

    // Cleanup old drafts on startup
    const cleanupDrafts = async () => {
      try {
        const purchaseService = services.purchaseService;
        const drafts = await purchaseService.findDrafts();
        const now = new Date();
        const maxAgeDays = 30;

        const oldDrafts = drafts.filter(draft => {
          const updatedAt = new Date(draft.updated_at);
          const daysDiff = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
          return daysDiff > maxAgeDays;
        });

        if (oldDrafts.length > 0) {
          console.log(`[ServicesProvider] Cleaning up ${oldDrafts.length} old drafts`);
          for (const draft of oldDrafts) {
            try {
              await purchaseService.delete(draft.id);
            } catch (err) {
              console.error(`[ServicesProvider] Failed to delete draft ${draft.id}:`, err);
            }
          }
        }
      } catch (err) {
        console.error("[ServicesProvider] Draft cleanup error:", err);
      }
    };
    cleanupDrafts();

    // Register debug utilities for browser console access
    addServiceDebugHelpers({
      purchaseService: services.purchaseService,
      supplierService: services.supplierService,
      syncService: services.syncService,
      productService: services.productService,
      customerService: services.customerService,
      saleService: services.saleService,
    });

    return () => {
      coordinator.stop();
      eventBufferCleanup?.();
      console.log("[ServicesProvider] SyncCoordinator stopped");
    };
  }, [services]);

  return (
    <ServicesContext.Provider value={services}>
      <LibrarySyncStateProvider>
        {children}
      </LibrarySyncStateProvider>
    </ServicesContext.Provider>
  );
}

/**
 * Provider that wraps the library's SyncProvider and adapts to app's sync state
 */
function LibrarySyncStateProvider({ children }: { children: ReactNode }) {
  const services = useContext(ServicesContext);
  const queryClient = useQueryClient();

  // Create runtime factory that memoizes the runtime
  const runtimeFactory = useMemo(() => {
    if (!services) return null;
    return () => createAvileoSyncRuntime(
      services.syncService,
      services.pullService,
      queryClient
    );
  }, [services, queryClient]);

  if (!runtimeFactory) {
    return <>{children}</>;
  }

  return (
    <SyncProvider runtime={runtimeFactory}>
      <SyncStateAdapter>
        {children}
      </SyncStateAdapter>
    </SyncProvider>
  );
}

/**
 * Adapter that bridges library state to app's SyncState interface
 */
function SyncStateAdapter({ children }: { children: ReactNode }) {
  const libraryState = useLibrarySyncState();
  const services = useContext(ServicesContext);

  // Convert library state to app's SyncState format
  // Uses rich push/pull state when available from the runtime
  const syncState = useMemo<SyncState>(() => {
    // Use rich pull state from library if available, otherwise fall back to service
    const pullStatus: PullStatus = libraryState.pull ?? services?.pullService?.getStatus() ?? {
      isPulling: libraryState.isSyncing,
      lastPullTime: libraryState.lastSyncTime,
      lastError: null,
      consecutiveFailures: 0,
      cursor: null,
      isStuck: libraryState.isStuck,
      consecutiveStalePulls: 0,
    };

    // Use rich push state from library if available, otherwise approximate from counts
    const pushStatus: SyncStatus = libraryState.push ? {
      pending: libraryState.push.pendingCount,
      processing: libraryState.push.processingCount,
      syncing: libraryState.push.syncingCount,
      completed: libraryState.push.completedCount,
      failed: libraryState.push.failedCount,
      conflict: libraryState.push.conflictCount,
      deadLetter: libraryState.push.deadLetterCount,
      total: libraryState.push.totalCount,
    } : {
      pending: libraryState.pendingCount,
      processing: 0,
      syncing: libraryState.isSyncing ? 1 : 0,
      completed: 0,
      failed: libraryState.failedCount,
      conflict: libraryState.conflictCount,
      deadLetter: libraryState.deadLetterCount,
      total: libraryState.pendingCount + libraryState.failedCount + libraryState.conflictCount + libraryState.deadLetterCount,
    };

    return {
      pull: pullStatus,
      push: pushStatus,
      isSyncing: libraryState.isSyncing,
      isOnline: libraryState.isOnline,
      lastSyncTime: libraryState.lastSyncTime,
      isStuck: libraryState.isStuck,
    };
  }, [libraryState, services]);

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

export function useSyncCoordinator(): SyncCoordinator | null {
  const context = useContext(ServicesContext);
  if (!context) {
    return null;
  }
  return context.coordinator;
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
        isStuck: false,
        consecutiveStalePulls: 0,
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
      isStuck: false,
    };
  }
  return context;
}

/**
 * Hook to get sync status flags derived from app's rich SyncState
 */
export function useSyncStatus(): {
  isSyncing: boolean;
  isOnline: boolean;
  isStuck: boolean;
  hasPending: boolean;
  hasFailed: boolean;
  hasConflicts: boolean;
  hasDeadLetter: boolean;
} {
  const state = useSyncState();
  return useMemo(
    () => ({
      isSyncing: state.isSyncing,
      isOnline: state.isOnline,
      isStuck: state.isStuck,
      hasPending: state.push.pending > 0 || state.push.processing > 0,
      hasFailed: state.push.failed > 0 || state.push.deadLetter > 0,
      hasConflicts: state.push.conflict > 0,
      hasDeadLetter: state.push.deadLetter > 0,
    }),
    [state]
  );
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

/**
 * Hook to check if sync is stuck
 */
export function useIsSyncStuck(): boolean {
  const { isStuck } = useSyncState();
  return isStuck;
}

/**
 * Hook to force reset sync when stuck
 */
export function useForceResetSync(): () => Promise<void> {
  const services = useServices();
  return async () => {
    await services.coordinator.forceResetSync();
  };
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

export function useDistribucionService(): DistribucionService {
  const { distribucionService } = useServices();
  return distribucionService;
}

export function useSupplierService(): SupplierService {
  const { supplierService } = useServices();
  return supplierService;
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

export function useBusinessUserId(): string {
  const { businessUserId } = useServices();
  return businessUserId;
}

export function useAuthToken(): string {
  const { authToken } = useServices();
  return authToken;
}

export type { ConflictStrategy };
