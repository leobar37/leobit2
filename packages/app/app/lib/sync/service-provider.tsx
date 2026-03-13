import React, { createContext, useContext, useMemo, type ReactNode } from "react";
import type { PGlite } from "@electric-sql/pglite";
import { SyncService } from "../sync/sync-service";
import { CustomerService } from "../services/customer-service";
import { SaleService } from "../services/sale-service";
import { PaymentService } from "../services/payment-service";
import { PurchaseService } from "../services/purchase-service";
import { ProductService } from "../services/product-service";
import { TagService } from "../services/tag-service";
import { CustomerTagService } from "../services/customer-tag-service";
import { SupplierService } from "../services/supplier-service";
import type { ConflictStrategy } from "../sync/config";

export interface ServicesContextValue {
  pg: PGlite;
  syncService: SyncService;
  customerService: CustomerService;
  saleService: SaleService;
  paymentService: PaymentService;
  purchaseService: PurchaseService;
  productService: ProductService;
  tagService: TagService;
  customerTagService: CustomerTagService;
  supplierService: SupplierService;
  businessId: string;
  authToken: string;
}

const ServicesContext = createContext<ServicesContextValue | null>(null);

interface ServicesProviderProps {
  pg: PGlite;
  businessId: string;
  authToken: string;
  children: ReactNode;
}

export function ServicesProvider({
  pg,
  businessId,
  authToken,
  children,
}: ServicesProviderProps) {
  const services = useMemo(() => {
    const syncService = new SyncService(pg, businessId, authToken);
    const customerService = new CustomerService(pg, syncService, businessId);
    const saleService = new SaleService(pg, syncService, businessId);
    const paymentService = new PaymentService(pg, syncService, businessId);
    const purchaseService = new PurchaseService(pg, syncService, businessId);
    const productService = new ProductService(pg, syncService, businessId);
    const tagService = new TagService(pg, syncService, businessId);
    const customerTagService = new CustomerTagService(pg, syncService, businessId);
    const supplierService = new SupplierService(pg, syncService, businessId);

    return {
      pg,
      syncService,
      customerService,
      saleService,
      paymentService,
      purchaseService,
      productService,
      tagService,
      customerTagService,
      supplierService,
      businessId,
      authToken,
    };
  }, [pg, businessId, authToken]);

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

export function useSyncService(): SyncService {
  const { syncService } = useServices();
  return syncService;
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

export function useTagService(): TagService {
  const { tagService } = useServices();
  return tagService;
}

export function useCustomerTagService(): CustomerTagService {
  const { customerTagService } = useServices();
  return customerTagService;
}

export function useSupplierService(): SupplierService {
  const { supplierService } = useServices();
  return supplierService;
}

export function usePGlite(): PGlite {
  const { pg } = useServices();
  return pg;
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
