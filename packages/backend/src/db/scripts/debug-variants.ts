/**
 * Debug Script: Check if product_variants exist in the database
 * Run: cd packages/backend && bun run src/db/scripts/debug-variants.ts
 */
import { db } from "../../lib/db";
import { products, productVariants } from "../../db/schema";
import { eq, sql } from "drizzle-orm";

async function main() {
  console.log("=== Debug: Checking Product Variants ===\n");

  // 1. Check all products
  console.log("1. Products in database:");
  const allProducts = await db.select().from(products);
  console.log(`   Total: ${allProducts.length}`);
  allProducts.forEach(p => {
    console.log(`   - ${p.id}: ${p.name} (businessId: ${p.businessId})`);
  });

  console.log("\n2. Product Variants in database:");
  const allVariants = await db.select().from(productVariants);
  console.log(`   Total: ${allVariants.length}`);
  allVariants.forEach(v => {
    console.log(`   - ${v.id}: ${v.name} (productId: ${v.productId}, businessId: ${v.businessId})`);
  });

  // 3. Check variants grouped by product
  console.log("\n3. Variants grouped by product:");
  const productsWithVariants = await db.select({
    productId: products.id,
    productName: products.name,
    businessId: products.businessId,
    variantCount: sql<number>`count(${productVariants.id})`,
  })
    .from(products)
    .leftJoin(productVariants, eq(products.id, productVariants.productId))
    .groupBy(products.id, products.name, products.businessId);

  productsWithVariants.forEach(p => {
    console.log(`   - ${p.productName} (${p.productId}): ${p.variantCount} variants (businessId: ${p.businessId})`);
  });

  // 4. Check if business_id is populated
  console.log("\n4. Checking business_id in product_variants:");
  const variantsWithBusiness = await db.select({
    id: productVariants.id,
    name: productVariants.name,
    productId: productVariants.productId,
    businessId: productVariants.businessId,
  }).from(productVariants);

  variantsWithBusiness.forEach(v => {
    console.log(`   - ${v.name}: businessId = ${v.businessId || 'NULL'}`);
  });

  console.log("\n=== Done ===");
}

main().catch(console.error);
