import { db } from "../src/lib/db";
import { customers, sales, abonos, products, productVariants, businesses, businessUsers } from "../src/db/schema";
import { user as users } from "../src/db/schema/auth";
import { eq, sql } from "drizzle-orm";

async function exportData() {
  const connectionString = process.env.DATABASE_URL!;
  
  const client = await import("postgres");
  const pool = client.default(connectionString);
  
  const result = await pool`
    SELECT u.email, b.name as business_name, b.ruc, b.address, b.phone, b.email as business_email
    FROM businesses b
    JOIN business_users bu ON bu.business_id = b.id
    JOIN users u ON u.id = bu.user_id
    WHERE u.email = 'cliente@avileo.com'
    LIMIT 1
  `;
  
  if (result.length === 0) {
    console.log("No se encontró el usuario cliente@avileo.com");
    return;
  }
  
  console.log("Business:", result[0]);
  
  await pool.end();
}

exportData().catch(console.error);
