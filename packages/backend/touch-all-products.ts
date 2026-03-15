import { db } from "./src/lib/db";

// Touch all products to trigger Electric replication
const BUSINESS_ID = "a2950eca-4c3f-473b-9e9d-3cb951e4f4ad";

console.log("Touching all products for business:", BUSINESS_ID);

const result = await db.execute(`
  UPDATE products SET updated_at = NOW()
  WHERE business_id = '${BUSINESS_ID}'
  RETURNING id, name
`);

const rows = Array.isArray(result) ? result : (result.rows || []);
console.log(`Updated ${rows.length} products:`);
rows.forEach((p: { id: string; name: string }) => console.log(`  - ${p.name} (${p.id})`));

process.exit(0);
