#!/usr/bin/env bun

/**
 * Data Integrity Validation Script
 * 
 * Validates integrity of TanStack DB data before migration.
 * Checks for:
 * - Orphaned records (records referencing non-existent foreign keys)
 * - Invalid foreign key references
 * - Null constraints (required fields that are null)
 * - Data type consistency
 * - Duplicate primary keys
 * - Date field validity
 * 
 * Output: reports/pre-migration-integrity.json
 */

import { readFileSync, mkdirSync, existsSync, writeFileSync } from "fs";
import { dirname, join } from "path";

// Types
interface ValidationError {
  table: string;
  field: string;
  recordId: string;
  issue: string;
  severity: "critical" | "warning" | "info";
}

interface ValidationResult {
  table: string;
  totalRecords: number;
  errors: number;
  warnings: number;
  passed: boolean;
}

interface IntegrityReport {
  timestamp: string;
  backupFile: string;
  summary: {
    totalTables: number;
    totalRecords: number;
    criticalErrors: number;
    warnings: number;
    passed: boolean;
  };
  tableResults: ValidationResult[];
  errors: ValidationError[];
  metadata: {
    validationVersion: string;
    dataSource: string;
  };
}

// Foreign key relationships defined by schema
const FOREIGN_KEYS: Record<string, Array<{ field: string; references: string; required: boolean }>> = {
  businessUsers: [
    { field: "businessId", references: "businesses", required: true },
    { field: "userId", references: "users", required: true },
  ],
  customers: [
    { field: "businessId", references: "businesses", required: true },
  ],
  sales: [
    { field: "businessId", references: "businesses", required: true },
    { field: "sellerId", references: "businessUsers", required: true },
    { field: "clientId", references: "customers", required: false },
  ],
  saleItems: [
    { field: "saleId", references: "sales", required: true },
    { field: "productId", references: "products", required: true },
    { field: "variantId", references: "productVariants", required: false },
  ],
  abonos: [
    // relatedSaleId is optional - abonos can be standalone payments not tied to a sale
    { field: "relatedSaleId", references: "sales", required: false },
    { field: "customerId", references: "customers", required: true },
    { field: "businessId", references: "businesses", required: true },
    { field: "sellerId", references: "businessUsers", required: true },
  ],
  products: [
    { field: "businessId", references: "businesses", required: true },
    { field: "imageId", references: "assets", required: false },
  ],
  productVariants: [
    { field: "productId", references: "products", required: true },
    { field: "unitId", references: "productUnits", required: false },
  ],
  distribuciones: [
    { field: "businessId", references: "businesses", required: true },
    { field: "vendedorId", references: "businessUsers", required: true },
  ],
  distribucionItems: [
    { field: "distribucionId", references: "distribuciones", required: true },
    { field: "variantId", references: "productVariants", required: true },
  ],
  suppliers: [
    { field: "businessId", references: "businesses", required: true },
  ],
  purchases: [
    { field: "businessId", references: "businesses", required: true },
    { field: "supplierId", references: "suppliers", required: true },
  ],
  purchaseItems: [
    { field: "purchaseId", references: "purchases", required: true },
    { field: "productId", references: "products", required: true },
    { field: "variantId", references: "productVariants", required: false },
    { field: "unitId", references: "productUnits", required: false },
  ],
  files: [
    { field: "businessId", references: "businesses", required: false },
  ],
  assets: [
    { field: "businessId", references: "businesses", required: true },
  ],
  payments: [
    { field: "customerId", references: "customers", required: true },
    { field: "sellerId", references: "businessUsers", required: true },
    { field: "businessId", references: "businesses", required: true },
    { field: "relatedSaleId", references: "sales", required: false },
    { field: "proofImageId", references: "files", required: false },
  ],
};

// Required fields that should not be null
const REQUIRED_FIELDS: Record<string, string[]> = {
  businesses: ["id", "name", "ruc", "createdAt"],
  businessUsers: ["id", "businessId", "userId", "role", "joinedAt"],
  customers: ["id", "name", "businessId", "createdAt"],
  sales: ["id", "businessId", "sellerId", "saleType", "totalAmount", "status", "createdAt"],
  saleItems: ["id", "saleId", "productId", "quantity", "unitPrice", "subtotal"],
  abonos: ["id", "customerId", "businessId", "sellerId", "amount", "paymentMethod", "createdAt"],
  products: ["id", "name", "type", "unit", "basePrice", "businessId", "createdAt"],
  productVariants: ["id", "productId", "name"],
  distribuciones: ["id", "businessId", "vendedorId", "puntoVenta", "kilosAsignados", "fecha", "createdAt"],
  distribucionItems: ["id", "distribucionId", "variantId", "cantidadAsignada", "createdAt"],
  suppliers: ["id", "name", "businessId", "createdAt"],
  purchases: ["id", "businessId", "supplierId", "purchaseDate", "totalAmount", "createdAt"],
  purchaseItems: ["id", "purchaseId", "productId", "quantity", "unitCost", "totalCost", "createdAt"],
  files: ["id", "filename", "storagePath", "mimeType", "sizeBytes", "createdAt"],
  assets: ["id", "filename", "storagePath", "mimeType", "sizeBytes", "url", "businessId", "createdAt"],
  payments: ["id", "customerId", "sellerId", "businessId", "amount", "paymentMethod", "createdAt"],
};

