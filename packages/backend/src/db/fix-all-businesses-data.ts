import { db } from "../lib/db";
import { sales, saleItems, abonos, businesses, customers } from "../db/schema";
import { eq, sql, and, isNull, ne } from "drizzle-orm";

interface FixReport {
  businessId: string;
  businessName: string;
  corruptedSalesFixed: number;
  duplicateAbonosRemoved: number;
  orphanedAbonosFound: number;
  customersWithIncorrectBalance: number;
}

async function fixAllBusinessesData() {
  console.log("🔍 Starting comprehensive data integrity fix for all businesses...\n");

  const reports: FixReport[] = [];

  const allBusinesses = await db.select().from(businesses);
  console.log(`Found ${allBusinesses.length} businesses to process\n`);

  for (const business of allBusinesses) {
    console.log(`\n🏢 Processing business: ${business.name} (${business.id.slice(0, 8)}...)`);

    const report: FixReport = {
      businessId: business.id,
      businessName: business.name,
      corruptedSalesFixed: 0,
      duplicateAbonosRemoved: 0,
      orphanedAbonosFound: 0,
      customersWithIncorrectBalance: 0,
    };

    await fixCorruptedSales(business.id, report);
    await removeDuplicateInitialAbonos(business.id, report);
    await findOrphanedAbonos(business.id, report);
    await validateCustomerBalances(business.id, report);

    reports.push(report);
  }

  printSummary(reports);
}

async function fixCorruptedSales(businessId: string, report: FixReport) {
  const corruptedSales = await db
    .select({
      id: sales.id,
      currentTotal: sales.totalAmount,
    })
    .from(sales)
    .where(eq(sales.businessId, businessId));

  for (const sale of corruptedSales) {
    const items = await db
      .select({ subtotal: saleItems.subtotal })
      .from(saleItems)
      .where(eq(saleItems.saleId, sale.id));

    const calculatedTotal = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
    const currentTotal = Number(sale.currentTotal);

    if (Math.abs(calculatedTotal - currentTotal) > 0.01) {
      await db
        .update(sales)
        .set({ totalAmount: calculatedTotal.toFixed(2) })
        .where(eq(sales.id, sale.id));

      report.corruptedSalesFixed++;
    }
  }

  if (report.corruptedSalesFixed > 0) {
    console.log(`  ✅ Fixed ${report.corruptedSalesFixed} corrupted sales`);
  }
}

async function removeDuplicateInitialAbonos(businessId: string, report: FixReport) {
  const initAbonos = await db
    .select({
      id: abonos.id,
      referenceNumber: abonos.referenceNumber,
      createdAt: abonos.createdAt,
    })
    .from(abonos)
    .where(
      and(
        eq(abonos.businessId, businessId),
        sql`${abonos.referenceNumber} LIKE 'init-sale:%'`
      )
    );

  const referenceMap = new Map<string, typeof initAbonos>();

  for (const abono of initAbonos) {
    if (!abono.referenceNumber) continue;

    const existing = referenceMap.get(abono.referenceNumber) || [];
    existing.push(abono);
    referenceMap.set(abono.referenceNumber, existing);
  }

  for (const [reference, duplicates] of referenceMap) {
    if (duplicates.length > 1) {
      duplicates.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      const [, ...toDelete] = duplicates;

      for (const abono of toDelete) {
        await db.delete(abonos).where(eq(abonos.id, abono.id));
        report.duplicateAbonosRemoved++;
      }
    }
  }

  if (report.duplicateAbonosRemoved > 0) {
    console.log(`  ✅ Removed ${report.duplicateAbonosRemoved} duplicate initial abonos`);
  }
}

