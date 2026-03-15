import { db } from "./src/lib/db";

const BUSINESS_ID = "a2950eca-4c3f-473b-9e9d-3cb951e4f4ad";

console.log("Touching all data for business:", BUSINESS_ID);

// Tables with updated_at column
const tablesWithUpdatedAt = [
  'products',
  'customers',
  'sales',
  'inventory',
  'suppliers',
  'purchases',
  'closings',
  'distribuciones',
  'tags',
  'product_variants',
  'variant_inventory',
  'sale_items',
  'purchase_items',
  'distribucion_items',
  'customer_tags'
];

for (const table of tablesWithUpdatedAt) {
  try {
    // Check if table has business_id column
    const hasBusinessId = table !== 'customer_tags'; // customer_tags has no business_id

    if (hasBusinessId) {
      await db.execute(`
        UPDATE ${table} SET updated_at = NOW()
        WHERE business_id = '${BUSINESS_ID}'
      `);
    } else {
      await db.execute(`
        UPDATE ${table} SET updated_at = NOW()
      `);
    }
    console.log(`✅ ${table} updated`);
  } catch (e) {
    // Table might not exist or not have updated_at - skip
    console.log(`⚠️ ${table} skipped (no updated_at or doesn't exist)`);
  }
}

// Tables without updated_at - touch via another column if possible
const simpleTables = ['abonos'];
for (const table of simpleTables) {
  try {
    // Just do a no-op update to trigger replication
    await db.execute(`
      UPDATE ${table} SET id = id
      WHERE business_id = '${BUSINESS_ID}'
    `);
    console.log(`✅ ${table} touched (no-op update)`);
  } catch (e) {
    console.log(`⚠️ ${table} skipped`);
  }
}

console.log("\n🔄 Reload your browser to sync all data!");
process.exit(0);
