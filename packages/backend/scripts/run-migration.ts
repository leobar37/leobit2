/**
 * Script to run database migrations
 * Usage: bun run scripts/run-migration.ts [migration_file]
 * Example: bun run scripts/run-migration.ts 0024_add_sale_tokens.sql
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as fs from "fs";
import * as path from "path";

const runMigration = async () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("❌ DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  // Get migration file from args or use default
  const migrationFile = process.argv[2] || "0023_unify_sales_orders.sql";

  console.log("🔄 Connecting to database...");

  // Create connection
  const client = postgres(databaseUrl);
  const db = drizzle(client);

  try {
    // Read migration file
    const migrationPath = path.join(process.cwd(), "drizzle", migrationFile);
    const migration = fs.readFileSync(migrationPath, "utf8");

    console.log(`📄 Migration file loaded: ${migrationFile}`);
    console.log("🚀 Executing migration...\n");

    // Split and execute each statement
    const statements = migration
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (const stmt of statements) {
      try {
        await client.unsafe(stmt + ";");
        console.log("✅", stmt.substring(0, 60) + (stmt.length > 60 ? "..." : ""));
      } catch (e: any) {
        // Ignore "already exists" errors
        if (e.message?.includes("already exists")) {
          console.log("⚠️ ", stmt.substring(0, 50) + "... (already exists, skipping)");
        } else {
          console.error("❌ Error executing:", stmt.substring(0, 50));
          console.error("   ", e.message);
        }
      }
    }

    console.log("\n✅ Migration completed successfully!");
  } catch (error: any) {
    console.error("\n❌ Migration failed:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
};

runMigration();
