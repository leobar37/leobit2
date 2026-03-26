#!/usr/bin/env bun

/**
 * Migration Script: TanStack DB to PGlite
 * 
 * Migrates data from TanStack DB collections (IndexedDB) to PGlite.
 * This script reads the existing TanStack collections and inserts the data
 * into PGlite tables with sync_status='synced'.
 * 
 * Usage: bun scripts/migrate-tanstack-to-pglite.ts [--dry-run] [--verbose]
 */

import { PGlite } from "@electric-sql/pglite";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isVerbose = args.includes("--verbose");

// Types
interface MigrationReport {
  timestamp: string;
  summary: {
    totalCollections: number;
    totalRecords: number;
    migratedRecords: number;
    errors: number;
    passed: boolean;
  };
  collectionResults: {
    collection: string;
    sourceRecords: number;
    migratedRecords: number;
    errors: number;
    passed: boolean;
  }[];
  errors: {
    collection: string;
    recordId: string;
    issue: string;
  }[];
  metadata: {
    migrationVersion: string;
    startTime: string;
    endTime: string;
    durationMs: number;
    dryRun: boolean;
  };
}

// TanStack DB collection names to migrate
const COLLECTIONS_TO_MIGRATE = [
  "customers",
  "sales",
  "sale_items",
  "abonos",
  "products",
  "product_variants",
  "suppliers",
  "purchases",
  "purchase_items",
  "distribuciones",
  "distribucion_items",
  "files",
  "assets",
  "businesses",
  "business_users",
];

// Table name mapping: collection name -> PGlite table name
const TABLE_MAPPING: Record<string, string> = {
  customers: "customers",
  sales: "sales",
  sale_items: "sale_items",
  abonos: "abonos",
  products: "products",
  product_variants: "product_variants",
  suppliers: "suppliers",
  purchases: "purchases",
  purchase_items: "purchase_items",
  distribuciones: "distribuciones",
  distribucion_items: "distribucion_items",
  files: "files",
  assets: "assets",
  businesses: "businesses",
  business_users: "business_users",
};

// Field mappings: collection field -> table field (snake_case conversion)
function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

function transformFieldName(fieldName: string): string {
  // Special mappings for specific fields
  const specialMappings: Record<string, string> = {
    clientId: "customer_id",
    sellerId: "seller_id",
    businessId: "business_id",
    productId: "product_id",
    variantId: "variant_id",
    saleId: "sale_id",
    purchaseId: "purchase_id",
    distribucionId: "distribucion_id",
    customerId: "customer_id",
    supplierId: "supplier_id",
    relatedSaleId: "related_sale_id",
    createdBy: "created_by",
    updatedBy: "updated_by",
    cancelledBy: "cancelled_by",
    cancelledAt: "cancelled_at",
    createdAt: "created_at",
    updatedAt: "updated_at",
    syncStatus: "sync_status",
    syncAttempts: "sync_attempts",
    saleType: "sale_type",
    paymentMode: "payment_mode",
    paymentMethod: "payment_method",
    totalAmount: "total_amount",
    amountPaid: "amount_paid",
    balanceDue: "balance_due",
    netWeight: "net_weight",
    saleDate: "sale_date",
    deliveryDate: "delivery_date",
    orderDate: "order_date",
    purchaseDate: "purchase_date",
    productName: "product_name",
    variantName: "variant_name",
    unitPrice: "unit_price",
    unitCost: "unit_cost",
    totalCost: "total_cost",
    basePrice: "base_price",
    hasVariants: "has_variants",
    isActive: "is_active",
    isModified: "is_modified",
    referenceNumber: "reference_number",
    proofImageId: "proof_image_id",
    invoiceNumber: "invoice_number",
    receiptImageId: "receipt_image_id",
    logoUrl: "logo_url",
    modoOperacion: "modo_operacion",
    controlKilos: "control_kilos",
    usarDistribucion: "usar_distribucion",
    modoDistribucion: "modo_distribucion",
    permitirVentaSinStock: "permitir_venta_sin_stock",
    calculatorSettings: "calculator_settings",
    salesPoint: "sales_point",
    commissionRate: "commission_rate",
    joinedAt: "joined_at",
    unitQuantity: "unit_quantity",
    sortOrder: "sort_order",
    vendedorId: "vendedor_id",
    puntoVenta: "punto_venta",
    kilosAsignados: "kilos_asignados",
    kilosVendidos: "kilos_vendidos",
    montoRecaudado: "monto_recaudado",
    confiarEnVendedor: "confiar_en_vendedor",
    pesoConfirmado: "peso_confirmado",
    cantidadAsignada: "cantidad_asignada",
    cantidadVendida: "cantidad_vendida",
    storagePath: "storage_path",
    mimeType: "mime_type",
    sizeBytes: "size_bytes",
    orderedQuantity: "ordered_quantity",
    deliveredQuantity: "delivered_quantity",
    unitPriceQuoted: "unit_price_quoted",
    unitPriceFinal: "unit_price_final",
    originalQuantity: "original_quantity",
    confirmedSnapshot: "confirmed_snapshot",
    deliveredSnapshot: "delivered_snapshot",
    allowCustomerEdit: "allow_customer_edit",
    cancelReason: "cancel_reason",
    refundAmount: "refund_amount",
    refundDate: "refund_date",
    refundMethod: "refund_method",
    refundReference: "refund_reference",
    refundNotes: "refund_notes",
    advancePaymentMethod: "advance_payment_method",
    advanceReferenceNumber: "advance_reference_number",
    advanceProofImageId: "advance_proof_image_id",
    userId: "user_id",
  };

  return specialMappings[fieldName] || toSnakeCase(fieldName);
}

