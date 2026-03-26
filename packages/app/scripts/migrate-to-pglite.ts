#!/usr/bin/env bun

/**
 * Migration Script: TanStack DB to PGlite
 * 
 * Migrates data from backup file to PGlite database.
 * 
 * Usage: bun scripts/migrate-to-pglite.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { PGlite } from "@electric-sql/pglite";

// Types
interface MigrationReport {
  timestamp: string;
  backupFile: string;
  summary: {
    totalTables: number;
    totalRecords: number;
    migratedRecords: number;
    errors: number;
    passed: boolean;
  };
  tableResults: {
    table: string;
    sourceRecords: number;
    migratedRecords: number;
    errors: number;
    passed: boolean;
  }[];
  errors: {
    table: string;
    recordId: string;
    issue: string;
  }[];
  metadata: {
    migrationVersion: string;
    startTime: string;
    endTime: string;
    durationMs: number;
  };
}

// Table mapping: source field -> target field
// This handles the mapping from TanStack/PostgreSQL schema to PGlite schema
const FIELD_MAPPINGS: Record<string, Record<string, string>> = {
  // Businesses
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
  // Business Users
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
  // Customers
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
  // Sales
  sales: {
    id: "id",
    businessId: "business_id",
    clientId: "customer_id", // Map clientId to customer_id
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
  // Sale Items
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
  // Abonos (Payments)
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
  // Products
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
  // Product Variants
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
  // Suppliers
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
  // Purchases
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
  // Purchase Items
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
  // Distribuciones
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
  // Distribucion Items
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

// Tables to migrate (in order to respect foreign key dependencies)
const TABLES_TO_MIGRATE = [
  "businesses",        // No dependencies
  "businessUsers",     // Depends on businesses
  "customers",         // Depends on businesses, businessUsers
  "products",         // Depends on businesses
  "productVariants",   // Depends on products
  "suppliers",         // Depends on businesses
  "purchases",        // Depends on businesses, suppliers
  "purchaseItems",    // Depends on purchases, products
  "sales",            // Depends on businesses, customers, businessUsers
  "saleItems",        // Depends on sales, products
  "abonos",           // Depends on businesses, customers, businessUsers, sales
  "distribuciones",   // Depends on businesses, businessUsers
  "distribucionItems", // Depends on distribuciones, productVariants
];

async function migrateData(backupData: Record<string, unknown[]>, pg: PGlite): Promise<MigrationReport> {
  const startTime = new Date().toISOString();
  const errors: { table: string; recordId: string; issue: string }[] = [];
  const tableResults: MigrationReport["tableResults"] = [];
  let totalMigrated = 0;
  let totalErrors = 0;

  // Migrate each table
  for (const tableName of TABLES_TO_MIGRATE) {
    const sourceRecords = backupData[tableName] || [];
    const targetTableName = getTargetTableName(tableName);
    const fieldMapping = FIELD_MAPPINGS[tableName];
    
    let migratedCount = 0;
    let errorCount = 0;

    console.log(`\nMigrating ${tableName} -> ${targetTableName} (${sourceRecords.length} records)`);

    if (sourceRecords.length === 0) {
      tableResults.push({
        table: tableName,
        sourceRecords: 0,
        migratedRecords: 0,
        errors: 0,
        passed: true,
      });
      continue;
    }

    // Insert each record
    for (const record of sourceRecords) {
      try {
        // Transform record to target schema
        const transformedRecord = transformRecord(record, fieldMapping);
        
        // Build INSERT statement using template strings
        const fields = Object.keys(transformedRecord);
        const values = Object.values(transformedRecord).map(escapeValue);
        
        const sql = `INSERT INTO ${targetTableName} (${fields.join(", ")}) VALUES (${values.join(", ")})`;
        
        await pg.exec(sql);
        
        migratedCount++;
      } catch (err) {
        errorCount++;
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push({
          table: tableName,
          recordId: String(record.id || "unknown"),
          issue: errorMsg,
        });
        console.error(`  Error migrating ${tableName} record ${record.id}: ${errorMsg}`);
      }
    }

    totalMigrated += migratedCount;
    totalErrors += errorCount;

    tableResults.push({
      table: tableName,
      sourceRecords: sourceRecords.length,
      migratedRecords: migratedCount,
      errors: errorCount,
      passed: errorCount === 0,
    });

    console.log(`  Migrated ${migratedCount}/${sourceRecords.length} records${errorCount > 0 ? ` (${errorCount} errors)` : ""}`);
  }

  const endTime = new Date().toISOString();
  const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();

  return {
    timestamp: new Date().toISOString(),
    backupFile: "",
    summary: {
      totalTables: TABLES_TO_MIGRATE.length,
      totalRecords: Object.values(backupData).reduce((sum, records) => sum + records.length, 0),
      migratedRecords: totalMigrated,
      errors: totalErrors,
      passed: totalErrors === 0,
    },
    tableResults,
    errors,
    metadata: {
      migrationVersion: "1.0.0",
      startTime,
      endTime,
      durationMs,
    },
  };
}

function getTargetTableName(sourceTable: string): string {
  // Map source table names to target table names
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
    // Handle JSON objects
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
  
  // String values - escape single quotes
  return `'${String(value).replace(/'/g, "''")}'`;
}

function transformRecord(record: unknown, fieldMapping: Record<string, string> | undefined): Record<string, unknown> {
  if (!fieldMapping) {
    return record as Record<string, unknown>;
  }

  const result: Record<string, unknown> = {};
  
  for (const [sourceField, targetField] of Object.entries(fieldMapping)) {
    if (sourceField in (record as Record<string, unknown>)) {
      let value = (record as Record<string, unknown>)[sourceField];
      
      // Handle type conversions
      value = convertValue(value, sourceField);
      
      result[targetField] = value;
    }
  }
  
  return result;
}

function convertValue(value: unknown, fieldName: string): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  // Handle boolean fields
  if (fieldName === "isActive" || fieldName === "allowCustomerEdit" || fieldName === "confiarEnVendedor" || fieldName === "pesoConfirmado" || fieldName === "isModified" || fieldName === "hasVariants") {
    return value === true || value === "true" || value === 1 || value === "1";
  }

  // Handle numeric fields
  const numericFields = ["totalAmount", "amountPaid", "balanceDue", "tara", "netWeight", "kilosAsignados", "kilosVendidos", "montoRecaudado", "quantity", "orderedQuantity", "deliveredQuantity", "unitPrice", "unitPriceQuoted", "unitPriceFinal", "subtotal", "unitCost", "totalCost", "basePrice", "price", "unitQuantity", "sortOrder", "amount", "syncAttempts"];
  if (numericFields.includes(fieldName)) {
    if (typeof value === "string") {
      return parseFloat(value) || 0;
    }
    return value;
  }

  // Handle date fields
  const dateFields = ["createdAt", "updatedAt", "saleDate", "purchaseDate", "deliveryDate", "orderDate", "cancelledAt", "refundDate", "joinedAt", "fecha"];
  if (dateFields.includes(fieldName)) {
    if (typeof value === "string") {
      // Convert ISO string to PostgreSQL timestamp format
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    return value;
  }

  // Handle JSON fields
  const jsonFields = ["confirmedSnapshot", "deliveredSnapshot", "calculatorSettings"];
  if (jsonFields.includes(fieldName)) {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }

  return value;
}

async function verifyMigration(pg: PGlite, backupData: Record<string, unknown[]>): Promise<{
  rowCounts: Record<string, { source: number; target: number; match: boolean }>;
  passed: boolean;
}> {
  const rowCounts: Record<string, { source: number; target: number; match: boolean }> = {};
  let allMatch = true;

  console.log("\n" + "=".repeat(60));
  console.log("VERIFICATION: Comparing row counts");
  console.log("=".repeat(60));

  for (const tableName of TABLES_TO_MIGRATE) {
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

    console.log(`  ${tableName}: source=${sourceCount}, target=${targetCount} ${match ? "✓" : "✗"}`);
  }

  return { rowCounts, passed: allMatch };
}

async function main() {
  const backupPath = process.argv[2] || "./backups/pre-migration-2026-03-12T14-07-08.json";
  const outputDir = "./reports";
  const outputPath = join(outputDir, "migration-report.json");

  console.log("=".repeat(60));
  console.log("TanStack DB to PGlite Migration");
  console.log("=".repeat(60));
  console.log(`\nLoading backup from: ${backupPath}`);

  if (!existsSync(backupPath)) {
    console.error(`Error: Backup file not found: ${backupPath}`);
    process.exit(1);
  }

  // Load backup
  let backupData: { metadata: { tables: string[] }; tables: Record<string, unknown[]> };
  try {
    const content = readFileSync(backupPath, "utf-8");
    backupData = JSON.parse(content);
    console.log(`Backup loaded successfully`);
    console.log(`Tables in backup: ${backupData.metadata.tables.join(", ")}`);
  } catch (error) {
    console.error(`Error loading backup: ${error}`);
    process.exit(1);
  }

  // Initialize PGlite with file-based storage (works in Node.js)
  console.log("\nInitializing PGlite database...");
  const pg = await PGlite.create({
    dataDir: "./data/pglite-migration",
  });

  // Create tables
  console.log("Creating tables...");
  await createTables(pg);

  // Run migration
  console.log("\nStarting migration...");
  const report = await migrateData(backupData.tables, pg);
  report.backupFile = backupPath;

  // Verify migration
  console.log("\nVerifying migration...");
  const verification = await verifyMigration(pg, backupData.tables);

  // Update report with verification
  const allPassed = report.summary.errors === 0 && verification.passed;
  report.summary.passed = allPassed;

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
  console.log(`Total Tables: ${report.summary.totalTables}`);
  console.log(`Total Records: ${report.summary.totalRecords}`);
  console.log(`Migrated Records: ${report.summary.migratedRecords}`);
  console.log(`Errors: ${report.summary.errors}`);
  console.log(`Duration: ${report.metadata.durationMs}ms`);
  console.log(`\nStatus: ${allPassed ? "✓ PASSED" : "✗ FAILED"}`);

  // Print table results
  console.log("\nTable Results:");
  console.log("-".repeat(60));
  for (const result of report.tableResults) {
    const status = result.passed ? "✓" : "✗";
    console.log(`${status} ${result.table}: ${result.migratedRecords}/${result.sourceRecords} records${result.errors > 0 ? ` (${result.errors} errors)` : ""}`);
  }

  // Print errors if any
  if (report.errors.length > 0) {
    console.log("\n" + "=".repeat(60));
    console.log("ERRORS");
    console.log("=".repeat(60));
    for (const error of report.errors.slice(0, 20)) {
      console.log(`[${error.table}] ${error.issue}`);
      console.log(`  Record ID: ${error.recordId}`);
    }
    if (report.errors.length > 20) {
      console.log(`... and ${report.errors.length - 20} more errors`);
    }
  }

  console.log("\n" + "=".repeat(60));

  // Close PGlite
  await pg.close();

  // Exit with error code if migration failed
  if (!allPassed) {
    console.log("\n⚠️  Migration FAILED!");
    process.exit(1);
  } else {
    console.log("\n✅ Migration PASSED!");
    process.exit(0);
  }
}

// Create tables in PGlite (simplified version of the one in db.ts)
async function createTables(pg: PGlite): Promise<void> {
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

  // Businesses (for reference)
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

  // Business Users (for reference)
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
}

main();
