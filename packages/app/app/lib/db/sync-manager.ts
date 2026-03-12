import { saleCollection } from "./collections/sale.collection";
import { customerCollection } from "./collections/customer.collection";
import { paymentCollection } from "./collections/payment.collection";
import { saleItemCollection } from "./collections/sale-item.collection";
import { supplierCollection } from "./collections/supplier.collection";
import { purchaseCollection } from "./collections/purchase.collection";
import { distribucionCollection } from "./collections/distribucion.collection";

function isOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine;
}

const collections = [
  saleCollection,
  customerCollection,
  paymentCollection,
  saleItemCollection,
  supplierCollection,
  purchaseCollection,
  distribucionCollection,
];

let syncInProgress = false;
let retryTimeout: ReturnType<typeof setTimeout> | null = null;

async function triggerSync() {
  if (syncInProgress) {
    return;
  }

  syncInProgress = true;
  console.log("[SyncManager] Online - Starting sync...");

  try {
    for (const collection of collections as any[]) {
      try {
        console.log(`[SyncManager] Syncing collection: ${collection.id}`);
        
        if (collection.utils?.truncate) {
          await collection.utils.truncate();
        }
        
        if (collection.utils?.loadSubset) {
          await collection.utils.loadSubset();
        }
        
        console.log(`[SyncManager] Synced collection: ${collection.id}`);
      } catch (error) {
        console.error(`[SyncManager] Error syncing ${collection.id}:`, error);
      }
    }

    console.log("[SyncManager] Sync completed");
  } catch (error) {
    console.error("[SyncManager] Sync failed:", error);
    
    if (isOnline()) {
      scheduleRetry();
    }
  } finally {
    syncInProgress = false;
  }
}

function scheduleRetry() {
  if (retryTimeout) {
    clearTimeout(retryTimeout);
  }
  
  retryTimeout = setTimeout(() => {
    if (isOnline()) {
      triggerSync();
    }
  }, 5000);
}

export function initAutoSync() {
  if (typeof window === "undefined") {
    return;
  }

  console.log("[SyncManager] Initializing auto-sync...");

  if (isOnline()) {
    setTimeout(() => triggerSync(), 1000);
  }

  window.addEventListener("online", () => {
    console.log("[SyncManager] Connection restored");
    triggerSync();
  });

  window.addEventListener("offline", () => {
    console.log("[SyncManager] Connection lost");
  });
}

export function forceSyncNow() {
  if (!isOnline()) {
    console.warn("[SyncManager] Cannot force sync while offline");
    return;
  }
  triggerSync();
}

export { triggerSync };
