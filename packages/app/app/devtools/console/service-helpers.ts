/**
 * Service-level debug helpers for window.avileoDebug
 * These use typed service instances for business-level diagnostics
 */

import type { PurchaseService } from "~/lib/services/purchase-service";
import type { SupplierService } from "~/lib/services/supplier-service";
import type { SyncService } from "~/lib/sync/sync-service";
import type { ProductService } from "~/lib/services/product-service";
import type { CustomerService } from "~/lib/services/customer-service";
import type { SaleService } from "~/lib/services/sale-service";
import {
  getEventBuffer,
  getEventsByType,
  clearEventBuffer,
  type TimelineEvent,
} from "~/lib/sync/sync-event-buffer";

export interface SyncDebugHelpers {
  timeline: (maxEvents?: number) => TimelineEvent[];
  metrics: () => Promise<SyncMetrics>;
  analyzeConflicts: () => Promise<ConflictAnalysis>;
  findStuckOps: (minAgeMinutes?: number) => Promise<StuckOperation[]>;
  retryAllFailed: () => Promise<void>;
  exportReport: () => Promise<string>;
  clearTimeline: () => void;
}

export interface SyncMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  recentActivity: number;
  conflictCount: number;
  errorCount: number;
  lastEventTime: Date | null;
}

export interface ConflictAnalysis {
  totalConflicts: number;
  byEntityType: Record<string, number>;
  byErrorPattern: Record<string, number>;
  recentConflicts: TimelineEvent[];
}

export interface StuckOperation {
  id: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  ageMinutes: number;
  sync_attempts: number;
}

export interface ServiceDebugHelpers {
  purchases: () => Promise<void>;
  drafts: () => Promise<void>;
  suppliers: () => Promise<void>;
  syncQueue: () => Promise<void>;
  queryCache: () => Promise<void>;
  checkDuplicates: () => Promise<void>;
  products: () => Promise<void>;
  customers: () => Promise<void>;
  sales: () => Promise<void>;
  clearIndexedDB: () => Promise<void>;
  cleanupDuplicateProducts: () => Promise<void>;
  sync: SyncDebugHelpers;
  help: () => void;
}

export interface ServiceDebugDeps {
  purchaseService: PurchaseService;
  supplierService: SupplierService;
  syncService: SyncService;
  productService?: ProductService | null;
  customerService?: CustomerService | null;
  saleService?: SaleService | null;
}

/**
 * Creates service-level debug helpers bound to the given service instances.
 * Returns a pure object — does NOT assign to window.
 */
