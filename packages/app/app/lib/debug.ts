/**
 * Avileo Debug Utilities
 * Exposes useful debugging methods on window.avileoDebug
 *
 * Usage in browser console:
 *   avileoDebug.purchases()      // List all purchases
 *   avileoDebug.drafts()         // List all drafts
 *   avileoDebug.suppliers()      // List suppliers
 *   avileoDebug.syncQueue()      // Show pending sync operations
 *   avileoDebug.queryCache()     // Show React Query cache state
 */

import type { PurchaseService } from "~/lib/services/purchase-service";
import type { SupplierService } from "~/lib/services/supplier-service";
import type { SyncService } from "~/lib/sync/sync-service";

interface AvileoDebug {
  purchases: () => Promise<void>;
  drafts: () => Promise<void>;
  suppliers: () => Promise<void>;
  syncQueue: () => Promise<void>;
  queryCache: () => Promise<void>;
  help: () => void;
}

declare global {
  interface Window {
    avileoDebug?: AvileoDebug;
  }
}

let purchaseService: PurchaseService | null = null;
let supplierService: SupplierService | null = null;
let syncService: SyncService | null = null;

export function registerDebugServices(services: {
  purchaseService: PurchaseService;
  supplierService: SupplierService;
  syncService: SyncService;
}) {
  purchaseService = services.purchaseService;
  supplierService = services.supplierService;
  syncService = services.syncService;

  if (typeof window !== "undefined") {
    window.avileoDebug = {
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
          supplier_id: p.supplier_id?.substring(0, 8) + "..." || null,
          total_amount: p.total_amount,
          sync_status: p.sync_status,
          created: new Date(p.created_at).toLocaleString(),
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
          supplier_id: p.supplier_id?.substring(0, 8) + "..." || null,
          total_amount: p.total_amount,
          sync_status: p.sync_status,
          created: new Date(p.created_at).toLocaleString(),
        })));
      },

      async suppliers() {
        if (!supplierService) {
          console.error("❌ SupplierService not initialized");
          return;
        }
        console.log("🏢 Suppliers:");
        const data = await supplierService.findAll();
        console.table(data.map(s => ({
          id: s.id.substring(0, 8) + "...",
          name: s.name,
          type: s.type,
          is_active: s.is_active,
          sync_status: (s as any).sync_status || "N/A",
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
avileoDebug.purchases()   → List non-draft purchases
avileoDebug.drafts()      → List draft purchases
avileoDebug.suppliers()   → List suppliers
avileoDebug.syncQueue()   → Show sync queue status
avileoDebug.queryCache()  → React Query cache info
avileoDebug.help()        → Show this help
━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `);
      },
    };

    console.log("🔧 Avileo Debug ready! Run avileoDebug.help() for commands");
  }
}