// Type conversion for values
function convertValue(value: unknown, fieldName: string): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  // Handle boolean fields
  const booleanFields = [
    "isActive", "isModified", "hasVariants", "confiarEnVendedor",
    "pesoConfirmado", "allowCustomerEdit", "controlKilos",
    "usarDistribucion", "permitirVentaSinStock"
  ];
  if (booleanFields.includes(fieldName)) {
    return value === true || value === "true" || value === 1 || value === "1";
  }

  // Handle numeric/decimal fields (stored as strings in PGlite)
  const decimalFields = [
    "totalAmount", "amountPaid", "balanceDue", "tara", "netWeight",
    "kilosAsignados", "kilosVendidos", "montoRecaudado", "quantity",
    "orderedQuantity", "deliveredQuantity", "unitPrice", "unitPriceQuoted",
    "unitPriceFinal", "subtotal", "unitCost", "totalCost", "basePrice",
    "price", "unitQuantity", "amount", "commissionRate", "cantidadAsignada",
    "cantidadVendida", "refundAmount", "advanceAmount"
  ];
  if (decimalFields.includes(fieldName)) {
    if (typeof value === "string") {
      // Keep as string for decimal precision
      return value;
    }
    if (typeof value === "number") {
      return value.toString();
    }
    return "0";
  }

  // Handle integer fields
  const integerFields = [
    "syncAttempts", "version", "sortOrder"
  ];
  if (integerFields.includes(fieldName)) {
    if (typeof value === "string") {
      return parseInt(value, 10) || 0;
    }
    return typeof value === "number" ? value : 0;
  }

  // Handle date fields
  const dateFields = [
    "createdAt", "updatedAt", "saleDate", "deliveryDate", "orderDate",
    "purchaseDate", "cancelledAt", "refundDate", "joinedAt", "fecha"
  ];
  if (dateFields.includes(fieldName)) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === "string") {
      // Try to parse and reformat
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    return value;
  }

  // Handle JSON fields
  const jsonFields = [
    "confirmedSnapshot", "deliveredSnapshot", "calculatorSettings"
  ];
  if (jsonFields.includes(fieldName)) {
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    if (typeof value === "string") {
      // Validate it's valid JSON
      try {
        JSON.parse(value);
        return value;
      } catch {
        return JSON.stringify(value);
      }
    }
    return null;
  }

  // Default: return as-is
  return value;
}

