/**
 * Migration script for sale_tokens table
 */
import postgres from "postgres";

const runMigration = async () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("❌ DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  console.log("🔄 Connecting to database...");

  const sql = postgres(databaseUrl);

  try {
    console.log("🚀 Creating sale_tokens table...");

    // Create table
    await sql`
      CREATE TABLE IF NOT EXISTS sale_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        token VARCHAR(12) NOT NULL UNIQUE,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_used_at TIMESTAMP,
        CONSTRAINT unique_sale_token UNIQUE (sale_id)
      )
    `;
    console.log("✅ Table created");

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_sale_tokens_token ON sale_tokens(token)`;
    console.log("✅ Index idx_sale_tokens_token created");

    await sql`CREATE INDEX IF NOT EXISTS idx_sale_tokens_sale_id ON sale_tokens(sale_id)`;
    console.log("✅ Index idx_sale_tokens_sale_id created");

    await sql`CREATE INDEX IF NOT EXISTS idx_sale_tokens_is_active ON sale_tokens(is_active)`;
    console.log("✅ Index idx_sale_tokens_is_active created");

    // Set replica identity
    await sql`ALTER TABLE sale_tokens REPLICA IDENTITY FULL`;
    console.log("✅ REPLICA IDENTITY FULL set");

    // Add comment
    await sql`COMMENT ON TABLE sale_tokens IS 'Tokens for sharing sales with customers via public URLs'`;
    console.log("✅ Comment added");

    console.log("\n✅ Migration completed successfully!");
  } catch (error: any) {
    console.error("\n❌ Migration failed:", error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
};

runMigration();
