/**
 * Check products for a specific business
 * Run: cd packages/backend && bun run src/db/check-business-products.ts
 */
import { db } from "../lib/db";

const BUSINESS_ID = "a2950eca-4c3f-473b-9e9d-3cb951e4f4ad";

async function main() {
  console.log(`🔍 Checking business: ${BUSINESS_ID}\n`);

  // Check if business exists
  const businessResult = await db.execute(`
    SELECT id, name, is_active
    FROM businesses
    WHERE id = '${BUSINESS_ID}'
  `);
  const businessRows = Array.isArray(businessResult) ? businessResult : (businessResult.rows || []);

  if (businessRows.length === 0) {
    console.log("❌ Business NOT FOUND in database!");
    return;
  }

  const business = businessRows[0];
  console.log("✅ Business found:");
  console.log(`   ID: ${business.id}`);
  console.log(`   Name: ${business.name}`);
  console.log(`   Active: ${business.is_active}`);
  console.log();

  // Count products for this business
  const countResult = await db.execute(`
    SELECT COUNT(*) as total
    FROM products
    WHERE business_id = '${BUSINESS_ID}'
  `);
  const countRows = Array.isArray(countResult) ? countResult : (countResult.rows || []);
  const productCount = parseInt(countRows[0]?.total || "0", 10);

  console.log(`📦 Products for this business: ${productCount}`);
  console.log();

  if (productCount === 0) {
    console.log("❌ No products found for this business!");
    console.log();

    // Check if there are ANY products in the database
    const anyProductsResult = await db.execute(`
      SELECT business_id, COUNT(*) as count
      FROM products
      GROUP BY business_id
    `);
    const anyProductsRows = Array.isArray(anyProductsResult) ? anyProductsResult : (anyProductsResult.rows || []);

    if (anyProductsRows.length > 0) {
      console.log("Products exist for OTHER businesses:");
      for (const row of anyProductsRows) {
        console.log(`   Business ${row.business_id}: ${row.count} products`);
      }
    } else {
      console.log("❌ No products exist in the entire database!");
    }
    return;
  }

  // Show products
  const productsResult = await db.execute(`
    SELECT
      id,
      name,
      type,
      base_price,
      cost_price,
      is_active,
      has_variants,
      sync_status,
      created_at,
      updated_at
    FROM products
    WHERE business_id = '${BUSINESS_ID}'
    ORDER BY created_at DESC
  `);
  const products = Array.isArray(productsResult) ? productsResult : (productsResult.rows || []);

  console.log("📋 Product list:");
  console.log("-".repeat(100));
  for (const p of products) {
    console.log(`ID: ${p.id}`);
    console.log(`  Name: ${p.name}`);
    console.log(`  Type: ${p.type}, Base: ${p.base_price}, Cost: ${p.cost_price}`);
    console.log(`  Active: ${p.is_active}, Has Variants: ${p.has_variants}`);
    console.log(`  Sync Status: ${p.sync_status}`);
    console.log(`  Created: ${p.created_at}, Updated: ${p.updated_at}`);
    console.log();
  }

  // Check if products are in electric_publication
  const pubResult = await db.execute(`
    SELECT tablename
    FROM pg_publication_tables
    WHERE pubname = 'electric_publication' AND tablename = 'products'
  `);
  const pubRows = Array.isArray(pubResult) ? pubResult : (pubResult.rows || []);

  if (pubRows.length > 0) {
    console.log("✅ Products table is in electric_publication");
  } else {
    console.log("❌ Products table is NOT in electric_publication!");
  }

  // Check replica identity
  const identityResult = await db.execute(`
    SELECT relreplident
    FROM pg_class
    WHERE relname = 'products'
  `);
  const identityRows = Array.isArray(identityResult) ? identityResult : (identityResult.rows || []);
  const identity = identityRows[0]?.relreplident;

  if (identity === 'f') {
    console.log("✅ Products has REPLICA IDENTITY FULL");
  } else {
    console.log(`❌ Products REPLICA IDENTITY: ${identity} (should be 'f' for FULL)`);
  }

  // Check product_variants for these products
  const variantCountResult = await db.execute(`
    SELECT COUNT(*) as total
    FROM product_variants
    WHERE product_id IN (
      SELECT id FROM products WHERE business_id = '${BUSINESS_ID}'
    )
  `);
  const variantCountRows = Array.isArray(variantCountResult) ? variantCountResult : (variantCountResult.rows || []);
  const variantCount = parseInt(variantCountRows[0]?.total || "0", 10);

  console.log();
  console.log(`🔧 Product variants for these products: ${variantCount}`);
}

main().catch(console.error);
