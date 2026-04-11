import postgres from "postgres";
import { config } from "dotenv";

config();

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: true,
  prepare: false,
});

const migrationSQL = `
-- Add version columns to all syncable entities for optimistic locking

-- files
ALTER TABLE files ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE files ADD COLUMN IF NOT EXISTS sync_status sync_status NOT NULL DEFAULT 'synced';
ALTER TABLE files ADD COLUMN IF NOT EXISTS sync_attempts INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_files_version ON files(version);

-- puntos_venta
ALTER TABLE puntos_venta ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE puntos_venta ADD COLUMN IF NOT EXISTS sync_status sync_status NOT NULL DEFAULT 'synced';
ALTER TABLE puntos_venta ADD COLUMN IF NOT EXISTS sync_attempts INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_puntos_venta_version ON puntos_venta(version);
`;

async function runMigration() {
  console.log("Applying missing columns migration...");

  try {
    await sql.unsafe(migrationSQL);
    console.log("✅ Migration applied successfully!");

    // Verify columns exist
    const filesColumns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'files' AND column_name IN ('version', 'sync_status', 'sync_attempts')
    `;
    console.log("Files table columns:", filesColumns.map((c) => c.column_name));

    const puntosColumns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'puntos_venta' AND column_name IN ('version', 'sync_status', 'sync_attempts')
    `;
    console.log("Puntos venta columns:", puntosColumns.map((c) => c.column_name));
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
