import { db } from "./src/lib/db";

// Touch a product to trigger Electric replication
const result = await db.execute(`
  UPDATE products SET updated_at = NOW() WHERE id = 'b36819b3-db46-4919-a8c6-ebbfb6ee0374' RETURNING id, name
`);
const rows = Array.isArray(result) ? result : (result.rows || []);
console.log('Updated:', rows[0]);
process.exit(0);
