#!/usr/bin/env bun

/**
 * Verification Script: Post-Migration Data Integrity Check
 * 
 * Verifies data integrity after migrating from TanStack DB to PGlite.
 * Compares record counts and samples data from both sources.
 * 
 * Usage: bun scripts/verify-migration.ts [--detailed]
 */

import { PGlite } from "@electric-sql/pglite";
import { electricSync } from "@electric-sql/pglite-sync";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const args = process.argv.slice(2);
const isDetailed = args.includes("--detailed");

// Types
interface VerificationReport {
  timestamp: string;
  summary: {
    totalCollections: number;
    matchedCollections: number;
    mismatchedCollections: number;
    totalSourceRecords: number;
    totalTargetRecords: number;
    passed: boolean;
  };
  collectionResults: {
    collection: string;
    table: string;
    sourceCount: number;
    targetCount: number;
    match: boolean;
    sampleChecks: {
      total: number;
      passed: number;
      failed: number;
    };
  }[];
  discrepancies: {
    collection: string;
    type: "count_mismatch" | "sample_mismatch" | "error";
    details: string;
    expected?: number;
    actual?: number;
  }[];
  metadata: {
    verificationVersion: string;
    startTime: string;
    endTime: string;
    durationMs: number;
  };
}

// Collections and their corresponding PGlite tables
const COLLECTIONS = [
  { name: "customers", table: "customers", idField: "id" },
  { name: "sales", table: "sales", idField: "id" },
  { name: "sale_items", table: "sale_items", idField: "id" },
  { name: "abonos", table: "abonos", idField: "id" },
  { name: "products", table: "products", idField: "id" },
  { name: "product_variants", table: "product_variants", idField: "id" },
  { name: "suppliers", table: "suppliers", idField: "id" },
  { name: "purchases", table: "purchases", idField: "id" },
  { name: "purchase_items", table: "purchase_items", idField: "id" },
  { name: "distribuciones", table: "distribuciones", idField: "id" },
  { name: "distribucion_items", table: "distribucion_items", idField: "id" },
  { name: "files", table: "files", idField: "id" },
  { name: "assets", table: "assets", idField: "id" },
  { name: "businesses", table: "businesses", idField: "id" },
  { name: "business_users", table: "business_users", idField: "id" },
];

// Read TanStack collections from IndexedDB
async function readTanStackCollections(): Promise<Record<string, unknown[]>> {
  return new Promise((resolve, reject) => {
    const collections: Record<string, unknown[]> = {};
    
    const request = indexedDB.open("tanstack_db");
    
    request.onerror = () => reject(new Error("Failed to open TanStack DB"));
    
    request.onsuccess = () => {
      const db = request.result;
      const storeNames = Array.from(db.objectStoreNames);
      
      if (storeNames.length === 0) {
        resolve(collections);
        return;
      }
      
      let storesProcessed = 0;
      
      for (const storeName of storeNames) {
        try {
          const transaction = db.transaction(storeName, "readonly");
          const store = transaction.objectStore(storeName);
          const getAllRequest = store.getAll();
          
          getAllRequest.onsuccess = () => {
            collections[storeName] = getAllRequest.result;
            storesProcessed++;
            
            if (storesProcessed === storeNames.length) {
              db.close();
              resolve(collections);
            }
          };
          
          getAllRequest.onerror = () => {
            storesProcessed++;
            if (storesProcessed === storeNames.length) {
              db.close();
              resolve(collections);
            }
          };
        } catch {
          storesProcessed++;
          if (storesProcessed === storeNames.length) {
            db.close();
            resolve(collections);
          }
        }
      }
    };
    
    request.onupgradeneeded = () => {
      resolve({});
    };
  });
}

// Get count from PGlite table
async function getTableCount(pg: PGlite, tableName: string): Promise<number> {
  try {
    const result = await pg.exec(`SELECT COUNT(*) as count FROM ${tableName}`);
    if (result && result.length > 0 && result[0].rows && result[0].rows.length > 0) {
      return Number(result[0].rows[0].count);
    }
    return 0;
  } catch {
    return 0;
  }
}

