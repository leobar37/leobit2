/**
 * Engine Service Factories
 *
 * Defines EntityServiceDefinition factories for all 12 domain services,
 * bridging the library's SyncClientEngineContext to the app's service layer.
 *
 * During Wave 3 migration, these factories register services with the engine.
 * The old ServicesProvider still creates its own instances for backwards
 * compatibility. Wave 5 will consolidate to engine-only services.
 */

import type { EntityServiceDefinition, SyncClientEngineContext } from "@avileo/drizzle-sync/client";

// Domain services
import { CustomerService } from "~/lib/services/customer-service";
import { SaleService } from "~/lib/services/sale-service";
import { PaymentService } from "~/lib/services/payment-service";
import { PurchaseService } from "~/lib/services/purchase-service";
import { ProductService } from "~/lib/services/product-service";
import { InventoryService } from "~/lib/services/inventory-service";
import { TagService } from "~/lib/services/tag-service";
import { CustomerTagService } from "~/lib/services/customer-tag-service";
import { VisitaService } from "~/lib/services/visita-service";
import { CustomerGroupService } from "~/lib/services/customer-group-service";
import { DistribucionService } from "~/lib/services/distribucion-service";
import { SupplierService } from "~/lib/services/supplier-service";

// (App init helpers like initializeEventBuffer remain in ServicesProvider during migration)

// =============================================================================
// Service factories
// =============================================================================

function createCustomerService(ctx: SyncClientEngineContext): CustomerService {
  return new CustomerService(
    ctx.pg,
    ctx.db,
    ctx.syncService,
    ctx.businessId,
    ctx.businessUserId
  );
}

function createSaleService(ctx: SyncClientEngineContext): SaleService {
  return new SaleService(
    ctx.pg,
    ctx.db,
    ctx.syncService,
    ctx.businessId,
    ctx.businessUserId
  );
}

function createPaymentService(ctx: SyncClientEngineContext): PaymentService {
  return new PaymentService(
    ctx.pg,
    ctx.db,
    ctx.syncService,
    ctx.businessId,
    ctx.businessUserId
  );
}

function createPurchaseService(ctx: SyncClientEngineContext): PurchaseService {
  return new PurchaseService(
    ctx.pg,
    ctx.db,
    ctx.syncService,
    ctx.businessId,
    ctx.businessUserId
  );
}

function createProductService(ctx: SyncClientEngineContext): ProductService {
  return new ProductService(
    ctx.pg,
    ctx.db,
    ctx.syncService,
    ctx.businessId,
    ctx.businessUserId
  );
}

function createInventoryService(ctx: SyncClientEngineContext): InventoryService {
  return new InventoryService(
    ctx.pg,
    ctx.db,
    ctx.syncService,
    ctx.businessId,
    ctx.businessUserId
  );
}

function createTagService(ctx: SyncClientEngineContext): TagService {
  return new TagService(
    ctx.pg,
    ctx.db,
    ctx.syncService,
    ctx.businessId,
    ctx.businessUserId
  );
}

function createCustomerTagService(ctx: SyncClientEngineContext): CustomerTagService {
  return new CustomerTagService(
    ctx.pg,
    ctx.db,
    ctx.syncService,
    ctx.businessId,
    ctx.businessUserId
  );
}

function createVisitaService(ctx: SyncClientEngineContext): VisitaService {
  return new VisitaService(
    ctx.pg,
    ctx.db,
    ctx.syncService,
    ctx.businessId,
    ctx.businessUserId
  );
}

function createCustomerGroupService(ctx: SyncClientEngineContext): CustomerGroupService {
  return new CustomerGroupService(
    ctx.pg,
    ctx.db,
    ctx.syncService,
    ctx.businessId,
    ctx.businessUserId
  );
}

function createDistribucionService(ctx: SyncClientEngineContext): DistribucionService {
  return new DistribucionService(
    ctx.pg,
    ctx.db,
    ctx.syncService,
    ctx.businessId,
    ctx.businessUserId
  );
}

function createSupplierService(ctx: SyncClientEngineContext): SupplierService {
  return new SupplierService(
    ctx.pg,
    ctx.db,
    ctx.syncService,
    ctx.businessId,
    ctx.businessUserId
  );
}

// =============================================================================
// Exported definitions
// =============================================================================

/**
 * All domain service definitions for SyncClientEngine registration.
 */
export const engineServiceEntities: EntityServiceDefinition[] = [
  { name: "customers", entityType: "customers", factory: createCustomerService },
  { name: "sales", entityType: "sales", factory: createSaleService },
  { name: "payments", entityType: "abonos", factory: createPaymentService },
  { name: "purchases", entityType: "purchases", factory: createPurchaseService },
  { name: "products", entityType: "products", factory: createProductService },
  { name: "inventory", entityType: "inventory", factory: createInventoryService },
  { name: "tags", entityType: "tags", factory: createTagService },
  { name: "customerTags", entityType: "customer_tags", factory: createCustomerTagService },
  { name: "visitas", entityType: "visitas", factory: createVisitaService },
  { name: "customerGroups", entityType: "customer_groups", factory: createCustomerGroupService },
  { name: "distribuciones", entityType: "distribuciones", factory: createDistribucionService },
  { name: "suppliers", entityType: "suppliers", factory: createSupplierService },
];

// =============================================================================
// onServicesReady callback
// =============================================================================

/**
 * App-specific initialization that runs after the engine instantiates services.
 *
 * During Wave 3 migration, this handles draft cleanup and event buffer init.
 * Debug helpers remain in ServicesProvider until Wave 5 because they need
 * the app's SyncService type, which is not directly available in this callback.
 */
export async function onServicesReady(services: Map<string, unknown>): Promise<void> {
  // Clean up old draft purchases (> 30 days)
  const purchaseService = services.get("purchases") as PurchaseService | undefined;
  if (purchaseService) {
    try {
      const drafts = await purchaseService.findDrafts();
      const now = new Date();
      const maxAgeDays = 30;

      const oldDrafts = drafts.filter((draft) => {
        const updatedAt = new Date(draft.updatedAt);
        const daysDiff = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff > maxAgeDays;
      });

      if (oldDrafts.length > 0) {
        console.log(`[Engine onServicesReady] Cleaning up ${oldDrafts.length} old drafts`);
        for (const draft of oldDrafts) {
          try {
            await purchaseService.delete(draft.id);
          } catch (err) {
            console.error(`[Engine onServicesReady] Failed to delete draft ${draft.id}:`, err);
          }
        }
      }
    } catch (err) {
      console.error("[Engine onServicesReady] Draft cleanup error:", err);
    }
  }
}
