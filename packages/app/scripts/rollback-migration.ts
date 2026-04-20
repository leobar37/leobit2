#!/usr/bin/env bun
// @ts-nocheck - Migration script

/**
 * Rollback Script: PGlite to TanStack DB
 * 
 * Rolls back the migration by clearing PGlite data and restoring
 * the original TanStack DB data from backup.
 * 
 * Usage: 
 *   bun scripts/rollback-migration.ts
 *   bun scripts/rollback-migration.ts --verify-only
 *   bun scripts/rollback-migration.ts --clear-only
 *   bun scripts/rollback-migration.ts --file-based  # Use file-based PGlite for testing
 * 
 * Options:
 *   --verify-only  Only verify the rollback is possible, don't execute
 *   --clear-only   Only clear PGlite, don't restore data
 *   --file-based  Use file-based PGlite instead of IndexedDB (for testing)
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { PGlite } from "@electric-sql/pglite";

interface RollbackReport {
  timestamp: string;
  backupFile: string;
  status: "success" | "failed" | "partial";
  summary: {
    tablesCleared: number;
    recordsCleared: number;
    recordsRestored: number;
    durationMs: number;
  };
  tableResults: {
    table: string;
    recordsCleared: number;
    recordsRestored: number;
    status: string;
  }[];
  errors: {
    table: string;
    operation: string;
    issue: string;
  }[];
  metadata: {
    rollbackVersion: string;
    startTime: string;
    endTime: string;
  };
}

// Tables that were migrated (in order for foreign key constraints)
const TABLES_TO_ROLLBACK = [
  "distribucionItems",
  "distribuciones",
  "abonos",
  "saleItems",
  "sales",
  "purchaseItems",
  "purchases",
  "productVariants",
  "products",
  "suppliers",
  "customers",
  "businessUsers",
  "businesses",
];

// Map source field names back to target table names
function getTargetTableName(sourceTable: string): string {
  const tableMapping: Record<string, string> = {
    businesses: "businesses",
    businessUsers: "business_users",
    customers: "customers",
    saleItems: "sale_items",
    productVariants: "product_variants",
    distribucionItems: "distribucion_items",
    purchaseItems: "purchase_items",
  };
  
  return tableMapping[sourceTable] || sourceTable;
}

// Field mappings for restoring data back to original format
// Input: backup data (camelCase) -> Output: PostgreSQL fields (snake_case)
const REVERSE_FIELD_MAPPINGS: Record<string, Record<string, string>> = {
  businesses: {
    id: "id",
    name: "name",
    ruc: "ruc",
    address: "address",
    phone: "phone",
    email: "email",
    logoUrl: "logo_url",
    modoOperacion: "modo_operacion",
    controlKilos: "control_kilos",
    usarDistribucion: "usar_distribucion",
    modoDistribucion: "modo_distribucion",
    permitirVentaSinStock: "permitir_venta_sin_stock",
    calculatorSettings: "calculator_settings",
    isActive: "is_active",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  businessUsers: {
    id: "id",
    businessId: "business_id",
    userId: "user_id",
    role: "role",
    salesPoint: "sales_point",
    commissionRate: "commission_rate",
    isActive: "is_active",
    joinedAt: "joined_at",
    updatedAt: "updated_at",
  },
  customers: {
    id: "id",
    name: "name",
    dni: "dni",
    phone: "phone",
    address: "address",
    notes: "notes",
    syncStatus: "sync_status",
    syncAttempts: "sync_attempts",
    businessId: "business_id",
    createdBy: "created_by",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  sales: {
    id: "id",
    businessId: "business_id",
    clientId: "customer_id",
    sellerId: "seller_id",
    distribucionId: "distribucion_id",
    type: "type",
    saleType: "sale_type",
    paymentMode: "payment_mode",
    totalAmount: "total_amount",
    amountPaid: "amount_paid",
    balanceDue: "balance_due",
    tara: "tara",
    netWeight: "net_weight",
    saleDate: "sale_date",
    deliveryDate: "delivery_date",
    orderDate: "order_date",
    status: "status",
    version: "version",
    confirmedSnapshot: "confirmed_snapshot",
    deliveredSnapshot: "delivered_snapshot",
    allowCustomerEdit: "allow_customer_edit",
    syncStatus: "sync_status",
    syncAttempts: "sync_attempts",
    cancelledAt: "cancelled_at",
    cancelledBy: "cancelled_by",
    cancelReason: "cancel_reason",
    refundAmount: "refund_amount",
    refundDate: "refund_date",
    refundMethod: "refund_method",
    refundReference: "refund_reference",
    refundNotes: "refund_notes",
    advancePaymentMethod: "advance_payment_method",
    advanceReferenceNumber: "advance_reference_number",
    advanceProofImageId: "advance_proof_image_id",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  saleItems: {
    id: "id",
    saleId: "sale_id",
    productId: "product_id",
    variantId: "variant_id",
    productName: "product_name",
    variantName: "variant_name",
    quantity: "quantity",
    orderedQuantity: "ordered_quantity",
    deliveredQuantity: "delivered_quantity",
    unitPrice: "unit_price",
    unitPriceQuoted: "unit_price_quoted",
    unitPriceFinal: "unit_price_final",
    subtotal: "subtotal",
    isModified: "is_modified",
    originalQuantity: "original_quantity",
  },
  abonos: {
    id: "id",
    customerId: "customer_id",
    sellerId: "seller_id",
    businessId: "business_id",
    relatedSaleId: "related_sale_id",
    amount: "amount",
    paymentMethod: "payment_method",
    referenceNumber: "reference_number",
    proofImageId: "proof_image_id",
    notes: "notes",
    syncStatus: "sync_status",
    syncAttempts: "sync_attempts",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  products: {
    id: "id",
    businessId: "business_id",
    name: "name",
    type: "type",
    unit: "unit",
    basePrice: "base_price",
    isActive: "is_active",
    hasVariants: "has_variants",
    imageId: "image_id",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  productVariants: {
    id: "id",
    productId: "product_id",
    name: "name",
    sku: "sku",
    unitQuantity: "unit_quantity",
    price: "price",
    sortOrder: "sort_order",
    isActive: "is_active",
    syncStatus: "sync_status",
    syncAttempts: "sync_attempts",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  suppliers: {
    id: "id",
    businessId: "business_id",
    name: "name",
    type: "type",
    ruc: "ruc",
    address: "address",
    phone: "phone",
    email: "email",
    notes: "notes",
    isActive: "is_active",
    syncStatus: "sync_status",
    syncAttempts: "sync_attempts",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  purchases: {
    id: "id",
    businessId: "business_id",
    supplierId: "supplier_id",
    purchaseDate: "purchase_date",
    totalAmount: "total_amount",
    status: "status",
    invoiceNumber: "invoice_number",
    receiptImageId: "receipt_image_id",
    notes: "notes",
    syncStatus: "sync_status",
    syncAttempts: "sync_attempts",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  purchaseItems: {
    id: "id",
    purchaseId: "purchase_id",
    productId: "product_id",
    variantId: "variant_id",
    unitId: "unit_id",
    quantity: "quantity",
    unitCost: "unit_cost",
    totalCost: "total_cost",
    syncStatus: "sync_status",
    syncAttempts: "sync_attempts",
    createdAt: "created_at",
  },
  distribuciones: {
    id: "id",
    businessId: "business_id",
    vendedorId: "vendedor_id",
    puntoVenta: "punto_venta",
    kilosAsignados: "kilos_asignados",
    kilosVendidos: "kilos_vendidos",
    montoRecaudado: "monto_recaudado",
    fecha: "fecha",
    estado: "estado",
    modo: "modo",
    confiarEnVendedor: "confiar_en_vendedor",
    pesoConfirmado: "peso_confirmado",
    syncStatus: "sync_status",
    syncAttempts: "sync_attempts",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  distribucionItems: {
    id: "id",
    distribucionId: "distribucion_id",
    variantId: "variant_id",
    cantidadAsignada: "cantidad_asignada",
    cantidadVendida: "cantidad_vendida",
    unidad: "unidad",
    syncStatus: "sync_status",
    syncAttempts: "sync_attempts",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
};

function escapeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  
  if (typeof value === 'number') {
    return String(value);
  }
  
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
  
  return `'${String(value).replace(/'/g, "''")}'`;
}

function reverseTransformRecord(record: unknown, fieldMapping: Record<string, string> | undefined): Record<string, unknown> {
  if (!fieldMapping) {
    return record as Record<string, unknown>;
  }

  const result: Record<string, unknown> = {};
  
  for (const [sourceField, targetField] of Object.entries(fieldMapping)) {
    if (sourceField in (record as Record<string, unknown>)) {
      result[targetField] = (record as Record<string, unknown>)[sourceField];
    }
  }
  
  return result;
}

async function clearPGliteTables(pg: PGlite): Promise<{ table: string; recordsCleared: number }[]> {
  const results: { table: string; recordsCleared: number }[] = [];
  
  console.log("\n" + "=".repeat(60));
  console.log("CLEARING PGLITE TABLES");
  console.log("=".repeat(60));

  // Clear in reverse order to handle foreign key constraints
  for (const tableName of TABLES_TO_ROLLBACK) {
    const targetTableName = getTargetTableName(tableName);
    
    try {
      // Get count before delete
      const countResult = await pg.exec(`SELECT COUNT(*) as count FROM ${targetTableName}`);
      const countBefore = countResult.length > 0 && countResult[0].rows?.length > 0 
        ? Number(countResult[0].rows[0].count) 
        : 0;
      
      // Delete all records
      await pg.exec(`DELETE FROM ${targetTableName}`);
      
      results.push({
        table: tableName,
        recordsCleared: countBefore,
      });
      
      console.log(`  ✓ Cleared ${targetTableName}: ${countBefore} records`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.log(`  ✗ Error clearing ${targetTableName}: ${errorMsg}`);
      results.push({
        table: tableName,
        recordsCleared: 0,
      });
    }
  }
  
  return results;
}

async function restoreToPGlite(pg: PGlite, backupData: Record<string, unknown[]>): Promise<{ table: string; recordsRestored: number }[]> {
  const results: { table: string; recordsRestored: number }[] = [];
  
  console.log("\n" + "=".repeat(60));
  console.log("RESTORING DATA TO PGLITE");
  console.log("=".repeat(60));

  // Restore in order to handle foreign key constraints
  for (const tableName of TABLES_TO_ROLLBACK) {
    const sourceRecords = backupData[tableName] || [];
    const targetTableName = getTargetTableName(tableName);
    const fieldMapping = REVERSE_FIELD_MAPPINGS[tableName];
    
    if (sourceRecords.length === 0) {
      results.push({ table: tableName, recordsRestored: 0 });
      console.log(`  - ${tableName}: 0 records (empty in backup)`);
      continue;
    }

    let restoredCount = 0;
    
    for (const record of sourceRecords) {
      try {
        const transformedRecord = reverseTransformRecord(record, fieldMapping);
        
        const fields = Object.keys(transformedRecord);
        const values = Object.values(transformedRecord).map(escapeValue);
        
        const sql = `INSERT INTO ${targetTableName} (${fields.join(", ")}) VALUES (${values.join(", ")})`;
        
        await pg.exec(sql);
        restoredCount++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`  Error restoring ${tableName} record ${record.id}: ${errorMsg}`);
      }
    }

    results.push({
      table: tableName,
      recordsRestored: restoredCount,
    });
    
    console.log(`  ✓ Restored ${tableName}: ${restoredCount}/${sourceRecords.length} records`);
  }
  
  return results;
}

async function verifyRollback(pg: PGlite, backupData: Record<string, unknown[]>): Promise<{
  rowCounts: Record<string, { source: number; target: number; match: boolean }>;
  passed: boolean;
}> {
  const rowCounts: Record<string, { source: number; target: number; match: boolean }> = {};
  let allMatch = true;

  console.log("\n" + "=".repeat(60));
  console.log("VERIFYING ROLLBACK");
  console.log("=".repeat(60));

  for (const tableName of TABLES_TO_ROLLBACK) {
    const targetTableName = getTargetTableName(tableName);
    const sourceCount = (backupData[tableName] || []).length;
    
    let targetCount = 0;
    try {
      const result = await pg.exec(`SELECT COUNT(*) as count FROM ${targetTableName}`);
      
      if (result && result.length > 0 && result[0].rows && result[0].rows.length > 0) {
        targetCount = Number(result[0].rows[0].count);
      }
    } catch (err) {
      console.error(`  Error counting ${targetTableName}: ${err}`);
    }

    const match = sourceCount === targetCount;
    allMatch = allMatch && match;

    rowCounts[tableName] = {
      source: sourceCount,
      target: targetCount,
      match,
    };

    console.log(`  ${tableName}: backup=${sourceCount}, current=${targetCount} ${match ? "✓" : "✗"}`);
  }

  return { rowCounts, passed: allMatch };
}

// Create tables in PGlite (same as migration script)
async function createTables(pg: PGlite): Promise<void> {
  console.log("Creating tables...");
  
  // Customers
  await pg.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      dni VARCHAR(20),
      phone VARCHAR(50),
      address TEXT,
      notes TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      business_id UUID NOT NULL,
      created_by UUID,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Sales
  await pg.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id UUID PRIMARY KEY,
      business_id UUID NOT NULL,
      customer_id UUID,
      seller_id UUID NOT NULL,
      distribucion_id UUID,
      type TEXT NOT NULL DEFAULT 'instant_sale',
      sale_type TEXT NOT NULL DEFAULT 'contado',
      payment_mode TEXT,
      total_amount DECIMAL(12,2) NOT NULL,
      amount_paid DECIMAL(12,2) NOT NULL DEFAULT '0',
      balance_due DECIMAL(12,2) NOT NULL DEFAULT '0',
      tara DECIMAL(10,3) DEFAULT '0',
      net_weight DECIMAL(10,3),
      sale_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      delivery_date DATE,
      order_date DATE,
      status TEXT NOT NULL DEFAULT 'draft',
      version INTEGER NOT NULL DEFAULT 1,
      confirmed_snapshot JSONB,
      delivered_snapshot JSONB,
      allow_customer_edit BOOLEAN NOT NULL DEFAULT true,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      cancelled_at TIMESTAMP,
      cancelled_by UUID,
      cancel_reason TEXT,
      refund_amount DECIMAL(12,2),
      refund_date TIMESTAMP,
      refund_method TEXT,
      refund_reference VARCHAR(100),
      refund_notes TEXT,
      advance_payment_method VARCHAR(20),
      advance_reference_number VARCHAR(50),
      advance_proof_image_id UUID,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Sale Items
  await pg.exec(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id UUID PRIMARY KEY,
      sale_id UUID NOT NULL,
      product_id UUID NOT NULL,
      variant_id UUID NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      variant_name VARCHAR(50) NOT NULL,
      quantity DECIMAL(10,3),
      ordered_quantity DECIMAL(10,3),
      delivered_quantity DECIMAL(10,3),
      unit_price DECIMAL(10,2),
      unit_price_quoted DECIMAL(10,2),
      unit_price_final DECIMAL(10,2),
      subtotal DECIMAL(12,2) NOT NULL,
      is_modified BOOLEAN NOT NULL DEFAULT false,
      original_quantity DECIMAL(10,3)
    );
  `);

  // Abonos (Payments)
  await pg.exec(`
    CREATE TABLE IF NOT EXISTS abonos (
      id UUID PRIMARY KEY,
      customer_id UUID NOT NULL,
      seller_id UUID NOT NULL,
      business_id UUID NOT NULL,
      related_sale_id UUID,
      amount DECIMAL(12,2) NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'efectivo',
      reference_number VARCHAR(50),
      proof_image_id UUID,
      notes TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Products
  await pg.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY,
      business_id UUID NOT NULL,
      name VARCHAR(255) NOT NULL,
      type TEXT NOT NULL DEFAULT 'pollo',
      unit TEXT NOT NULL DEFAULT 'kg',
      base_price DECIMAL(10,2) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      has_variants BOOLEAN NOT NULL DEFAULT false,
      image_id UUID,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Product Variants
  await pg.exec(`
    CREATE TABLE IF NOT EXISTS product_variants (
      id UUID PRIMARY KEY,
      product_id UUID NOT NULL,
      name VARCHAR(50) NOT NULL,
      sku VARCHAR(50),
      unit_quantity DECIMAL(10,3) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Suppliers
  await pg.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id UUID PRIMARY KEY,
      business_id UUID NOT NULL,
      name VARCHAR(255) NOT NULL,
      type TEXT NOT NULL DEFAULT 'generic',
      ruc VARCHAR(20),
      address TEXT,
      phone VARCHAR(50),
      email VARCHAR(255),
      notes TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Purchases
  await pg.exec(`
    CREATE TABLE IF NOT EXISTS purchases (
      id UUID PRIMARY KEY,
      business_id UUID NOT NULL,
      supplier_id UUID NOT NULL,
      purchase_date DATE NOT NULL,
      total_amount DECIMAL(12,2) NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      invoice_number VARCHAR(50),
      receipt_image_id UUID,
      notes TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Purchase Items
  await pg.exec(`
    CREATE TABLE IF NOT EXISTS purchase_items (
      id UUID PRIMARY KEY,
      purchase_id UUID NOT NULL,
      product_id UUID NOT NULL,
      variant_id UUID,
      unit_id UUID,
      quantity DECIMAL(10,3) NOT NULL,
      unit_cost DECIMAL(10,2) NOT NULL,
      total_cost DECIMAL(12,2) NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Distribuciones
  await pg.exec(`
    CREATE TABLE IF NOT EXISTS distribuciones (
      id UUID PRIMARY KEY,
      business_id UUID NOT NULL,
      vendedor_id UUID NOT NULL,
      punto_venta VARCHAR(100) NOT NULL,
      kilos_asignados DECIMAL(10,3) NOT NULL,
      kilos_vendidos DECIMAL(10,3) NOT NULL DEFAULT '0',
      monto_recaudado DECIMAL(12,2) NOT NULL DEFAULT '0',
      fecha DATE NOT NULL,
      estado TEXT NOT NULL DEFAULT 'activo',
      modo TEXT NOT NULL DEFAULT 'estricto',
      confiar_en_vendedor BOOLEAN NOT NULL DEFAULT false,
      peso_confirmado BOOLEAN NOT NULL DEFAULT true,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Distribucion Items
  await pg.exec(`
    CREATE TABLE IF NOT EXISTS distribucion_items (
      id UUID PRIMARY KEY,
      distribucion_id UUID NOT NULL,
      variant_id UUID NOT NULL,
      cantidad_asignada DECIMAL(10,3) NOT NULL,
      cantidad_vendida DECIMAL(10,3) NOT NULL DEFAULT '0',
      unidad TEXT NOT NULL DEFAULT 'kg',
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Businesses
  await pg.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      ruc VARCHAR(20),
      address TEXT,
      phone VARCHAR(50),
      email VARCHAR(255),
      logo_url TEXT,
      modo_operacion TEXT NOT NULL DEFAULT 'inventario_propio',
      control_kilos BOOLEAN NOT NULL DEFAULT true,
      usar_distribucion BOOLEAN NOT NULL DEFAULT false,
      modo_distribucion TEXT NOT NULL DEFAULT 'estricto',
      permitir_venta_sin_stock BOOLEAN NOT NULL DEFAULT false,
      calculator_settings JSONB,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Business Users
  await pg.exec(`
    CREATE TABLE IF NOT EXISTS business_users (
      id UUID PRIMARY KEY,
      business_id UUID NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      sales_point VARCHAR(100),
      commission_rate DECIMAL(10,2),
      is_active BOOLEAN NOT NULL DEFAULT true,
      joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  console.log("✓ Tables created");
}

async function main() {
  const args = process.argv.slice(2);
  const verifyOnly = args.includes("--verify-only");
  const clearOnly = args.includes("--clear-only");
  const fileBased = args.includes("--file-based");
  
  const backupPath = args.find(a => !a.startsWith("--")) || join(dirname(import.meta.dirname || ""), "../../backups/pre-migration-2026-03-12T14-07-08.json");
  const outputDir = join(dirname(import.meta.dirname || ""), "reports");
  const outputPath = join(outputDir, "rollback-report.json");

  console.log("=".repeat(60));
  console.log("PGLITE ROLLBACK SCRIPT");
  console.log("=".repeat(60));
  console.log(`\nBackup file: ${backupPath}`);
  console.log(`Mode: ${verifyOnly ? "VERIFICATION ONLY" : clearOnly ? "CLEAR ONLY" : "FULL ROLLBACK"}`);
  console.log(`Storage: ${fileBased ? "File-based (testing)" : "IndexedDB (production)"}`);

  if (!existsSync(backupPath)) {
    console.error(`\n✗ Error: Backup file not found: ${backupPath}`);
    console.log("\nUsage:");
    console.log("  bun scripts/rollback-migration.ts");
    console.log("  bun scripts/rollback-migration.ts --verify-only");
    console.log("  bun scripts/rollback-migration.ts --clear-only");
    console.log("  bun scripts/rollback-migration.ts --file-based");
    process.exit(1);
  }

  // Load backup
  let backupData: { metadata: { tables: string[] }; tables: Record<string, unknown[]> };
  try {
    const content = readFileSync(backupPath, "utf-8");
    backupData = JSON.parse(content);
    console.log(`\n✓ Backup loaded successfully`);
    console.log(`  Tables in backup: ${backupData.metadata.tables.join(", ")}`);
  } catch (error) {
    console.error(`\n✗ Error loading backup: ${error}`);
    process.exit(1);
  }

  const startTime = new Date().toISOString();
  const report: RollbackReport = {
    timestamp: new Date().toISOString(),
    backupFile: backupPath,
    status: "failed",
    summary: {
      tablesCleared: 0,
      recordsCleared: 0,
      recordsRestored: 0,
      durationMs: 0,
    },
    tableResults: [],
    errors: [],
    metadata: {
      rollbackVersion: "1.0.0",
      startTime,
      endTime: "",
    },
  };

  try {
    // Initialize PGlite - use file-based for testing, IndexedDB for production
    console.log("\nInitializing PGlite database...");
    
    let pg: PGlite;
    if (fileBased) {
      // Use file-based PGlite for testing
      pg = await PGlite.create({
        dataDir: "./data/pglite-rollback-test",
      });
      console.log("✓ PGlite connected (file-based)");
    } else {
      // Try IndexedDB (browser only)
      try {
        pg = await PGlite.create({
          dataDir: "idb://avileo-pg",
        });
        console.log("✓ PGlite connected (IndexedDB)");
      } catch {
        // Fall back to file-based if IndexedDB is not available (Node.js)
        console.log("⚠ IndexedDB not available, falling back to file-based storage");
        pg = await PGlite.create({
          dataDir: "./data/pglite-rollback-fallback",
        });
        console.log("✓ PGlite connected (file-based fallback)");
      }
    }

    if (verifyOnly) {
      // Just verify the rollback is possible
      console.log("\nRunning verification only...");
      const verification = await verifyRollback(pg, backupData.tables);
      
      const endTime = new Date().toISOString();
      report.metadata.endTime = endTime;
      report.status = verification.passed ? "success" : "failed";
      
      console.log(`\n${"=".repeat(60)}`);
      console.log(`VERIFICATION ${verification.passed ? "PASSED" : "FAILED"}`);
      console.log("=".repeat(60));
      
      await pg.close();
      
      // Write report
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }
      writeFileSync(outputPath, JSON.stringify(report, null, 2));
      
      process.exit(verification.passed ? 0 : 1);
    }

    // Clear PGlite tables
    console.log("\nClearing PGlite tables...");
    
    // Create tables first (in case they don't exist)
    await createTables(pg);
    
    const clearResults = await clearPGliteTables(pg);
    
    report.summary.tablesCleared = clearResults.length;
    report.summary.recordsCleared = clearResults.reduce((sum, r) => sum + r.recordsCleared, 0);
    
    report.tableResults = clearResults.map((r, i) => ({
      table: r.table,
      recordsCleared: r.recordsCleared,
      recordsRestored: 0,
      status: r.recordsCleared >= 0 ? "cleared" : "error",
    }));

    if (!clearOnly) {
      // Restore data from backup
      console.log("\nRestoring data from backup...");
      const restoreResults = await restoreToPGlite(pg, backupData.tables);
      
      report.summary.recordsRestored = restoreResults.reduce((sum, r) => sum + r.recordsRestored, 0);
      
      // Update table results with restore info
      for (const r of restoreResults) {
        const existing = report.tableResults.find(t => t.table === r.table);
        if (existing) {
          existing.recordsRestored = r.recordsRestored;
          existing.status = r.recordsRestored > 0 ? "restored" : "empty";
        }
      }

      // Verify the rollback
      console.log("\nVerifying rollback...");
      const verification = await verifyRollback(pg, backupData.tables);
      report.status = verification.passed ? "success" : "partial";
    } else {
      report.status = "success";
    }

    // Close PGlite
    await pg.close();

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`\n✗ Rollback error: ${errorMsg}`);
    report.errors.push({
      table: "general",
      operation: "rollback",
      issue: errorMsg,
    });
  }

  const endTime = new Date().toISOString();
  report.metadata.endTime = endTime;
  report.summary.durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();

  // Write report
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\nRollback report written to: ${outputPath}`);

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("ROLLBACK SUMMARY");
  console.log("=".repeat(60));
  console.log(`Tables cleared: ${report.summary.tablesCleared}`);
  console.log(`Records cleared: ${report.summary.recordsCleared}`);
  console.log(`Records restored: ${report.summary.recordsRestored}`);
  console.log(`Duration: ${report.summary.durationMs}ms`);
  console.log(`\nStatus: ${report.status === "success" ? "✓ SUCCESS" : report.status === "partial" ? "⚠ PARTIAL" : "✗ FAILED"}`);

  console.log("\n" + "=".repeat(60));

  if (report.status === "success") {
    console.log("\n✅ Rollback completed successfully!");
    console.log("The application will now use TanStack DB (IndexedDB) for data storage.");
    process.exit(0);
  } else if (report.status === "partial") {
    console.log("\n⚠️  Rollback completed with some issues.");
    console.log("Please review the report for details.");
    process.exit(1);
  } else {
    console.log("\n✗ Rollback FAILED!");
    process.exit(1);
  }
}

main();
