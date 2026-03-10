import { db } from "../src/lib/db";

async function migrate() {
  console.log("Renaming client_id to customer_id...");

  try {
    // Rename column in sales table
    await db.execute(`
      ALTER TABLE sales RENAME COLUMN client_id TO customer_id;
    `);
    console.log("✓ Renamed sales.client_id → sales.customer_id");

    // Rename column in abonos table
    await db.execute(`
      ALTER TABLE abonos RENAME COLUMN client_id TO customer_id;
    `);
    console.log("✓ Renamed abonos.client_id → abonos.customer_id");

    console.log("\nMigration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