// Open IndexedDB and read TanStack collections
async function readTanStackCollections(): Promise<Record<string, unknown[]>> {
  return new Promise((resolve, reject) => {
    const collections: Record<string, unknown[]> = {};
    
    // TanStack DB uses "tanstack_db" as the default database name
    const request = indexedDB.open("tanstack_db");
    
    request.onerror = () => reject(new Error("Failed to open TanStack DB"));
    
    request.onsuccess = () => {
      const db = request.result;
      const storeNames = Array.from(db.objectStoreNames);
      
      if (storeNames.length === 0) {
        console.log("No stores found in TanStack DB");
        resolve(collections);
        return;
      }
      
      let storesProcessed = 0;
      const totalStores = storeNames.length;
      
      for (const storeName of storeNames) {
        try {
          const transaction = db.transaction(storeName, "readonly");
          const store = transaction.objectStore(storeName);
          const getAllRequest = store.getAll();
          
          getAllRequest.onsuccess = () => {
            collections[storeName] = getAllRequest.result;
            storesProcessed++;
            
            if (isVerbose) {
              console.log(`  Read ${getAllRequest.result.length} records from ${storeName}`);
            }
            
            if (storesProcessed === totalStores) {
              db.close();
              resolve(collections);
            }
          };
          
          getAllRequest.onerror = () => {
            console.warn(`  Warning: Could not read from ${storeName}`);
            storesProcessed++;
            if (storesProcessed === totalStores) {
              db.close();
              resolve(collections);
            }
          };
        } catch (err) {
          console.warn(`  Warning: Error reading ${storeName}: ${err}`);
          storesProcessed++;
          if (storesProcessed === totalStores) {
            db.close();
            resolve(collections);
          }
        }
      }
    };
    
    request.onupgradeneeded = () => {
      // Database doesn't exist yet
      console.log("TanStack DB does not exist yet - nothing to migrate");
      resolve({});
    };
  });
}

// Transform record from TanStack format to PGlite format
function transformRecord(record: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [fieldName, value] of Object.entries(record)) {
    const targetField = transformFieldName(fieldName);
    const convertedValue = convertValue(value, fieldName);
    result[targetField] = convertedValue;
  }
  
  // Ensure sync_status is set to 'synced' for migrated data
  result.sync_status = "synced";
  
  return result;
}

// Escape SQL value
function escapeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "NULL";
  }
  
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  
  if (typeof value === "number") {
    return String(value);
  }
  
  if (typeof value === "object") {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
  
  // String values - escape single quotes
  return `'${String(value).replace(/'/g, "''")}'`;
}

// Migrate data from TanStack collections to PGlite
async function migrateCollections(
  collections: Record<string, unknown[]>,
  pg: PGlite
): Promise<MigrationReport> {
  const startTime = new Date().toISOString();
  const errors: { collection: string; recordId: string; issue: string }[] = [];
  const collectionResults: MigrationReport["collectionResults"] = [];
  let totalMigrated = 0;
  let totalErrors = 0;
  let totalRecords = 0;

  console.log(`\nMigrating ${Object.keys(collections).length} collections...`);
  console.log("=".repeat(60));

  for (const collectionName of COLLECTIONS_TO_MIGRATE) {
    const records = collections[collectionName] || [];
    const tableName = TABLE_MAPPING[collectionName] || collectionName;
    
    let migratedCount = 0;
    let errorCount = 0;
    
    totalRecords += records.length;

    console.log(`\n${collectionName} -> ${tableName} (${records.length} records)`);

    if (records.length === 0) {
      collectionResults.push({
        collection: collectionName,
        sourceRecords: 0,
        migratedRecords: 0,
        errors: 0,
        passed: true,
      });
      continue;
    }

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i] as Record<string, unknown>;
      
      try {
        // Transform record
        const transformedRecord = transformRecord(record);
        
        if (isDryRun) {
          // In dry-run mode, just validate the transformation
          migratedCount++;
          if (isVerbose && i < 3) {
            console.log(`  [DRY RUN] Would insert: ${JSON.stringify(transformedRecord).substring(0, 100)}...`);
          }
        } else {
          // Build and execute INSERT statement
          const fields = Object.keys(transformedRecord);
          const values = Object.values(transformedRecord).map(escapeValue);
          
          const sql = `INSERT INTO ${tableName} (${fields.join(", ")}) VALUES (${values.join(", ")})`;
          
          await pg.exec(sql);
          migratedCount++;
          
          // Show progress every 50 records
          if ((i + 1) % 50 === 0) {
            process.stdout.write(`  Progress: ${i + 1}/${records.length}\r`);
          }
        }
      } catch (err) {
        errorCount++;
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push({
          collection: collectionName,
          recordId: String(record.id || `index-${i}`),
          issue: errorMsg,
        });
        
        if (isVerbose) {
          console.error(`  Error: ${errorMsg} (record ${record.id || i})`);
        }
      }
    }

    totalMigrated += migratedCount;
    totalErrors += errorCount;

    collectionResults.push({
      collection: collectionName,
      sourceRecords: records.length,
      migratedRecords: migratedCount,
      errors: errorCount,
      passed: errorCount === 0,
    });

    const status = errorCount === 0 ? "✓" : "⚠";
    console.log(`  ${status} Migrated ${migratedCount}/${records.length}${errorCount > 0 ? ` (${errorCount} errors)` : ""}`);
  }

  const endTime = new Date().toISOString();
  const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();

  return {
    timestamp: new Date().toISOString(),
    summary: {
      totalCollections: COLLECTIONS_TO_MIGRATE.length,
      totalRecords,
      migratedRecords: totalMigrated,
      errors: totalErrors,
      passed: totalErrors === 0,
    },
    collectionResults,
    errors,
    metadata: {
      migrationVersion: "1.0.0",
      startTime,
      endTime,
      durationMs,
      dryRun: isDryRun,
    },
  };
}

