/**
 * Script to test the purchase query that fails during sync
 * Run with: cd packages/backend && bun run scripts/test-purchase-query.ts
 */

import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

const PURCHASE_ID = "2009989a-eca3-4ca1-b5fb-eee37a310266";
const BUSINESS_ID = "a2950eca-4c3f-473b-9e9d-3cb951e4f4ad";

async function testQuery() {
  console.log("🔍 Testing purchase query...\n");
  console.log(`Purchase ID: ${PURCHASE_ID}`);
  console.log(`Business ID: ${BUSINESS_ID}\n`);

  // Test 1: Simple query on purchases table
  console.log("📋 Test 1: Simple query on purchases table");
  try {
    const result = await db.execute(sql`
      SELECT id, business_id, supplier_id, purchase_date, total_amount, status
      FROM purchases
      WHERE id = ${PURCHASE_ID} AND business_id = ${BUSINESS_ID}
    `);
    console.log("  ✅ Success:", result);
  } catch (error) {
    console.log("  ❌ Error:", error);
  }

  // Test 2: Query with supplier join
  console.log("\n📋 Test 2: Query with supplier join");
  try {
    const result = await db.execute(sql`
      SELECT p.*, s.id as supplier_id, s.name as supplier_name
      FROM purchases p
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.id = ${PURCHASE_ID} AND p.business_id = ${BUSINESS_ID}
    `);
    console.log("  ✅ Success:", result);
  } catch (error) {
    console.log("  ❌ Error:", error);
  }

  // Test 3: Query with items and product
  console.log("\n📋 Test 3: Query with items and product");
  try {
    const result = await db.execute(sql`
      SELECT pi.*, pr.name as product_name, pr.sync_status as product_sync_status
      FROM purchase_items pi
      JOIN products pr ON pr.id = pi.product_id
      WHERE pi.purchase_id = ${PURCHASE_ID}
    `);
    console.log("  ✅ Success, rows:", (result as any).length);
  } catch (error) {
    console.log("  ❌ Error:", error);
  }

  // Test 4: Query with variant
  console.log("\n📋 Test 4: Query with variant");
  try {
    const result = await db.execute(sql`
      SELECT pv.*, pv.sync_status as variant_sync_status
      FROM purchase_items pi
      JOIN product_variants pv ON pv.id = pi.variant_id
      WHERE pi.purchase_id = ${PURCHASE_ID}
    `);
    console.log("  ✅ Success, rows:", (result as any).length);
  } catch (error) {
    console.log("  ❌ Error:", error);
  }

  // Test 5: The full complex lateral join query
  console.log("\n📋 Test 5: Full lateral join query (this is what Drizzle generates)");
  try {
    const result = await db.execute(sql`
      SELECT "purchases"."id", "purchases"."business_id", "purchases"."supplier_id",
             "purchases"."purchase_date", "purchases"."total_amount", "purchases"."status",
             "purchases"."invoice_number", "purchases"."receipt_image_id", "purchases"."notes",
             "purchases"."sync_status", "purchases"."sync_attempts", "purchases"."sync_group_id",
             "purchases"."created_at", "purchases"."updated_at",
             "purchases_supplier"."data" as "supplier",
             "purchases_items"."data" as "items"
      FROM "purchases" "purchases"
      LEFT JOIN LATERAL (
        SELECT json_build_array(
          "purchases_supplier"."id", "purchases_supplier"."business_id",
          "purchases_supplier"."name", "purchases_supplier"."type",
          "purchases_supplier"."sync_status", "purchases_supplier"."sync_attempts"
        ) as "data"
        FROM (
          SELECT * FROM "suppliers" "purchases_supplier"
          WHERE "purchases_supplier"."id" = "purchases"."supplier_id" LIMIT 1
        ) "purchases_supplier"
      ) "purchases_supplier" ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(
          json_agg(
            json_build_array(
              "purchases_items"."id", "purchases_items"."business_id",
              "purchases_items"."purchase_id", "purchases_items"."product_id",
              "purchases_items"."variant_id", "purchases_items"."quantity",
              "purchases_items"."unit_cost", "purchases_items"."total_cost",
              "purchases_items"."sync_status", "purchases_items"."sync_attempts",
              "purchases_items"."created_at", "purchases_items"."updated_at",
              "purchases_items_product"."data", "purchases_items_variant"."data"
            )
          ), '[]'::json
        ) as "data"
        FROM "purchase_items" "purchases_items"
        LEFT JOIN LATERAL (
          SELECT json_build_array(
            "purchases_items_product"."id", "purchases_items_product"."business_id",
            "purchases_items_product"."name", "purchases_items_product"."type",
            "purchases_items_product"."sync_status", "purchases_items_product"."sync_attempts"
          ) as "data"
          FROM (
            SELECT * FROM "products" "purchases_items_product"
            WHERE "purchases_items_product"."id" = "purchases_items"."product_id" LIMIT 1
          ) "purchases_items_product"
        ) "purchases_items_product" ON true
        LEFT JOIN LATERAL (
          SELECT json_build_array(
            "purchases_items_variant"."id", "purchases_items_variant"."product_id",
            "purchases_items_variant"."business_id", "purchases_items_variant"."name",
            "purchases_items_variant"."sku", "purchases_items_variant"."sync_status",
            "purchases_items_variant"."sync_attempts"
          ) as "data"
          FROM (
            SELECT * FROM "product_variants" "purchases_items_variant"
            WHERE "purchases_items_variant"."id" = "purchases_items"."variant_id" LIMIT 1
          ) "purchases_items_variant"
        ) "purchases_items_variant" ON true
        WHERE "purchases_items"."purchase_id" = "purchases"."id"
      ) "purchases_items" ON true
      WHERE ("purchases"."id" = ${PURCHASE_ID} AND "purchases"."business_id" = ${BUSINESS_ID})
      LIMIT 1
    `);
    console.log("  ✅ Success");
    console.log("  Result:", JSON.stringify(result, null, 2)?.slice(0, 500));
  } catch (error: any) {
    console.log("  ❌ Error:", error?.message || error);
    if (error?.code) console.log("  PostgreSQL Error Code:", error.code);
    if (error?.routine) console.log("  PostgreSQL Routine:", error.routine);
  }

  console.log("\n✅ Test complete!");
  process.exit(0);
}

testQuery().catch(console.error);