async function findOrphanedAbonos(businessId: string, report: FixReport) {
  const orphanedAbonos = await db
    .select({ id: abonos.id, referenceNumber: abonos.referenceNumber })
    .from(abonos)
    .leftJoin(customers, eq(abonos.clientId, customers.id))
    .where(and(eq(abonos.businessId, businessId), isNull(customers.id)));

  report.orphanedAbonosFound = orphanedAbonos.length;

  if (orphanedAbonos.length > 0) {
    console.log(`  ⚠️  Found ${orphanedAbonos.length} orphaned abonos (no associated customer)`);
    for (const abono of orphanedAbonos) {
      console.log(`     - Abono ${abono.id.slice(0, 8)}... (ref: ${abono.referenceNumber})`);
    }
  }
}

async function validateCustomerBalances(businessId: string, report: FixReport) {
  const businessCustomers = await db
    .select({ id: customers.id, name: customers.name })
    .from(customers)
    .where(eq(customers.businessId, businessId));

  for (const customer of businessCustomers) {
    const salesResult = await db
      .select({
        total: sql<string>`COALESCE(SUM(CASE WHEN ${sales.saleType} = 'credito' THEN ${sales.totalAmount} ELSE 0 END), '0')`,
      })
      .from(sales)
      .where(and(eq(sales.businessId, businessId), eq(sales.clientId, customer.id)));

    const paymentsResult = await db
      .select({ total: sql<string>`COALESCE(SUM(${abonos.amount}), '0')` })
      .from(abonos)
      .where(and(eq(abonos.businessId, businessId), eq(abonos.clientId, customer.id)));

    const totalSales = Number(salesResult[0]?.total ?? 0);
    const totalPayments = Number(paymentsResult[0]?.total ?? 0);
    const balanceDue = Math.max(totalSales - totalPayments, 0);

    if (balanceDue < 0) {
      console.log(`  ⚠️  Customer ${customer.name} has negative balance: ${balanceDue.toFixed(2)}`);
      report.customersWithIncorrectBalance++;
    }
  }
}

function printSummary(reports: FixReport[]) {
  console.log("\n" + "=".repeat(60));
  console.log("📊 DATA INTEGRITY FIX SUMMARY");
  console.log("=".repeat(60));

  const totals = {
    corruptedSales: reports.reduce((sum, r) => sum + r.corruptedSalesFixed, 0),
    duplicateAbonos: reports.reduce((sum, r) => sum + r.duplicateAbonosRemoved, 0),
    orphanedAbonos: reports.reduce((sum, r) => sum + r.orphanedAbonosFound, 0),
    incorrectBalances: reports.reduce((sum, r) => sum + r.customersWithIncorrectBalance, 0),
  };

  console.log(`\nTotal corrupted sales fixed: ${totals.corruptedSales}`);
  console.log(`Total duplicate abonos removed: ${totals.duplicateAbonos}`);
  console.log(`Total orphaned abonos found: ${totals.orphanedAbonos}`);
  console.log(`Customers with incorrect balances: ${totals.incorrectBalances}`);

  console.log("\n📋 Per-business breakdown:");
  for (const report of reports) {
    const hasIssues =
      report.corruptedSalesFixed > 0 ||
      report.duplicateAbonosRemoved > 0 ||
      report.orphanedAbonosFound > 0 ||
      report.customersWithIncorrectBalance > 0;

    if (hasIssues) {
      console.log(`\n  ${report.businessName}:`);
      if (report.corruptedSalesFixed > 0) console.log(`    - ${report.corruptedSalesFixed} corrupted sales fixed`);
      if (report.duplicateAbonosRemoved > 0) console.log(`    - ${report.duplicateAbonosRemoved} duplicate abonos removed`);
      if (report.orphanedAbonosFound > 0) console.log(`    - ${report.orphanedAbonosFound} orphaned abonos found`);
      if (report.customersWithIncorrectBalance > 0)
        console.log(`    - ${report.customersWithIncorrectBalance} customers with balance issues`);
    }
  }

  console.log("\n✅ Data integrity fix completed!");
}

fixAllBusinessesData().catch((error) => {
  console.error("❌ Error during data fix:", error);
  process.exit(1);
});
