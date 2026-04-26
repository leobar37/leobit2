/**
 * Service Overrides
 * Registers custom application services that extend or replace generated services.
 * These overrides are passed to createAvileoSyncEngine in _protected.tsx.
 */

import type { AvileoSyncEngine, ServiceOverrides } from "~/lib/sync/generated/engine";

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

export type AvileoAppOverrides = Record<string, any>;

export const appServiceOverrides: ServiceOverrides<AvileoAppOverrides> = {
  customers: (engine) => new CustomerService(engine as any),
  products: (engine) => new ProductService(engine as any),
  sales: (engine) => new SaleService(engine as any),
  purchases: (engine) => new PurchaseService(engine as any),
  abonos: (engine) => new PaymentService(engine as any),
  distribuciones: (engine) => new DistribucionService(engine as any),
  suppliers: (engine) => new SupplierService(engine as any),
  tags: (engine) => new TagService(engine as any),
  visitas: (engine) => new VisitaService(engine as any),
  customer_groups: (engine) => new CustomerGroupService(engine as any),
  customer_tags: (engine) => new CustomerTagService(engine as any),
};