// Date fields to validate
const DATE_FIELDS = ["createdAt", "updatedAt", "saleDate", "purchaseDate", "fecha", "orderDate", "deliveryDate", "cancelledAt", "refundDate", "joinedAt"];

// UUID fields to validate (excluding userId which uses Better Auth's format)
const UUID_FIELDS = ["id", "businessId", "clientId", "customerId", "productId", "variantId", "saleId", "purchaseId", "distribucionId", "supplierId", "vendedorId", "imageId", "proofImageId", "relatedSaleId", "receiptImageId", "unitId"];

// Better Auth uses non-UUID format for user IDs
const NON_UUID_FIELDS = ["userId", "sellerId"];

function isValidUUID(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

function isValidDate(value: unknown): boolean {
  if (!value) return false;
  if (value instanceof Date) return !isNaN(value.getTime());
  if (typeof value === "string") {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }
  return false;
}

function isValidISO8601(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  return iso8601Regex.test(value);
}

function validateData(data: Record<string, unknown[]>, backupPath: string): IntegrityReport {
  const errors: ValidationError[] = [];
  const tableResults: ValidationResult[] = [];
  let totalRecords = 0;

  // Build lookup sets for foreign key validation
  const lookupTables: Record<string, Set<string>> = {};
  
  for (const tableName of Object.keys(data)) {
    const records = data[tableName] || [];
    lookupTables[tableName] = new Set();
    
    for (const record of records) {
      if (record.id) {
        lookupTables[tableName].add(String(record.id));
      }
    }
  }

  // Validate each table
  for (const tableName of Object.keys(data)) {
    const records = data[tableName] || [];
    let tableErrors = 0;
    let tableWarnings = 0;
    
    for (const record of records) {
      const recordId = record.id || "unknown";

      // 1. Check for duplicate primary keys
      if (record.id) {
        const idCount = records.filter(r => r.id === record.id).length;
        if (idCount > 1) {
          errors.push({
            table: tableName,
            field: "id",
            recordId: String(recordId),
            issue: `Duplicate primary key: ${record.id}`,
            severity: "critical",
          });
          tableErrors++;
        }
      }

      // 2. Validate required fields (not null)
      const requiredFields = REQUIRED_FIELDS[tableName] || [];
      for (const field of requiredFields) {
        if (record[field] === null || record[field] === undefined) {
          errors.push({
            table: tableName,
            field: field,
            recordId: String(recordId),
            issue: `Required field '${field}' is null or undefined`,
            severity: "critical",
          });
          tableErrors++;
        }
      }

      // 3. Validate foreign keys
      const fkRules = FOREIGN_KEYS[tableName] || [];
      for (const fk of fkRules) {
        const fkValue = record[fk.field];
        
        if (fkValue === null || fkValue === undefined) {
          if (fk.required) {
            errors.push({
              table: tableName,
              field: fk.field,
              recordId: String(recordId),
              issue: `Required foreign key '${fk.field}' is null`,
              severity: "critical",
            });
            tableErrors++;
          }
          continue;
        }

        // Check if referenced table exists and has the record
        const referencedSet = lookupTables[fk.references];
        if (referencedSet && !referencedSet.has(String(fkValue))) {
          // Special case: users table is managed by Better Auth and may not be in backup
          if (fk.references !== "users") {
            errors.push({
              table: tableName,
              field: fk.field,
              recordId: String(recordId),
              issue: `Foreign key '${fk.field}' references non-existent ${fk.references}.id: ${fkValue}`,
              severity: "critical",
            });
            tableErrors++;
          }
        }
      }

      // 4. Validate date fields
      for (const field of DATE_FIELDS) {
        if (record[field] !== null && record[field] !== undefined) {
          if (!isValidISO8601(record[field])) {
            errors.push({
              table: tableName,
              field: field,
              recordId: String(recordId),
              issue: `Field '${field}' is not valid ISO 8601 date: ${record[field]}`,
              severity: "warning",
            });
            tableWarnings++;
          }
        }
      }

      // 5. Validate UUID fields
      for (const field of UUID_FIELDS) {
        if (record[field] !== null && record[field] !== undefined && record[field] !== "") {
          if (!isValidUUID(record[field])) {
            errors.push({
              table: tableName,
              field: field,
              recordId: String(recordId),
              issue: `Field '${field}' is not valid UUID: ${record[field]}`,
              severity: "warning",
            });
            tableWarnings++;
          }
        }
      }

      // 6. Validate data type consistency
      // Check that numeric fields are actually numeric strings
      const numericFields = ["totalAmount", "amountPaid", "balanceDue", "tara", "netWeight", "kilosAsignados", "kilosVendidos", "montoRecaudado", "quantity", "unitPrice", "subtotal", "unitCost", "advanceAmount", "basePrice"];
      for (const field of numericFields) {
        if (record[field] !== null && record[field] !== undefined) {
          const value = String(record[field]);
          if (isNaN(Number(value))) {
            errors.push({
              table: tableName,
              field: field,
              recordId: String(recordId),
              issue: `Field '${field}' should be numeric: ${value}`,
              severity: "warning",
            });
            tableWarnings++;
          }
        }
      }

      // 7. Validate enum fields
      // Define enum values for each table/field combination
      const enumFields: Record<string, Record<string, string[]>> = {
        // Product enums
        products: {
          type: ["pollo", "huevo", "otro"],
          unit: ["kg", "unidad"],
        },
        // Sale enums
        sales: {
          type: ["instant_sale", "pre_order"],
          saleType: ["contado", "credito"],
          status: ["draft", "active", "cancelled", "confirmed", "delivered"],
        },
        // Distribution enums
        distribuciones: {
          estado: ["activo", "cerrado", "en_ruta"],
          modo: ["estricto", "flexible"],
        },
        // Common enums
        syncOperations: {
          entity: ["customers", "sales", "sale_items", "abonos", "distribuciones", "orders", "order_items", "files", "assets", "suppliers", "purchases", "purchase_items"],
          operation: ["create", "update", "delete"],
        },
      };
      
      // Check each field's enum if defined
      for (const [table, fields] of Object.entries(enumFields)) {
        if (table !== tableName) continue;
        for (const [field, validValues] of Object.entries(fields)) {
          if (record[field] !== null && record[field] !== undefined) {
            const value = String(record[field]);
            if (!validValues.includes(value)) {
              errors.push({
                table: tableName,
                field: field,
                recordId: String(recordId),
                issue: `Field '${field}' has invalid enum value: ${value}. Valid values: ${validValues.join(", ")}`,
                severity: "warning",
              });
              tableWarnings++;
            }
          }
        }
      }
    }

    totalRecords += records.length;
    tableResults.push({
      table: tableName,
      totalRecords: records.length,
      errors: tableErrors,
      warnings: tableWarnings,
      passed: tableErrors === 0,
    });
  }

  const criticalErrors = errors.filter(e => e.severity === "critical").length;
  const warnings = errors.filter(e => e.severity === "warning").length;

  return {
    timestamp: new Date().toISOString(),
    backupFile: backupPath,
    summary: {
      totalTables: Object.keys(data).length,
      totalRecords,
      criticalErrors,
      warnings,
      passed: criticalErrors === 0,
    },
    tableResults,
    errors,
    metadata: {
      validationVersion: "1.0.0",
      dataSource: "postgresql",
    },
  };
}

function main() {
  const backupPath = process.argv[2] || "./backups/pre-migration-2026-03-12T14-07-08.json";
  const outputDir = "./reports";
  const outputPath = join(outputDir, "pre-migration-integrity.json");

  console.log("=".repeat(60));
  console.log("Data Integrity Validation");
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

  // Run validation
  console.log("\nRunning integrity validation...\n");
  const report = validateData(backupData.tables, backupPath);

  // Create output directory if it doesn't exist
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Write report
  writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\nIntegrity report written to: ${outputPath}`);

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("VALIDATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total Tables: ${report.summary.totalTables}`);
  console.log(`Total Records: ${report.summary.totalRecords}`);
  console.log(`Critical Errors: ${report.summary.criticalErrors}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`\nStatus: ${report.summary.passed ? "✓ PASSED" : "✗ FAILED"}`);

  // Print table results
  console.log("\nTable Results:");
  console.log("-".repeat(60));
  for (const result of report.tableResults) {
    const status = result.passed ? "✓" : "✗";
    console.log(`${status} ${result.table}: ${result.totalRecords} records, ${result.errors} errors, ${result.warnings} warnings`);
  }

  // Print critical errors
  const criticalErrors = report.errors.filter(e => e.severity === "critical");
  if (criticalErrors.length > 0) {
    console.log("\n" + "=".repeat(60));
    console.log("CRITICAL ERRORS");
    console.log("=".repeat(60));
    for (const error of criticalErrors.slice(0, 20)) {
      console.log(`[${error.table}.${error.field}] ${error.issue}`);
      console.log(`  Record ID: ${error.recordId}`);
    }
    if (criticalErrors.length > 20) {
      console.log(`... and ${criticalErrors.length - 20} more critical errors`);
    }
  }

  // Print warnings summary
  const warningsByTable: Record<string, number> = {};
  for (const error of report.errors.filter(e => e.severity === "warning")) {
    warningsByTable[error.table] = (warningsByTable[error.table] || 0) + 1;
  }
  
  if (Object.keys(warningsByTable).length > 0) {
    console.log("\n" + "=".repeat(60));
    console.log("WARNINGS BY TABLE");
    console.log("=".repeat(60));
    for (const [table, count] of Object.entries(warningsByTable)) {
      console.log(`  ${table}: ${count} warnings`);
    }
  }

  console.log("\n" + "=".repeat(60));
  
  // Exit with error code if validation failed
  if (!report.summary.passed) {
    console.log("\n⚠️  Validation FAILED - Critical errors found!");
    process.exit(1);
  } else {
    console.log("\n✅ Validation PASSED - No critical errors found!");
    process.exit(0);
  }
}

main();
