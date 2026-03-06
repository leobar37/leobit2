import { db } from "../lib/db";
import { sales, saleItems, abonos, businesses, customers } from "../db/schema";
import { eq, sql, and, isNull } from "drizzle-orm";

interface ValidationIssue {
  businessId: string;
  businessName: string;
  type: "corrupted_sale" | "duplicate_init_abono" | "orphaned_abono" | "negative_balance";
  details: string;
  severity: "error" | "warning";
}

async function validateDataIntegrity() {
  console.log("🔍 Starting data integrity validation...\n");

  const issues: ValidationIssue[] = [];

  const allBusinesses = await db.select().from(businesses);
  console.log(`Found ${allBusinesses.length} businesses to validate\n`);

  for (const business of allBusinesses) {
    console.log(`🏢 Validating business: ${business.name} (${business.id.slice(0, 8)}...)`);

    await validateSalesIntegrity(business, issues);
    await validateAbonosIntegrity(business, issues);
    await validateCustomerBalances(business, issues);
  }

  printValidationReport(issues);
}

async function validateSalesIntegrity(business: typeof businesses.$inferSelect, issues: ValidationIssue[]) {
  const businessSales = await db
    .select({ id: sales.id, totalAmount: sales.totalAmount })
    .from(sales)
    .where(eq(sales.businessId, business.id));

  let corruptedCount = 0;

  for (const sale of businessSales) {
    const items = await db
      .select({ subtotal: saleItems.subtotal })
      .from(saleItems)
      .where(eq(saleItems.saleId, sale.id));

    const calculatedTotal = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
    const storedTotal = Number(sale.totalAmount);

    if (Math.abs(calculatedTotal - storedTotal) > 0.01) {
      corruptedCount++;
      issues.push({
        businessId: business.id,
        businessName: business.name,
        type: "corrupted_sale",
        details: `Sale ${sale.id.slice(0, 8)}... stored=${storedTotal.toFixed(2)}, calculated=${calculatedTotal.toFixed(2)}`,
        severity: "error",
      });
    }
  }

  if (corruptedCount > 0) {
    console.log(`  ❌ ${corruptedCount} corrupted sales found`);
  }
}

async function validateAbonosIntegrity(business: typeof businesses.$inferSelect, issues: ValidationIssue[]) {
  const initAbonos = await db
    .select({ id: abonos.id, referenceNumber: abonos.referenceNumber })
    .from(abonos)
    .where(and(eq(abonos.businessId, business.id), sql`${abonos.referenceNumber} LIKE 'init-sale:%'`));

  const referenceCount = new Map<string, number>();
  for (const abono of initAbonos) {
    if (!abono.referenceNumber) continue;
    referenceCount.set(abono.referenceNumber, (referenceCount.get(abono.referenceNumber) || 0) + 1);
  }

  let duplicateCount = 0;
  for (const [reference, count] of referenceCount) {
    if (count > 1) {
      duplicateCount++;
      issues.push({
        businessId: business.id,
        businessName: business.name,
        type: "duplicate_init_abono",
        details: `Reference ${reference} has ${count} duplicates`,
        severity: "error",
      });
    }
  }

  if (duplicateCount > 0) {
    console.log(`  ❌ ${duplicateCount} duplicate initial abonos found`);
  }

  const orphanedAbonos = await db
    .select({ id: abonos.id, referenceNumber: abonos.referenceNumber })
    .from(abonos)
    .leftJoin(customers, eq(abonos.clientId, customers.id))
    .where(and(eq(abonos.businessId, business.id), isNull(customers.id)));

  if (orphanedAbonos.length > 0) {
    console.log(`  ⚠️  ${orphanedAbonos.length} orphaned abonos found`);
    for (const abono of orphanedAbonos) {
      issues.push({
        businessId: business.id,
        businessName: business.name,
        type: "orphaned_abono",
        details: `Abono ${abono.id.slice(0, 8)}... has no associated customer`,
        severity: "warning",
      });
    }
  }
}

async function validateCustomerBalances(business: typeof businesses.$inferSelect, issues: ValidationIssue[]) {
  const businessCustomers = await db
    .select({ id: customers.id, name: customers.name })
    .from(customers)
    .where(eq(customers.businessId, business.id));

  let negativeBalanceCount = 0;

  for (const customer of businessCustomers) {
    const salesResult = await db
      .select({
        total: sql<string>`COALESCE(SUM(CASE WHEN ${sales.saleType} = 'credito' THEN ${sales.totalAmount} ELSE 0 END), '0')`,
      })
      .from(sales)
      .where(and(eq(sales.businessId, business.id), eq(sales.clientId, customer.id)));

    const paymentsResult = await db
      .select({ total: sql<string>`COALESCE(SUM(${abonos.amount}), '0')` })
      .from(abonos)
      .where(and(eq(abonos.businessId, business.id), eq(abonos.clientId, customer.id)));

    const totalSales = Number(salesResult[0]?.total ?? 0);
    const totalPayments = Number(paymentsResult[0]?.total ?? 0);
    const balanceDue = totalSales - totalPayments;

    if (balanceDue < 0) {
      negativeBalanceCount++;
      issues.push({
        businessId: business.id,
        businessName: business.name,
        type: "negative_balance",
        details: `Customer ${customer.name} has negative balance: ${balanceDue.toFixed(2)}`,
        severity: "error",
      });
    }
  }

  if (negativeBalanceCount > 0) {
    console.log(`  ❌ ${negativeBalanceCount} customers with negative balances`);
  }
}

function printValidationReport(issues: ValidationIssue[]) {
  console.log("\n" + "=".repeat(70));
  console.log("📊 DATA INTEGRITY VALIDATION REPORT");
  console.log("=".repeat(70));

  if (issues.length === 0) {
    console.log("\n✅ No data integrity issues found!");
    return;
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  console.log(`\n❌ Errors: ${errors.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);

  const groupedByType = issues.reduce((acc, issue) => {
    acc[issue.type] = acc[issue.type] || [];
    acc[issue.type].push(issue);
    return acc;
  }, {} as Record<string, ValidationIssue[]>);

  console.log("\n📋 Issues by type:");
  for (const [type, typeIssues] of Object.entries(groupedByType)) {
    console.log(`\n  ${type.replace(/_/g, " ").toUpperCase()} (${typeIssues.length}):`);
    for (const issue of typeIssues.slice(0, 5)) {
      console.log(`    - ${issue.details}`);
    }
    if (typeIssues.length > 5) {
      console.log(`    ... and ${typeIssues.length - 5} more`);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("💡 Run 'bun run db:fix-all-businesses' to fix these issues");
  console.log("=".repeat(70));
}

validateDataIntegrity().catch((error) => {
  console.error("❌ Validation error:", error);
  process.exit(1);
});
