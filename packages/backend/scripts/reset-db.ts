import postgres from "postgres";
import { seedDatabase } from "../src/seed/index";

const connectionString = process.env.DATABASE_URL!;

async function resetDatabase() {
  console.log("🗑️  Resetting database...\n");

  if (process.env.NODE_ENV === "production") {
    throw new Error("Database reset cannot run in production environment");
  }

  // Create raw postgres client (without Drizzle) for raw SQL commands
  const client = postgres(connectionString, {
    max: 1,
    ssl: true,
  });

  try {
    // Drop and recreate public schema - this deletes ALL data and tables
    await client`DROP SCHEMA IF EXISTS public CASCADE`;
    await client`CREATE SCHEMA public`;

    console.log("✓ Database schema reset\n");

    // Close raw client
    await client.end();

    // Now run drizzle push to recreate tables from schema
    console.log("🔄 Creating tables from schema...\n");

    const { execSync } = require("child_process");
    execSync("bun run db:push", { stdio: "inherit", cwd: process.cwd() });

    console.log("✓ Tables created successfully!\n");

    // Run seed directly (no server required - uses Better Auth directly)
    console.log("🌱 Seeding database...\n");
    await seedDatabase();

    console.log("\n✅ Database reset and seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Database reset failed:", error);
    await client.end();
    process.exit(1);
  }
}

resetDatabase();
