import { db } from "../lib/db";
import { sales, saleItems } from "../db/schema";
import { eq, sql, and } from "drizzle-orm";

async function fixCorruptedSales() {
  console.log("Finding corrupted sales...");
  
  // Find corrupted sales
  const corrupted = await db
    .select({
      id: sales.id,
      currentTotal: sales.totalAmount,
      saleType: sales.saleType,
      amountPaid: sales.amountPaid,
      balanceDue: sales.balanceDue,
    })
    .from(sales);
  
  let fixedCount = 0;
  
  for (const sale of corrupted) {
    // Calculate sum of items
    const items = await db
      .select({
        subtotal: saleItems.subtotal,
      })
      .from(saleItems)
      .where(eq(saleItems.saleId, sale.id!));
    
    const calculatedTotal = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
    const currentTotal = Number(sale.currentTotal);
    
    if (Math.abs(calculatedTotal - currentTotal) > 0.01) {
      console.log(`\nFixing sale ${sale.id?.slice(0, 8)}...`);
      console.log(`  Current: ${currentTotal.toFixed(2)}`);
      console.log(`  Calculated: ${calculatedTotal.toFixed(2)}`);
      console.log(`  Diff: ${(currentTotal - calculatedTotal).toFixed(2)}`);
      
      // Update total
      await db
        .update(sales)
        .set({ 
          totalAmount: calculatedTotal.toFixed(2),
          balanceDue: sale.saleType === "credito" 
            ? Math.max(calculatedTotal - Number(sale.amountPaid || 0), 0).toFixed(2)
            : "0.00"
        })
        .where(eq(sales.id, sale.id!));
      
      fixedCount++;
    }
  }
  
  console.log(`\n✅ Fixed ${fixedCount} corrupted sales`);
  
  // Verify
  console.log("\nVerifying fix...");
  const result = await db
    .select({
      id: sales.id,
      totalAmount: sales.totalAmount,
    })
    .from(sales)
    .orderBy(sql`${sales.createdAt} DESC`)
    .limit(3);
  
  for (const sale of result) {
    const items = await db
      .select({ subtotal: saleItems.subtotal })
      .from(saleItems)
      .where(eq(saleItems.saleId, sale.id!));
    
    const sum = items.reduce((s, i) => s + Number(i.subtotal), 0);
    console.log(`Sale ${sale.id?.slice(0, 8)}: stored=${sale.totalAmount}, sum=${sum.toFixed(2)}, diff=${Math.abs(Number(sale.totalAmount) - sum).toFixed(2)}`);
  }
}

fixCorruptedSales().catch(console.error);
