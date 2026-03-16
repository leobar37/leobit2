/**
 * Fix sale_items missing business_id
 */
import { db } from "../../lib/db";

async function fixSaleItems() {
  console.log("=== Fixing sale_items business_id ===\n");

  // Update sale_items to set business_id from parent sale
  await db.execute(`
    UPDATE sale_items
    SET business_id = s.business_id
    FROM sales s
    WHERE sale_items.sale_id = s.id
      AND sale_items.business_id IS NULL
  `);

  console.log("Update command executed");

  // Check for any remaining NULLs
  const checkResult = await db.execute(`
    SELECT COUNT(*) as count FROM sale_items WHERE business_id IS NULL
  `);

  console.log("Check result:", checkResult);

  // Check for any remaining NULLs using query
  const nullItems = await db.query.saleItems.findMany({
    where: (si, { isNull }) => isNull(si.businessId),
    limit: 10
  });

  if (nullItems.length > 0) {
    console.log(`⚠️ WARNING: ${nullItems.length} sale_items still have NULL business_id`);
    console.log("Sample:", nullItems[0]);
  } else {
    console.log("✅ All sale_items now have business_id");
  }
}

fixSaleItems()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
