/**
 * Fix Script: Populate business_id in product_variants from products
 * Run: cd packages/backend && bun run db:fix-variant-business-id
 */
import { db } from "../../lib/db";
import { products, productVariants } from "../../db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("=== Fix: Populate business_id in product_variants ===\n");

  // Get all variants with their product_id
  const variants = await db.select({
    id: productVariants.id,
    productId: productVariants.productId,
    name: productVariants.name,
    currentBusinessId: productVariants.businessId,
  }).from(productVariants);

  console.log(`Found ${variants.length} variants to check\n`);

  let updated = 0;
  let skipped = 0;

  for (const variant of variants) {
    // Get the product to find its business_id
    const [product] = await db.select({
      id: products.id,
      name: products.name,
      businessId: products.businessId,
    })
      .from(products)
      .where(eq(products.id, variant.productId));

    if (!product) {
      console.log(`⚠️ Variant ${variant.name} (${variant.id}): Product not found!`);
      skipped++;
      continue;
    }

    // If variant business_id is null or different, update it
    if (!variant.currentBusinessId || variant.currentBusinessId !== product.businessId) {
      await db.update(productVariants)
        .set({ businessId: product.businessId })
        .where(eq(productVariants.id, variant.id));

      console.log(`✓ Updated variant "${variant.name}" (${variant.id})`);
      console.log(`  Product: ${product.name} (${product.id})`);
      console.log(`  BusinessId: ${variant.currentBusinessId || 'NULL'} → ${product.businessId}\n`);
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (already correct): ${skipped}`);

  // Verify the fix
  console.log("\n=== Verification ===");
  const fixedVariants = await db.select({
    id: productVariants.id,
    name: productVariants.name,
    businessId: productVariants.businessId,
  }).from(productVariants);

  const withBusinessId = fixedVariants.filter(v => v.businessId !== null).length;
  const withoutBusinessId = fixedVariants.filter(v => v.businessId === null).length;

  console.log(`Variants with business_id: ${withBusinessId}`);
  console.log(`Variants without business_id: ${withoutBusinessId}`);

  console.log("\n=== Done ===");
}

main().catch(console.error);
