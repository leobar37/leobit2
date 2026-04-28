/**
 * Service Overrides
 * Registers custom application services that extend or replace generated services.
 * These overrides are passed to createAvileoSyncEngine in _protected.tsx.
 */

import type { AvileoGeneratedServices, ServiceOverrides } from "~/lib/sync/generated/engine";

import { CustomerService } from "~/lib/services/customer-service";
import { ProductService } from "~/lib/services/product-service";
import { SaleService } from "~/lib/services/sale-service";
import { PurchaseService } from "~/lib/services/purchase-service";
import { PaymentService } from "~/lib/services/payment-service";
import { DistribucionService } from "~/lib/services/distribucion-service";
import { SupplierService } from "~/lib/services/supplier-service";
import { TagService } from "~/lib/services/tag-service";
import { VisitaService } from "~/lib/services/visita-service";
import { CustomerGroupService } from "~/lib/services/customer-group-service";
import { CustomerTagService } from "~/lib/services/customer-tag-service";
import { InventoryService } from "~/lib/services/inventory-service";

type AvileoAppOverrideKey =
  | "customers"
  | "products"
  | "sales"
  | "purchases"
  | "abonos"
  | "distribuciones"
  | "suppliers"
  | "tags"
  | "visitas"
  | "customer_groups"
  | "customer_tags";

export type AvileoAppOverrides = Pick<AvileoGeneratedServices, AvileoAppOverrideKey>;

export interface AvileoAppServices extends Omit<AvileoGeneratedServices, AvileoAppOverrideKey> {
  customers: CustomerService;
  products: ProductService;
  sales: SaleService;
  purchases: PurchaseService;
  abonos: PaymentService;
  distribuciones: DistribucionService;
  suppliers: SupplierService;
  tags: TagService;
  visitas: VisitaService;
  customer_groups: CustomerGroupService;
  customer_tags: CustomerTagService;
}

export const appServiceOverrides: ServiceOverrides<AvileoAppOverrides> = {
  customers: (engine) => new CustomerService(engine),
  products: (engine) => new ProductService(engine),
  sales: (engine) => new SaleService(engine) as unknown as AvileoGeneratedServices["sales"],
  purchases: (engine) => new PurchaseService(engine) as unknown as AvileoGeneratedServices["purchases"],
  abonos: (engine) => new PaymentService(engine) as unknown as AvileoGeneratedServices["abonos"],
  distribuciones: (engine) => new DistribucionService(engine) as unknown as AvileoGeneratedServices["distribuciones"],
  suppliers: (engine) => new SupplierService(engine) as unknown as AvileoGeneratedServices["suppliers"],
  tags: (engine) => new TagService(engine),
  visitas: (engine) => new VisitaService(engine),
  customer_groups: (engine) => new CustomerGroupService(engine),
  customer_tags: (engine) => new CustomerTagService(engine),
};
