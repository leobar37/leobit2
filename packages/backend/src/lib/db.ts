import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../db/schema";

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  max_lifetime: 60 * 30,
  ssl: true,
  onnotice: (notice) => {
    console.debug("[PostgreSQL Notice]", notice);
  },
});

export const db = drizzle(client, { schema });

// Export schema for direct access
export * from "../db/schema";