// Sample and verify records
async function verifySampleRecords(
  pg: PGlite,
  tableName: string,
  sourceRecords: unknown[],
  sampleSize: number
): Promise<{ total: number; passed: number; failed: number }> {
  const results = { total: 0, passed: 0, failed: 0 };
  
  if (sourceRecords.length === 0) {
    return results;
  }
  
  // Sample random records
  const sampleIndices = new Set<number>();
  while (sampleIndices.size < Math.min(sampleSize, sourceRecords.length)) {
    sampleIndices.add(Math.floor(Math.random() * sourceRecords.length));
  }
  
  results.total = sampleIndices.size;
  
  for (const index of sampleIndices) {
    const sourceRecord = sourceRecords[index] as Record<string, unknown>;
    const id = sourceRecord.id as string;
    
    if (!id) {
      results.failed++;
      continue;
    }
    
    try {
      const result = await pg.exec(`SELECT * FROM ${tableName} WHERE id = '${id}'`);
      
      if (result && result.length > 0 && result[0].rows && result[0].rows.length > 0) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch {
      results.failed++;
    }
  }
  
  return results;
}

// Verify sync_status is set correctly
async function verifySyncStatus(pg: PGlite, tableName: string): Promise<{
  synced: number;
  pending: number;
  error: number;
  total: number;
}> {
  try {
    const result = await pg.exec(`
      SELECT 
        sync_status,
        COUNT(*) as count
      FROM ${tableName}
      GROUP BY sync_status
    `);
    
    const status = { synced: 0, pending: 0, error: 0, total: 0 };
    
    if (result && result.length > 0 && result[0].rows) {
      for (const row of result[0].rows) {
        const count = Number(row.count);
        status.total += count;
        
        if (row.sync_status === "synced") {
          status.synced += count;
        } else if (row.sync_status === "pending") {
          status.pending += count;
        } else if (row.sync_status === "error") {
          status.error += count;
        }
      }
    }
    
    return status;
  } catch {
    return { synced: 0, pending: 0, error: 0, total: 0 };
  }
}

// Main verification function
async function verifyMigration(
  collections: Record<string, unknown[]>,
  pg: PGlite
): Promise<VerificationReport> {
  const startTime = new Date().toISOString();
  const collectionResults: VerificationReport["collectionResults"] = [];
  const discrepancies: VerificationReport["discrepancies"] = [];
  
  let totalSourceRecords = 0;
  let totalTargetRecords = 0;
  let matchedCollections = 0;
  let mismatchedCollections = 0;
  
  console.log(`\nVerifying ${COLLECTIONS.length} collections...`);
  console.log("=".repeat(70));
  
  for (const { name, table, idField } of COLLECTIONS) {
    const sourceRecords = collections[name] || [];
    const sourceCount = sourceRecords.length;
    const targetCount = await getTableCount(pg, table);
    
    totalSourceRecords += sourceCount;
    totalTargetRecords += targetCount;
    
    const countMatch = sourceCount === targetCount;
    
    let sampleChecks = { total: 0, passed: 0, failed: 0 };
    
    if (isDetailed && sourceCount > 0 && countMatch) {
      console.log(`  ${name}: Verifying sample records...`);
      sampleChecks = await verifySampleRecords(pg, table, sourceRecords, 10);
    }
    
    collectionResults.push({
      collection: name,
      table,
      sourceCount,
      targetCount,
      match: countMatch,
      sampleChecks,
    });
    
    if (countMatch) {
      matchedCollections++;
      console.log(`  ✓ ${name}: ${sourceCount} records (matched)`);
      
      if (isDetailed && sourceCount > 0) {
        const status = await verifySyncStatus(pg, table);
        console.log(`    Sync status: ${status.synced} synced, ${status.pending} pending, ${status.error} error`);
        
        if (sampleChecks.total > 0) {
          const sampleStatus = sampleChecks.failed === 0 ? "✓" : "⚠";
          console.log(`    ${sampleStatus} Sample verification: ${sampleChecks.passed}/${sampleChecks.total} passed`);
        }
      }
    } else {
      mismatchedCollections++;
      console.log(`  ✗ ${name}: ${sourceCount} (source) ≠ ${targetCount} (target)`);
      discrepancies.push({
        collection: name,
        type: "count_mismatch",
        details: `Record count mismatch: expected ${sourceCount}, got ${targetCount}`,
        expected: sourceCount,
        actual: targetCount,
      });
    }
  }
  
  const endTime = new Date().toISOString();
  const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
  
  const passed = mismatchedCollections === 0 && discrepancies.length === 0;
  
  return {
    timestamp: new Date().toISOString(),
    summary: {
      totalCollections: COLLECTIONS.length,
      matchedCollections,
      mismatchedCollections,
      totalSourceRecords,
      totalTargetRecords,
      passed,
    },
    collectionResults,
    discrepancies,
    metadata: {
      verificationVersion: "1.0.0",
      startTime,
      endTime,
      durationMs,
    },
  };
}

// Main function
async function main() {
  const outputDir = "./reports";
  const outputPath = join(outputDir, "verification-report.json");
  
  console.log("=".repeat(70));
  console.log("Migration Verification");
  console.log("=".repeat(70));
  
  if (isDetailed) {
    console.log("\n📋 Detailed verification enabled\n");
  }
  
  // Initialize PGlite
  console.log("Connecting to PGlite database...");
  const pg = await PGlite.create({
    dataDir: "./data/pglite-migration",
    extensions: {
      electric: electricSync(),
    },
  });
  
  // Read TanStack collections
  console.log("Reading TanStack DB collections...");
  let collections: Record<string, unknown[]>;
  try {
    collections = await readTanStackCollections();
    const totalRecords = Object.values(collections).reduce((sum, recs) => sum + recs.length, 0);
    console.log(`Found ${Object.keys(collections).length} collections with ${totalRecords} total records\n`);
  } catch (err) {
    console.error(`Error reading TanStack collections: ${err}`);
    await pg.close();
    process.exit(1);
  }
  
  if (Object.keys(collections).length === 0) {
    console.log("No TanStack collections found. Nothing to verify.");
    await pg.close();
    process.exit(0);
  }
  
  // Run verification
  const report = await verifyMigration(collections, pg);
  
  // Create output directory
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  // Write report
  writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\nVerification report written to: ${outputPath}`);
  
  // Print summary
  console.log("\n" + "=".repeat(70));
  console.log("VERIFICATION SUMMARY");
  console.log("=".repeat(70));
  console.log(`Total Collections: ${report.summary.totalCollections}`);
  console.log(`Matched: ${report.summary.matchedCollections} ✓`);
  console.log(`Mismatched: ${report.summary.mismatchedCollections} ${report.summary.mismatchedCollections > 0 ? "✗" : "✓"}`);
  console.log(`Total Source Records: ${report.summary.totalSourceRecords}`);
  console.log(`Total Target Records: ${report.summary.totalTargetRecords}`);
  console.log(`Duration: ${report.metadata.durationMs}ms`);
  
  const status = report.summary.passed ? "✅ PASSED" : "❌ FAILED";
  console.log(`\nStatus: ${status}`);
  
  // Print discrepancies if any
  if (report.discrepancies.length > 0) {
    console.log("\n" + "=".repeat(70));
    console.log("DISCREPANCIES");
    console.log("=".repeat(70));
    for (const disc of report.discrepancies) {
      console.log(`[${disc.collection}] ${disc.type}`);
      console.log(`  ${disc.details}`);
    }
  }
  
  // Close PGlite
  await pg.close();
  
  console.log("\n" + "=".repeat(70));
  
  // Exit with appropriate code
  if (report.summary.passed) {
    console.log("\n✅ Verification PASSED! Migration successful.");
    process.exit(0);
  } else {
    console.log("\n❌ Verification FAILED! Please review the discrepancies.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