// Main migration function
async function main() {
  const outputDir = "./reports";
  const outputPath = join(outputDir, "tanstack-to-pglite-migration-report.json");

  console.log("=".repeat(60));
  console.log("TanStack DB to PGlite Migration");
  console.log("=".repeat(60));
  
  if (isDryRun) {
    console.log("\n⚠️  DRY RUN MODE - No data will be written\n");
  }

  // Initialize PGlite
  console.log("\nInitializing PGlite database...");
  const pg = await PGlite.create({
    dataDir: "./data/pglite-migration",
  });

  // Read TanStack collections
  console.log("\nReading TanStack DB collections...");
  let collections: Record<string, unknown[]>;
  try {
    collections = await readTanStackCollections();
    const totalRecords = Object.values(collections).reduce((sum, recs) => sum + recs.length, 0);
    console.log(`Found ${Object.keys(collections).length} collections with ${totalRecords} total records`);
  } catch (err) {
    console.error(`Error reading TanStack collections: ${err}`);
    await pg.close();
    process.exit(1);
  }

  if (Object.keys(collections).length === 0) {
    console.log("\nNo TanStack collections found. Nothing to migrate.");
    await pg.close();
    process.exit(0);
  }

  // Run migration
  console.log("\nStarting migration...");
  const report = await migrateCollections(collections, pg);

  // Create output directory if it doesn't exist
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Write report
  writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\nMigration report written to: ${outputPath}`);

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("MIGRATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total Collections: ${report.summary.totalCollections}`);
  console.log(`Total Records: ${report.summary.totalRecords}`);
  console.log(`Migrated Records: ${report.summary.migratedRecords}`);
  console.log(`Errors: ${report.summary.errors}`);
  console.log(`Duration: ${report.metadata.durationMs}ms`);
  console.log(`\nStatus: ${report.summary.passed ? "✅ PASSED" : "⚠️  COMPLETED WITH ERRORS"}`);

  // Print collection results
  console.log("\nCollection Results:");
  console.log("-".repeat(60));
  for (const result of report.collectionResults) {
    const status = result.passed ? "✓" : "⚠";
    console.log(`${status} ${result.collection}: ${result.migratedRecords}/${result.sourceRecords}${result.errors > 0 ? ` (${result.errors} errors)` : ""}`);
  }

  // Print errors if any
  if (report.errors.length > 0) {
    console.log("\n" + "=".repeat(60));
    console.log("ERRORS (first 20)");
    console.log("=".repeat(60));
    for (const error of report.errors.slice(0, 20)) {
      console.log(`[${error.collection}] ${error.issue}`);
      console.log(`  Record ID: ${error.recordId}`);
    }
    if (report.errors.length > 20) {
      console.log(`... and ${report.errors.length - 20} more errors`);
    }
  }

  console.log("\n" + "=".repeat(60));

  // Close PGlite
  await pg.close();

  // Exit with error code if migration had errors and not in dry-run mode
  if (!isDryRun && !report.summary.passed) {
    console.log("\n⚠️  Migration completed with errors!");
    process.exit(1);
  } else {
    console.log(isDryRun ? "\n✅ Dry run completed successfully!" : "\n✅ Migration completed successfully!");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
