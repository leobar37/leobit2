/**
 * Check and fix ElectricSQL replication status
 * Verifies all tables are in the electric publication and have REPLICA IDENTITY FULL
 */
import { db } from "../lib/db";

const REQUIRED_TABLES = [
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
  console.log("🔍 Checking ElectricSQL replication status...\n");

  // Check if electric_publication exists
  const pubExistsResult = await db.execute(`
    SELECT 1 FROM pg_publication WHERE pubname = 'electric_publication'
  `);
  const existsRows = Array.isArray(pubExistsResult) ? pubExistsResult : (pubExistsResult.rows || []);

  if (existsRows.length === 0) {
    console.log("❌ Publication 'electric_publication' does NOT exist!");
    console.log("🔧 Creating publication...");

    try {
      await db.execute(`CREATE PUBLICATION electric_publication`);
      console.log("✅ Created electric_publication\n");
    } catch (err) {
      console.error("✗ Failed to create publication:", err);
      return;
    }
  }

  // Check which tables are in the publication
  const pubResult = await db.execute(`
    SELECT tablename FROM pg_publication_tables
    WHERE pubname = 'electric_publication'
  `);

  // Handle different result formats from drizzle
  const rows = Array.isArray(pubResult) ? pubResult : (pubResult.rows || []);
  const publishedTables = new Set(rows.map((r: { tablename: string }) => r.tablename));

  console.log("📋 Tables in electric_publication:");
  console.log([...publishedTables].sort().map(t => `  ✓ ${t}`).join('\n') || "  (none)");

  // Check replica identity for each table
  console.log("\n🔍 Checking REPLICA IDENTITY:");

  for (const table of REQUIRED_TABLES) {
    try {
      const identityResult = await db.execute(`
        SELECT relreplident
        FROM pg_class
        WHERE relname = '${table}'
      `);

      const identity = identityResult.rows[0]?.relreplident;
      const identityStatus = identity === 'f' ? '✓ FULL' : `✗ ${identity} (need FULL)`;
      console.log(`  ${table}: ${identityStatus}`);
    } catch (err) {
      console.log(`  ${table}: ERROR - ${err}`);
    }
  }

  // Find missing tables
  const missingTables = REQUIRED_TABLES.filter(t => !publishedTables.has(t));

  if (missingTables.length === 0) {
    console.log("\n✅ All tables are properly configured for Electric replication!");
    return;
  }

  console.log("\n❌ Missing from electric_publication:");
  missingTables.forEach(t => console.log(`  - ${t}`));

  // Fix missing tables
  console.log("\n🔧 Fixing missing tables...");

  for (const table of missingTables) {
    try {
      // Add to publication
      await db.execute(`
        ALTER PUBLICATION electric_publication ADD TABLE ${table}
      `);
      console.log(`  ✓ Added ${table} to electric_publication`);

      // Set replica identity
      await db.execute(`
        ALTER TABLE ${table} REPLICA IDENTITY FULL
      `);
      console.log(`  ✓ Set REPLICA IDENTITY FULL for ${table}`);
    } catch (err) {
      console.error(`  ✗ Error on ${table}:`, err);
    }
  }

  // Verify fix
  console.log("\n🔍 Verifying fixes...");
  const verifyResult = await db.execute(`
    SELECT tablename FROM pg_publication_tables
    WHERE pubname = 'electric_publication'
  `);
  const verifyRows = Array.isArray(verifyResult) ? verifyResult : (verifyResult.rows || []);
  const newPublishedTables = new Set(verifyRows.map((r: { tablename: string }) => r.tablename));
  const stillMissing = REQUIRED_TABLES.filter(t => !newPublishedTables.has(t));

  if (stillMissing.length === 0) {
    console.log("✅ All tables are now properly configured!");
  } else {
    console.log("❌ Still missing:", stillMissing.join(", "));
  }
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
