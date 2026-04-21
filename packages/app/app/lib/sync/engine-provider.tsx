/**
 * SyncEngineProvider
 *
 * Replaces the 4 nested providers (EngineProvider → SyncProvider →
 * ServicesProviderWrapper → ServicesProvider) with a single provider
 * that consumes SyncClientEngine from @avileo/drizzle-sync/client.
 *
 * Maintains backwards compatibility with existing hooks during migration.
 */

import {
  type ReactNode,
} from "react";
import type {
  SyncClientEngine,
  SyncClientServicePort,
} from "@avileo/drizzle-sync/client";
import {
  SyncProvider,
  useEngineService as useLibraryEngineService,
  useSyncEngine as useLibrarySyncEngine,
  useSyncEngineReady as useLibrarySyncEngineReady,
  useSyncOperations as useLibrarySyncOperations,
  useSyncState as useLibrarySyncState,
  useSyncStatus as useLibrarySyncStatus,
} from "@avileo/drizzle-sync/react";
import type { SyncState } from "./sync-state";
import { createAvileoSyncRuntime } from "./react-runtime";
import { useQueryClient } from "@tanstack/react-query";
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

// =============================================================================
// Provider
// =============================================================================

interface SyncEngineProviderProps {
  engine: SyncClientEngine;
  children: ReactNode;
  /** Whether to auto-start the engine's coordinator on mount. Default true. */
  startOnMount?: boolean;
}

export function SyncEngineProvider({
  engine,
  children,
  startOnMount = true,
}: SyncEngineProviderProps) {
  const queryClient = useQueryClient();
  const runtimeFactory = () => createAvileoSyncRuntime(engine, queryClient, startOnMount);

  return (
    <SyncProvider runtime={runtimeFactory} engine={engine as unknown as Parameters<typeof SyncProvider>[0]["engine"]}>
      {children}
    </SyncProvider>
  );
}

// =============================================================================
// Hooks
// =============================================================================

export function useSyncEngine(): ReturnType<typeof useLibrarySyncEngine> {
  return useLibrarySyncEngine();
}

export function useSyncEngineReady(): ReturnType<typeof useLibrarySyncEngineReady> {
  return useLibrarySyncEngineReady();
}

/**
 * Backwards-compatible sync state hook.
 * Returns the same shape as the legacy useSyncState from service-provider.tsx.
 */
export function useSyncState(): SyncState {
  const state = useLibrarySyncState();
  return {
    pull: state.pull ?? {
      isPulling: false,
      lastPullTime: null,
      lastError: null,
      consecutiveFailures: 0,
      cursor: null,
      isStuck: false,
      consecutiveStalePulls: 0,
    },
    push: state.push
      ? {
          pending: state.push.pendingCount,
          processing: state.push.processingCount,
          syncing: state.push.syncingCount,
          completed: state.push.completedCount,
          failed: state.push.failedCount,
          conflict: state.push.conflictCount,
          deadLetter: state.push.deadLetterCount,
          total: state.push.totalCount,
        }
      : {
          pending: state.pendingCount,
          processing: 0,
          syncing: state.isSyncing ? 1 : 0,
          completed: 0,
          failed: state.failedCount,
          conflict: state.conflictCount,
          deadLetter: state.deadLetterCount,
          total: state.pendingCount + state.failedCount + state.conflictCount + state.deadLetterCount,
        },
    isSyncing: state.isSyncing,
    isOnline: state.isOnline,
    lastSyncTime: state.lastSyncTime,
    isStuck: state.isStuck,
  };
}

export function useSyncStatus() {
  return useLibrarySyncStatus();
}

export function useSyncService(): SyncClientServicePort {
  return useLibrarySyncOperations();
}

export function usePullService() {
  return useSyncEngine().getPullService();
}

export function useSyncCoordinator() {
  return useSyncEngine().getCoordinator();
}

export function useCustomerService(): CustomerService {
  return useLibraryEngineService<CustomerService>("customers");
}

export function useSaleService(): SaleService {
  return useLibraryEngineService<SaleService>("sales");
}

export function usePaymentService(): PaymentService {
  return useLibraryEngineService<PaymentService>("payments");
}

export function usePurchaseService(): PurchaseService {
  return useLibraryEngineService<PurchaseService>("purchases");
}

export function useProductService(): ProductService {
  return useLibraryEngineService<ProductService>("products");
}

export function useInventoryService(): InventoryService {
  return useLibraryEngineService<InventoryService>("inventory");
}

export function useTagService(): TagService {
  return useLibraryEngineService<TagService>("tags");
}

export function useCustomerTagService(): CustomerTagService {
  return useLibraryEngineService<CustomerTagService>("customerTags");
}

export function useVisitaService(): VisitaService {
  return useLibraryEngineService<VisitaService>("visitas");
}

export function useCustomerGroupService(): CustomerGroupService {
  return useLibraryEngineService<CustomerGroupService>("customerGroups");
}

export function useDistribucionService(): DistribucionService {
  return useLibraryEngineService<DistribucionService>("distribuciones");
}

export function useSupplierService(): SupplierService {
  return useLibraryEngineService<SupplierService>("suppliers");
}

export function useHasPendingSync(): boolean {
  const { push } = useSyncState();
  return push.pending > 0 || push.processing > 0;
}

export function useHasFailedSync(): boolean {
  const { push } = useSyncState();
  return push.failed > 0 || push.deadLetter > 0;
}

export function useIsSyncStuck(): boolean {
  const { isStuck } = useSyncState();
  return isStuck;
}

export function useForceResetSync(): () => Promise<void> {
  const coordinator = useSyncCoordinator();
  return async () => {
    await coordinator?.forceResetSync();
  };
}

export function usePGlite() {
  return useSyncEngine().getService("pg");
}

export function useDrizzle() {
  return useSyncEngine().getService("db");
}

export function useBusinessId(): string {
  return useSyncEngine()["config"]?.businessId ?? "";
}

export function useBusinessUserId(): string {
  return useSyncEngine()["config"]?.businessUserId ?? "";
}

export function useAuthToken(): string {
  return useSyncEngine()["config"]?.authToken ?? "";
}

export type { ConflictStrategy };
