/**
 * Migration: Add businessId to inventory, customer_tags, and variant_inventory tables
 *
 * This migration adds the businessId column to tables that need it for proper
 * ElectricSQL sync filtering.
 *
 * Run: cd packages/backend && bun run src/db/scripts/add-business-id-columns.ts
 */
import { db } from "../../lib/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Starting migration: Add businessId columns...\n");

  // Add businessId to inventory table
  // First, populate from products table via productId
  console.log("1. Adding business_id to inventory table...");

  try {
    // Check if column exists
    const columnCheck = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'inventory' AND column_name = 'business_id'
    `);

    if (columnCheck.length === 0) {
      // Add column as nullable first
      await db.execute(sql`
        ALTER TABLE inventory
        ADD COLUMN business_id UUID REFERENCES businesses(id)
      `);
      console.log("  ✓ Added business_id column (nullable) to inventory");

      // Populate from products
      await db.execute(sql`
        UPDATE inventory
        SET business_id = products.business_id
        FROM products
        WHERE inventory.product_id = products.id
      `);
      console.log("  ✓ Populated business_id from products");

      // Set NOT NULL (may fail if some are null)
      try {
        await db.execute(sql`
          ALTER TABLE inventory ALTER COLUMN business_id SET NOT NULL
        `);
        console.log("  ✓ Set NOT NULL constraint");
      } catch (e) {
        console.log("  ⚠ Could not set NOT NULL (some products have no business_id)");
      }
    } else {
      console.log("  ○ Column already exists, skipping");
    }
  } catch (error) {
    console.error("  ✗ Error on inventory:", error);
  }

  // Add businessId to customer_tags table
  console.log("\n2. Adding business_id to customer_tags table...");

  try {
    const columnCheck = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'customer_tags' AND column_name = 'business_id'
    `);

    if (columnCheck.length === 0) {
      await db.execute(sql`
        ALTER TABLE customer_tags
        ADD COLUMN business_id UUID REFERENCES businesses(id)
      `);
      console.log("  ✓ Added business_id column (nullable) to customer_tags");

      // Populate from customers
      await db.execute(sql`
        UPDATE customer_tags
        SET business_id = customers.business_id
        FROM customers
        WHERE customer_tags.customer_id = customers.id
      `);
      console.log("  ✓ Populated business_id from customers");

      // Set NOT NULL
      try {
        await db.execute(sql`
          ALTER TABLE customer_tags ALTER COLUMN business_id SET NOT NULL
        `);
        console.log("  ✓ Set NOT NULL constraint");
      } catch (e) {
        console.log("  ⚠ Could not set NOT NULL (some customers have no business_id)");
      }
    } else {
      console.log("  ○ Column already exists, skipping");
    }
  } catch (error) {
    console.error("  ✗ Error on customer_tags:", error);
  }

  // Add businessId to variant_inventory table
  console.log("\n3. Adding business_id to variant_inventory table...");

  try {
    const columnCheck = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'variant_inventory' AND column_name = 'business_id'
    `);

    if (columnCheck.length === 0) {
      await db.execute(sql`
        ALTER TABLE variant_inventory
        ADD COLUMN business_id UUID REFERENCES businesses(id)
      `);
      console.log("  ✓ Added business_id column (nullable) to variant_inventory");

      // Populate from product_variants via products
      await db.execute(sql`
        UPDATE variant_inventory
        SET business_id = products.business_id
        FROM product_variants, products
        WHERE variant_inventory.variant_id = product_variants.id
        AND product_variants.product_id = products.id
      `);
      console.log("  ✓ Populated business_id from product_variants -> products");

      // Set NOT NULL
      try {
        await db.execute(sql`
          ALTER TABLE variant_inventory ALTER COLUMN business_id SET NOT NULL
        `);
        console.log("  ✓ Set NOT NULL constraint");
      } catch (e) {
        console.log("  ⚠ Could not set NOT NULL (some variants have no business_id)");
      }
    } else {
      console.log("  ○ Column already exists, skipping");
    }
  } catch (error) {
    console.error("  ✗ Error on variant_inventory:", error);
  }

  // Add indexes
  console.log("\n4. Adding indexes...");

  try {
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_inventory_business_id ON inventory(business_id)
    `);
    console.log("  ✓ Added index on inventory.business_id");
  } catch (error) {
    console.log("  ○ Index may already exist:", error);
  }

  try {
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_customer_tags_business_id ON customer_tags(business_id)
    `);
    console.log("  ✓ Added index on customer_tags.business_id");
  } catch (error) {
    console.log("  ○ Index may already exist:", error);
  }

  try {
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_variant_inventory_business_id ON variant_inventory(business_id)
    `);
    console.log("  ✓ Added index on variant_inventory.business_id");
  } catch (error) {
    console.log("  ○ Index may already exist:", error);
  }

  console.log("\n✅ Migration completed!");
}

main().catch(console.error);
