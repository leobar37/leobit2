/**
 * Enable ElectricSQL Replication
 *
 * Sets REPLICA IDENTITY FULL for all tables that need to sync with ElectricSQL.
 * This is required for ElectricSQL to track changes and return proper headers.
 *
 * Run: cd packages/backend && bun run src/db/enable-electric-replication.ts
 */
import { db } from "../lib/db";

const tables = [
  "tags",
  "inventory",
  "customer_tags",
  "variant_inventory",
  "product_variants",
  "products",
  "customers",
  "sales",
  "abonos",
  "purchases",
  "purchase_items",
  "sale_items",
  "distribuciones",
  "distribucion_items",
  "closings",
];

async function main() {
  console.log("Enabling REPLICA IDENTITY FULL for ElectricSQL...\n");

  for (const table of tables) {
    try {
      console.log(`Setting REPLICA IDENTITY FULL for ${table}...`);
      await db.execute(`ALTER TABLE ${table} REPLICA IDENTITY FULL`);
      console.log(`  ✓ Done: ${table}`);
    } catch (error) {
      console.error(`  ✗ Error on ${table}:`, error);
    }
  }

  console.log("\nAll tables processed!");
}

main().catch(console.error);
