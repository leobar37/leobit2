/**
 * TanStack DB Backup Utility
 * 
 * This utility exports all TanStack DB collections to JSON.
 * Run this in the browser console or as part of the app.
 * 
 * Usage:
 * 1. Import and call createTanStackBackup() to get backup data
 * 2. Use saveBackupToDownloads() to download as JSON file
 * 3. Use saveBackupToServer() to save to server (if API available)
 */

import { customerCollection } from "../lib/db/collections/customer.collection";
import { saleCollection } from "../lib/db/collections/sale.collection";
import { saleItemCollection } from "../lib/db/collections/sale-item.collection";
import { productCollection, productVariantCollection } from "../lib/db/collections/product.collection";
import { paymentCollection } from "../lib/db/collections/payment.collection";
import { distribucionCollection } from "../lib/db/collections/distribucion.collection";
import { supplierCollection } from "../lib/db/collections/supplier.collection";
import { purchaseCollection } from "../lib/db/collections/purchase.collection";
import { assetCollection } from "../lib/db/collections/asset.collection";
import { fileCollection } from "../lib/db/collections/file.collection";

export interface BackupData {
  metadata: {
    timestamp: string;
    version: string;
    collections: string[];
    source: 'tanstack-db';
  };
  collections: Record<string, unknown[]>;
  checksum?: string;
  checksumAlgorithm?: string;
}

// Collection configurations
const COLLECTION_CONFIGS = [
  { id: 'customers', collection: customerCollection },
  { id: 'sales', collection: saleCollection },
  { id: 'sale_items', collection: saleItemCollection },
  { id: 'products', collection: productCollection },
  { id: 'product_variants', collection: productVariantCollection },
  { id: 'payments', collection: paymentCollection },
  { id: 'distribuciones', collection: distribucionCollection },
  { id: 'suppliers', collection: supplierCollection },
  { id: 'purchases', collection: purchaseCollection },
  { id: 'assets', collection: assetCollection },
  { id: 'files', collection: fileCollection },
] as const;

type CollectionConfig = typeof COLLECTION_CONFIGS[number];

/**
 * Open IndexedDB and get all records from a specific object store
 */
function getAllFromIndexedDB(db: IDBDatabase, storeName: string): Promise<unknown[]> {
  return new Promise((resolve) => {
    if (!db.objectStoreNames.contains(storeName)) {
      resolve([]);
      return;
    }

    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      resolve([]);
    };
  });
}

/**
 * Try to find and export data from IndexedDB
 */
async function findCollectionData(collectionId: string): Promise<unknown[]> {
  // Common database names used by TanStack DB / Electric
  const dbNames = [
    'avileo-pg',
    'tanstack-db',
    'electric-db',
    'avileo-local',
    'avileo-db',
  ];

  for (const dbName of dbNames) {
    try {
      const db = await openIndexedDB(dbName);
      if (db) {
        // Try the collection ID directly
        let data = await getAllFromIndexedDB(db, collectionId);
        if (data.length > 0) {
          console.log(`[Backup] Found ${data.length} records in ${dbName}/${collectionId}`);
          db.close();
          return data;
        }

        // Try with 's' suffix (e.g., 'customer' -> 'customers')
        const pluralId = collectionId.endsWith('s') ? collectionId : `${collectionId}s`;
        data = await getAllFromIndexedDB(db, pluralId);
        if (data.length > 0) {
          console.log(`[Backup] Found ${data.length} records in ${dbName}/${pluralId}`);
          db.close();
          return data;
        }

        db.close();
      }
    } catch (error) {
      // Database doesn't exist or can't be opened
    }
  }

  return [];
}

/**
 * Open IndexedDB database
 */
function openIndexedDB(dbName: string): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }

    try {
      const request = indexedDB.open(dbName);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        resolve(null);
      };

      request.onupgradeneeded = () => {
        // Database doesn't exist
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Try to get data from TanStack DB collection's internal state
 */
function getDataFromCollectionState(collection: { state?: { get?: () => Map<string | number, unknown> } }): unknown[] {
  try {
    if (collection.state?.get) {
      const stateMap = collection.state.get();
      if (stateMap instanceof Map) {
        return Array.from(stateMap.values());
      }
    }
  } catch {
    // Ignore errors
  }
  return [];
}

/**
 * Create backup of all TanStack DB collections
 */
export async function createTanStackBackup(): Promise<BackupData> {
  const backup: BackupData = {
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      collections: COLLECTION_CONFIGS.map(c => c.id),
      source: 'tanstack-db',
    },
    collections: {},
  };

  console.log('[Backup] Starting TanStack DB backup...');

  for (const config of COLLECTION_CONFIGS) {
    const { id, collection } = config;
    console.log(`[Backup] Backing up collection: ${id}...`);

    // Try IndexedDB first
    let data = await findCollectionData(id);

    // Fallback to collection state API
    if (data.length === 0) {
      data = getDataFromCollectionState(collection as { state?: { get?: () => Map<string | number, unknown> } });
    }

    backup.collections[id] = data;
    console.log(`[Backup]   - Found ${data.length} records`);
  }

  const totalRecords = Object.values(backup.collections).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`[Backup] Total records: ${totalRecords}`);

  return backup;
}

/**
 * Generate SHA-256 checksum for data
 */
export async function generateChecksum(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Save backup to downloads as JSON file
 */
export function saveBackupToDownloads(backup: BackupData, checksum: string): void {
  const output: BackupData = {
    ...backup,
    checksum,
    checksumAlgorithm: 'SHA-256',
  };

  const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `pre-migration-${timestamp}.json`;
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log(`[Backup] Saved to: ${filename}`);
}

/**
 * Main function to create and download backup
 */
export async function runBackup(): Promise<{ success: boolean; message: string; filename?: string; checksum?: string }> {
  try {
    const backup = await createTanStackBackup();
    const jsonString = JSON.stringify(backup, null, 2);
    const checksum = await generateChecksum(jsonString);
    
    saveBackupToDownloads(backup, checksum);
    
    return {
      success: true,
      message: 'Backup created successfully',
      filename: `pre-migration-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`,
      checksum,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Backup] Failed:', message);
    return {
      success: false,
      message,
    };
  }
}

// Export for console usage
if (typeof window !== 'undefined') {
  (window as unknown as { backupTanStackDB: typeof runBackup }).backupTanStackDB = runBackup;
}

export default runBackup;
