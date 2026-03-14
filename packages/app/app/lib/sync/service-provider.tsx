import React, { createContext, useContext, useMemo, type ReactNode } from "react";
import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { SyncService } from "../sync/sync-service";
import { CustomerService } from "../services/customer-service";
import { SaleService } from "../services/sale-service";
import { PaymentService } from "../services/payment-service";
import { PurchaseService } from "../services/purchase-service";
import { ProductService } from "../services/product-service";
import { InventoryService } from "../services/inventory-service";
import { TagService } from "../services/tag-service";
import { CustomerTagService } from "../services/customer-tag-service";
import type { ConflictStrategy } from "../sync/config";

export interface ServicesContextValue {
  pg: PGlite;
  db: ReturnType<typeof drizzle>;
  syncService: SyncService;
  customerService: CustomerService;
  saleService: SaleService;
  paymentService: PaymentService;
  purchaseService: PurchaseService;
  productService: ProductService;
  inventoryService: InventoryService;
  tagService: TagService;
  customerTagService: CustomerTagService;
  businessId: string;
  authToken: string;
}

const ServicesContext = createContext<ServicesContextValue | null>(null);

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
  const services = useMemo(() => {
    const syncService = new SyncService(pg, businessId, authToken);
    const customerService = new CustomerService(pg, db, syncService, businessId);
    const saleService = new SaleService(pg, db, syncService, businessId);
    const paymentService = new PaymentService(pg, db, syncService, businessId);
    const purchaseService = new PurchaseService(pg, db, syncService, businessId);
    const productService = new ProductService(pg, db, syncService, businessId);
    const inventoryService = new InventoryService(pg, db, syncService, businessId);
    const tagService = new TagService(pg, db, syncService, businessId);
    const customerTagService = new CustomerTagService(pg, db, syncService, businessId);

    return {
      pg,
      db,
      syncService,
      customerService,
      saleService,
      paymentService,
      purchaseService,
      productService,
      inventoryService,
      tagService,
      customerTagService,
      businessId,
      authToken,
    };
  }, [pg, db, businessId, authToken]);

  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
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
export type { SyncStatus, SyncOperationRecord } from "../sync/sync-service";
