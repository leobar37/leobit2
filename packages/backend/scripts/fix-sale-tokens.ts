/// Fix sale_tokens table - add expires_at column
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function fixSaleTokens() {
  console.log("Fixing sale_tokens table...");

  try {
    // Check if table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'sale_tokens'
      )
    `);

    const exists = tableExists[0]?.exists ?? false;

    if (!exists) {
      console.log("Creating sale_tokens table...");
      await db.execute(sql`
        CREATE TABLE sale_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
          token VARCHAR(12) NOT NULL UNIQUE,
          is_active BOOLEAN NOT NULL DEFAULT true,
          expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          last_used_at TIMESTAMP,
          CONSTRAINT unique_sale_token UNIQUE (sale_id)
        )
      `);
      console.log("✓ sale_tokens table created");
    } else {
      console.log("sale_tokens table exists, checking for expires_at column...");

      // Check if expires_at column exists
      const columnExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'sale_tokens' AND column_name = 'expires_at'
        )
      `);

      const hasExpiresAt = columnExists[0]?.exists ?? false;

      if (!hasExpiresAt) {
        console.log("Adding expires_at column...");
        await db.execute(sql`
          ALTER TABLE sale_tokens
          ADD COLUMN expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
        `);
        console.log("✓ expires_at column added");
      } else {
        console.log("✓ expires_at column already exists");
      }
    }

    // Create indexes
    console.log("Creating indexes...");
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_sale_tokens_token ON sale_tokens(token)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_sale_tokens_sale_id ON sale_tokens(sale_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_sale_tokens_is_active ON sale_tokens(is_active)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_sale_tokens_expires_at ON sale_tokens(expires_at)`);
    console.log("✓ Indexes created");

    // Set REPLICA IDENTITY for ElectricSQL
    console.log("Setting REPLICA IDENTITY FULL...");
    await db.execute(sql`ALTER TABLE sale_tokens REPLICA IDENTITY FULL`);
    console.log("✓ REPLICA IDENTITY set");

    // Verify final structure
    console.log("\nFinal table structure:");
    const columns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'sale_tokens'
      ORDER BY ordinal_position
    `);
    console.table(columns);

    console.log("\n✅ sale_tokens table fixed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to fix sale_tokens table:", error);
    process.exit(1);
  }
}

fixSaleTokens();
