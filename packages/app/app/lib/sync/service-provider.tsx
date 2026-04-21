import { createContext, useContext, useMemo, useEffect, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import type { SyncClientEngine } from "@avileo/drizzle-sync/client";
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
import type { ConflictStrategy } from "@avileo/drizzle-sync/shared";
import { addServiceDebugHelpers } from "~/lib/debug";
import { initializeEventBuffer } from "./sync-event-buffer";
import { SyncProvider, useSyncState as useLibrarySyncState } from "@avileo/drizzle-sync/react";
import { createAvileoSyncRuntime } from "./react-runtime";

export interface ServicesContextValue {
  pg: PGlite;
  db: ReturnType<typeof drizzle>;
  coordinator: unknown;
  syncService: unknown;
  pullService: unknown;
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
  /** Engine instance — when provided, services are read from the engine instead of created locally */
  engine?: SyncClientEngine;
}

export function ServicesProvider({
  pg,
  db,
  businessId,
  businessUserId,
  authToken,
  children,
  engine,
}: ServicesProviderProps) {
  // Legacy refs for fallback mode (when engine is not provided)
  const syncServiceRef = useRef<SyncService | null>(null);
  const pullServiceRef = useRef<PullService | null>(null);
  const coordinatorRef = useRef<SyncCoordinator | null>(null);

  const services = useMemo(() => {
    if (engine) {
      // Engine mode: read services from the engine
      const syncService = engine.getSyncService()!;
      const pullService = engine.getPullService()!;
      const coordinator = engine.getCoordinator()!;

      return {
        pg,
        db,
        coordinator,
        syncService,
        pullService,
        customerService: engine.getService<CustomerService>("customers"),
        saleService: engine.getService<SaleService>("sales"),
        paymentService: engine.getService<PaymentService>("payments"),
        purchaseService: engine.getService<PurchaseService>("purchases"),
        productService: engine.getService<ProductService>("products"),
        inventoryService: engine.getService<InventoryService>("inventory"),
        tagService: engine.getService<TagService>("tags"),
        customerTagService: engine.getService<CustomerTagService>("customerTags"),
        visitaService: engine.getService<VisitaService>("visitas"),
        customerGroupService: engine.getService<CustomerGroupService>("customerGroups"),
        distribucionService: engine.getService<DistribucionService>("distribuciones"),
        supplierService: engine.getService<SupplierService>("suppliers"),
        businessId,
        businessUserId,
        authToken,
      };
    }

    // Legacy mode: create services locally
    if (!syncServiceRef.current) {
      syncServiceRef.current = new SyncService(pg, businessId, authToken);
    }
    if (!pullServiceRef.current) {
      pullServiceRef.current = new PullService(pg, db, businessId, authToken);
    }
    const syncService = syncServiceRef.current;
    const pullService = pullServiceRef.current;
    if (!coordinatorRef.current) {
      coordinatorRef.current = new SyncCoordinator(syncService, pullService);
    }
    const coordinator = coordinatorRef.current;

    return {
      pg,
      db,
      coordinator,
      syncService,
      pullService,
      customerService: new CustomerService(pg, db, syncService, businessId, businessUserId),
      saleService: new SaleService(pg, db, syncService, businessId, businessUserId),
      paymentService: new PaymentService(pg, db, syncService, businessId, businessUserId),
      purchaseService: new PurchaseService(pg, db, syncService, businessId, businessUserId),
      productService: new ProductService(pg, db, syncService, businessId, businessUserId),
      inventoryService: new InventoryService(pg, db, syncService, businessId, businessUserId),
      tagService: new TagService(pg, db, syncService, businessId, businessUserId),
      customerTagService: new CustomerTagService(pg, db, syncService, businessId, businessUserId),
      visitaService: new VisitaService(pg, db, syncService, businessId, businessUserId),
      customerGroupService: new CustomerGroupService(pg, db, syncService, businessId, businessUserId),
      distribucionService: new DistribucionService(pg, db, syncService, businessId, businessUserId),
      supplierService: new SupplierService(pg, db, syncService, businessId, businessUserId),
      businessId,
      businessUserId,
      authToken,
    };
  }, [pg, db, businessId, businessUserId, authToken, engine]);

  // Start auto-sync when services are ready (legacy mode only)
  useEffect(() => {
    if (engine) return; // Engine handles its own lifecycle

    const syncService = syncServiceRef.current;
    const pullService = pullServiceRef.current;
    const coordinator = coordinatorRef.current;

    if (!syncService || !pullService || !coordinator) return;

    let eventBufferCleanup: (() => void) | null = null;

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

    addServiceDebugHelpers({
      purchaseService: services.purchaseService,
      supplierService: services.supplierService,
      syncService: services.syncService as SyncService,
      productService: services.productService,
      customerService: services.customerService,
      saleService: services.saleService,
    });

    return () => {
      (coordinator as SyncCoordinator).stop();
      eventBufferCleanup?.();
      console.log("[ServicesProvider] SyncCoordinator stopped");
    };
  }, [services, engine]);

  return (
    <ServicesContext.Provider value={services}>
      <LibrarySyncStateProvider>
        {children}
      </LibrarySyncStateProvider>
    </ServicesContext.Provider>
  );
}

/**
 * Provider that wraps the library's SyncProvider and adapts to app's sync state.
 * Only uses the library SyncProvider when in engine mode (syncService is from SyncClientEngine).
 * In legacy mode, provides default sync state directly.
 */
function LibrarySyncStateProvider({ children }: { children: ReactNode }) {
  const services = useContext(ServicesContext);
  const queryClient = useQueryClient();

  // Detect engine mode: syncService has getSyncOperations (engine) vs processPending (legacy)
  const isEngineMode = services && "getSyncOperations" in (services.syncService as object);

  // Create runtime factory for engine mode
  const runtimeFactory = useMemo(() => {
    if (!services || !isEngineMode) return null;
    // In engine mode, syncService is actually the engine's sync service
    // We need to get the engine from somewhere - for now, engine mode
    // should be handled by SyncEngineProvider, not ServicesProvider
    return null;
  }, [services, isEngineMode, queryClient]);

  if (!runtimeFactory) {
    // Legacy mode: provide default sync state directly without library provider
    return (
      <SyncStateContext.Provider value={null}>
        {children}
      </SyncStateContext.Provider>
    );
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
    const pullStatus: PullStatus = libraryState.pull ?? (services?.pullService as PullService | undefined)?.getStatus() ?? {
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
  return context.syncService as SyncService;
}

export function useSyncCoordinator(): SyncCoordinator | null {
  const context = useContext(ServicesContext);
  if (!context) {
    return null;
  }
  return context.coordinator as SyncCoordinator;
}

export function usePullService(): PullService | null {
  const context = useContext(ServicesContext);
  if (!context) {
    return null;
  }
  return context.pullService as PullService;
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
    await (services.coordinator as SyncCoordinator).forceResetSync();
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