export function createServiceDebugHelpers(deps: ServiceDebugDeps): ServiceDebugHelpers {
  const { purchaseService, supplierService, syncService, productService, customerService, saleService } = deps;

  return {
    async purchases() {
      if (!purchaseService) {
        console.error("❌ PurchaseService not initialized");
        return;
      }
      console.log("📦 Purchases (non-drafts):");
      const data = await purchaseService.findByBusiness();
      console.table(data.map(p => ({
        id: p.id.substring(0, 8) + "...",
        status: p.status,
        supplierId: p.supplierId?.substring(0, 8) + "..." || null,
        totalAmount: p.totalAmount,
        syncStatus: p.syncStatus,
        created: new Date(p.createdAt).toLocaleString(),
      })));
    },

    async drafts() {
      if (!purchaseService) {
        console.error("❌ PurchaseService not initialized");
        return;
      }
      console.log("📝 Draft purchases:");
      const data = await purchaseService.findDrafts();
      console.table(data.map(p => ({
        id: p.id.substring(0, 8) + "...",
        status: p.status,
        supplierId: p.supplierId?.substring(0, 8) + "..." || null,
        totalAmount: p.totalAmount,
        syncStatus: p.syncStatus,
        created: new Date(p.createdAt).toLocaleString(),
      })));
    },

    async suppliers() {
      if (!supplierService) {
        console.error("❌ SupplierService not initialized");
        return;
      }
      console.log("🏢 Suppliers:");
      const data = await supplierService.findByBusiness();
      console.table(data.map((s: any) => ({
        id: s.id.substring(0, 8) + "...",
        name: s.name,
        type: s.type,
        is_active: s.is_active,
        sync_status: s.sync_status || "N/A",
      })));
    },

    async syncQueue() {
      if (!syncService) {
        console.error("❌ SyncService not initialized");
        return;
      }
      console.log("🔄 Sync Queue Status:");
      const status = await syncService.getStatus();
      console.table([status]);
      console.log("\nPending operations breakdown:");
      console.log(`  - pending: ${status.pending}`);
      console.log(`  - processing: ${status.processing}`);
      console.log(`  - failed: ${status.failed}`);
      console.log(`  - conflict: ${status.conflict}`);
      console.log(`  - deadLetter: ${status.deadLetter}`);
    },

    async queryCache() {
      console.log("💉 React Query Cache - Use React DevTools for full inspection");
      console.log("   Install React DevTools browser extension for better debugging");
    },

    help() {
      console.log(`
🔧 Avileo Debug Commands:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
avileoDebug.purchases()         → List non-draft purchases
avileoDebug.drafts()            → List draft purchases
avileoDebug.suppliers()         → List suppliers
avileoDebug.syncQueue()         → Show sync queue status
avileoDebug.queryCache()        → React Query cache info
avileoDebug.checkDuplicates()   → Check for duplicates in IndexedDB
avileoDebug.products()          → List products with duplicate check
avileoDebug.customers()         → List customers with duplicate check
avileoDebug.sales()             → List sales with duplicate check
avileoDebug.cleanupDuplicateProducts() → Remove duplicate products from IndexedDB
avileoDebug.clearIndexedDB()    → Clear local IndexedDB (hard reset)

Sync Helpers (avileoDebug.sync.*):
━━━━━━━━━━━━━━━━━━━━━━━━━━━
avileoDebug.sync.timeline()       → View recent sync events
avileoDebug.sync.metrics()        → Calculate sync metrics
avileoDebug.sync.analyzeConflicts() → Analyze conflicts by type
avileoDebug.sync.findStuckOps()   → Find stuck operations
avileoDebug.sync.retryAllFailed() → Retry all failed operations
avileoDebug.sync.exportReport()   → Export diagnostic report
avileoDebug.sync.clearTimeline() → Clear event timeline

avileoDebug.help()              → Show this help
━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    },

    async checkDuplicates() {
      console.log("\n=== CHECKING FOR DUPLICATES IN INDEXEDDB ===\n");

      if (!productService && !customerService && !saleService) {
        console.error("❌ No services registered! Make sure you're logged in and on a protected route.");
        return;
      }

      const results: { table: string; total: number; unique: number; duplicates: number }[] = [];

      if (productService) {
        console.log("📦 Checking products...");
        const products = await productService.findByBusiness();
        console.log(`   Found ${products.length} products`);
        const ids = products.map(p => p.id);
        const uniqueIds = new Set(ids).size;
        results.push({
          table: "products",
          total: products.length,
          unique: uniqueIds,
          duplicates: products.length - uniqueIds,
        });

        if (products.length !== uniqueIds) {
          console.log("\n⚠️  PRODUCTS: DUPLICATES DETECTED!");
          const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
          const duplicates = products.filter(p => duplicateIds.includes(p.id));
          console.table(duplicates.map(p => ({
            id: p.id.substring(0, 8) + "...",
            name: p.name,
            basePrice: p.basePrice,
            type: p.type,
          })));
        } else {
          console.log("   ✅ No duplicates in products");
        }
      } else {
        console.log("⚠️  ProductService not available");
      }

      if (customerService) {
        console.log("\n👥 Checking customers...");
        const customers = await customerService.findByBusiness({});
        console.log(`   Found ${customers.length} customers`);
        const ids = customers.map(c => c.id);
        const uniqueIds = new Set(ids).size;
        results.push({
          table: "customers",
          total: customers.length,
          unique: uniqueIds,
          duplicates: customers.length - uniqueIds,
        });

        if (customers.length !== uniqueIds) {
          console.log("   ⚠️  DUPLICATES DETECTED!");
        } else {
          console.log("   ✅ No duplicates in customers");
        }
      } else {
        console.log("⚠️  CustomerService not available");
      }

      if (saleService) {
        console.log("\n💰 Checking sales...");
        const sales = await saleService.findByBusiness();
        console.log(`   Found ${sales.length} sales`);
        const ids = sales.map(s => s.id);
        const uniqueIds = new Set(ids).size;
        results.push({
          table: "sales",
          total: sales.length,
          unique: uniqueIds,
          duplicates: sales.length - uniqueIds,
        });

        if (sales.length !== uniqueIds) {
          console.log("   ⚠️  DUPLICATES DETECTED!");
        } else {
          console.log("   ✅ No duplicates in sales");
        }
      } else {
        console.log("⚠️  SaleService not available");
      }

      console.log("\n📊 DUPLICATE SUMMARY:");
      console.log("Table".padEnd(20) + "Total".padEnd(10) + "Unique".padEnd(10) + "Duplicates");
      console.log("-".repeat(50));

      let hasDuplicates = false;
      for (const result of results) {
        const status = result.duplicates > 0 ? "⚠️ " : "✅ ";
        console.log(
          status +
          result.table.padEnd(18) +
          String(result.total).padEnd(10) +
          String(result.unique).padEnd(10) +
          String(result.duplicates)
        );
        if (result.duplicates > 0) hasDuplicates = true;
      }

      if (hasDuplicates) {
        console.log("\n❌ DUPLICATES FOUND! Run avileoDebug.clearIndexedDB() to reset.");
      } else {
        console.log("\n✅ No duplicates found in IndexedDB.");
      }
    },

    async products() {
      console.log("\n📦 Fetching products...");
      if (!productService) {
        console.error("❌ ProductService not initialized");
        console.log("   Make sure you're logged in and on a protected route.");
        return;
      }
      console.log("✅ ProductService available, fetching...");
      const data = await productService.findByBusiness();
      console.log(`   Total: ${data.length}`);
      console.log(`   Unique IDs: ${new Set(data.map(p => p.id)).size}`);

      const ids = data.map(p => p.id);
      const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);

      if (duplicateIds.length > 0) {
        console.warn(`   ⚠️  ${duplicateIds.length} DUPLICATE IDs!`);
      }

      console.table(data.map(p => ({
        id: p.id.substring(0, 8) + "...",
        name: p.name,
        type: p.type,
        basePrice: p.basePrice,
        unit: p.unit,
        isActive: p.isActive,
      })));
    },

    async customers() {
      if (!customerService) {
        console.error("❌ CustomerService not initialized");
        return;
      }
      console.log("👥 Customers:");
      const data = await customerService.findByBusiness({});
      console.log(`   Total: ${data.length}`);
      console.table(data.slice(0, 20).map(c => ({
        id: c.id.substring(0, 8) + "...",
        name: c.name,
        phone: c.phone || "-",
        dni: c.dni || "-",
      })));
      if (data.length > 20) {
        console.log(`   ... and ${data.length - 20} more`);
      }
    },

    async sales() {
      if (!saleService) {
        console.error("❌ SaleService not initialized");
        return;
      }
      console.log("💰 Sales:");
      const data = await saleService.findByBusiness();
      console.log(`   Total: ${data.length}`);
      console.table(data.slice(0, 10).map(s => ({
        id: s.id.substring(0, 8) + "...",
        customer: s.customer?.name || "-",
        total: s.totalAmount,
        type: s.saleType,
        sync: s.syncStatus,
      })));
      if (data.length > 10) {
        console.log(`   ... and ${data.length - 10} more`);
      }
    },

    async clearIndexedDB() {
      console.log("\n⚠️  WARNING: This will DELETE all local data!");
      console.log("   You will need to re-sync from the server.");
      console.log("\n   Type 'YES' to confirm, or refresh the page to cancel.");

      const confirmed = prompt("Type YES to confirm clearing IndexedDB:");

      if (confirmed !== "YES") {
        console.log("❌ Cancelled - IndexedDB was NOT cleared.");
        return;
      }

      console.log("\n🗑️  Clearing IndexedDB...");

      try {
        const databases = await indexedDB.databases();

        for (const db of databases) {
          if (db.name) {
            const dbName = db.name;
            console.log(`   Deleting: ${dbName}`);
            await new Promise<void>((resolve, reject) => {
              const request = indexedDB.deleteDatabase(dbName);
              request.onsuccess = () => resolve();
              request.onerror = () => reject(request.error);
            });
          }
        }

        console.log("\n✅ IndexedDB cleared successfully!");
        console.log("   Refresh the page to re-sync from server.");
        console.log("   Run: location.reload()");
      } catch (error) {
        console.error("\n❌ Error clearing IndexedDB:", error);
      }
    },

    async cleanupDuplicateProducts() {
      if (!productService) {
        console.error("❌ ProductService not initialized");
        return;
      }

      console.log("\n=== CLEANING UP DUPLICATE PRODUCTS ===\n");

      const products = await productService.findByBusiness();
      console.log(`Found ${products.length} total products`);

      const nameMap = new Map<string, typeof products>();

      for (const product of products) {
        const existing = nameMap.get(product.name) || [];
        existing.push(product);
        nameMap.set(product.name, existing);
      }

      const duplicates = Array.from(nameMap.entries()).filter(([_, prods]) => prods.length > 1);

      if (duplicates.length === 0) {
        console.log("✅ No duplicate products found.");
        return;
      }

      console.log(`⚠️  Found ${duplicates.length} products with duplicates:\n`);

      const toDelete: string[] = [];

      for (const [name, prods] of duplicates) {
        console.log(`\n📦 "${name}" appears ${prods.length} times:`);

        prods.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const keep = prods[0];
        const deleteThese = prods.slice(1);

        console.log(`   ✅ Keeping: ${keep.id.substring(0, 8)}... (created: ${keep.createdAt})`);

        for (const prod of deleteThese) {
          console.log(`   ❌ Will delete: ${prod.id.substring(0, 8)}... (created: ${prod.createdAt})`);
          toDelete.push(prod.id);
        }
      }

      if (toDelete.length === 0) {
        console.log("\n✅ Nothing to delete.");
        return;
      }

      console.log(`\n\n⚠️  Will delete ${toDelete.length} duplicate products.`);
      console.log("   Type 'DELETE' to confirm:");

      const confirmed = prompt("Type DELETE to confirm cleanup:");

      if (confirmed !== "DELETE") {
        console.log("❌ Cancelled - No products were deleted.");
        return;
      }

      console.log("\n🗑️  Deleting duplicates...");

      const pg = (productService as any).pg;
      if (!pg) {
        console.error("❌ Cannot access database");
        return;
      }

      for (const id of toDelete) {
        try {
          await pg.query(`DELETE FROM products WHERE id = $1`, [id]);
          console.log(`   ✅ Deleted: ${id.substring(0, 8)}...`);
        } catch (error) {
          console.error(`   ❌ Failed to delete ${id.substring(0, 8)}...:`, error);
        }
      }

      console.log("\n✅ Cleanup complete!");
      console.log("   Refresh the page to see changes.");
      console.log("   Run: location.reload()");
    },

    sync: {
      timeline(maxEvents = 50) {
        const events = getEventBuffer().slice(-maxEvents);
        console.log(`📊 Timeline (last ${events.length} events):`);
        if (events.length === 0) {
          console.log("   No events recorded yet.");
          return events;
        }
        console.table(
          events.map((e) => ({
            time: e.timestamp.toLocaleTimeString(),
            type: e.type,
            message: e.message.substring(0, 50),
          }))
        );
        return events;
      },

      async metrics() {
        const events = getEventBuffer();
        const now = Date.now();
        const oneHourAgo = now - 60 * 60 * 1000;

        const eventsByType: Record<string, number> = {};
        let conflictCount = 0;
        let errorCount = 0;
        let recentActivity = 0;

        for (const event of events) {
          eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
          if (event.type === "operation:conflict" || event.type === "pull:error") {
            conflictCount++;
          }
          if (event.type === "operation:failed") {
            errorCount++;
          }
          if (event.timestamp.getTime() > oneHourAgo) {
            recentActivity++;
          }
        }

        const metrics: SyncMetrics = {
          totalEvents: events.length,
          eventsByType,
          recentActivity,
          conflictCount,
          errorCount,
          lastEventTime: events.length > 0 ? events[events.length - 1].timestamp : null,
        };

        console.log("📈 Sync Metrics:");
        console.table([
          ["Total Events", metrics.totalEvents],
          ["Recent Activity (1h)", metrics.recentActivity],
          ["Conflicts", metrics.conflictCount],
          ["Errors", metrics.errorCount],
          ["Last Event", metrics.lastEventTime?.toLocaleTimeString() || "N/A"],
        ]);
        console.log("Events by type:");
        console.table(Object.entries(eventsByType).map(([type, count]) => ({ type, count })));

        return metrics;
      },

      async analyzeConflicts() {
        const conflictEvents = getEventsByType("operation:conflict");
        const byEntityType: Record<string, number> = {};
        const byErrorPattern: Record<string, number> = {};
        const recentConflicts = conflictEvents.slice(-20);

        for (const event of conflictEvents) {
          const data = event.data as { entityType?: string; error?: string } | undefined;
          if (data?.entityType) {
            byEntityType[data.entityType] = (byEntityType[data.entityType] || 0) + 1;
          }
          if (data?.error) {
            const pattern = data.error.substring(0, 50);
            byErrorPattern[pattern] = (byErrorPattern[pattern] || 0) + 1;
          }
        }

        const analysis: ConflictAnalysis = {
          totalConflicts: conflictEvents.length,
          byEntityType,
          byErrorPattern,
          recentConflicts,
        };

        console.log("⚠️ Conflict Analysis:");
        console.log(`Total conflicts: ${analysis.totalConflicts}`);
        console.log("By entity type:");
        console.table(
          Object.entries(byEntityType).map(([entity, count]) => ({ entity, count }))
        );
        console.log("By error pattern:");
        console.table(
          Object.entries(byErrorPattern)
            .slice(0, 10)
            .map(([pattern, count]) => ({ pattern, count }))
        );

        return analysis;
      },

      async findStuckOps(minAgeMinutes = 60) {
        if (!syncService) {
          console.error("❌ SyncService not initialized");
          return [];
        }

        const status = await syncService.getStatus();
        if (status.pending === 0 && status.processing === 0) {
          console.log("✅ No stuck operations found.");
          return [];
        }

        console.log(`⚠️ Found ${status.pending + status.processing} pending/processing operations.`);
        console.log("   Use the DevTools drawer to inspect individual operations.");

        return [];
      },

      async retryAllFailed() {
        const confirmed = prompt(
          "⚠️ This will retry all failed operations. Use the DevTools drawer to manually retry. Continue? Type 'RETRY' to confirm:"
        );
        if (confirmed !== "RETRY") {
          console.log("❌ Cancelled.");
          return;
        }

        if (!syncService) {
          console.error("❌ SyncService not initialized");
          return;
        }

        try {
          console.log("✅ Retry logic not directly available via API. Use DevTools drawer.");
        } catch (error) {
          console.error("❌ Failed to retry operations:", error);
        }
      },

      async exportReport() {
        const events = getEventBuffer();
        const syncStatus = syncService ? await syncService.getStatus() : null;

        const report = {
          timestamp: new Date().toISOString(),
          syncStatus,
          events: events.map((e) => ({
            ...e,
            timestamp: e.timestamp.toISOString(),
          })),
          metrics: await this.metrics(),
        };

        const json = JSON.stringify(report, null, 2);
        await navigator.clipboard.writeText(json);
        console.log(`✅ Report copied to clipboard (${json.length} bytes)`);
        return json;
      },

      clearTimeline() {
        clearEventBuffer();
        console.log("🗑️ Timeline cleared.");
      },
    },
  };
}

/**
 * Registers service-level debug helpers by merging onto the existing window.avileoDebug object.
 * Must be called AFTER initDevTools() has been called (so window.avileoDebug already exists).
 *
 * @deprecated Use createServiceDebugHelpers from ~/devtools/console directly for new code.
 */
export function addServiceDebugHelpers(services: {
  purchaseService: PurchaseService;
  supplierService: SupplierService;
  syncService: SyncService;
  productService?: ProductService;
  customerService?: CustomerService;
  saleService?: SaleService;
}): void {
  if (typeof window === "undefined" || !window.avileoDebug) {
    // Not yet initialized — engine helpers haven't been set up yet.
    // This should not happen if ServicesProvider mounts after EngineProvider.
    return;
  }

  const serviceHelpers = createServiceDebugHelpers({
    purchaseService: services.purchaseService,
    supplierService: services.supplierService,
    syncService: services.syncService,
    productService: services.productService ?? null,
    customerService: services.customerService ?? null,
    saleService: services.saleService ?? null,
  });

  // Merge service helpers onto existing window.avileoDebug (do NOT overwrite)
  window.avileoDebug = { ...window.avileoDebug, ...serviceHelpers };
}
