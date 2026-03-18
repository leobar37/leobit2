/**
 * Backfill sync_operations for existing seeded data.
 * 
 * This script creates sync_operations records for entities that were
 * inserted directly (e.g., via seed scripts) without going through
 * the normal sync flow.
 * 
 * Usage:
 *   bun run src/seed/backfill-sync-operations.ts [--business-id <id>]
 * 
 * Options:
 *   --business-id <id>  Only backfill for specific business (optional)
 *   --dry-run           Show what would be done without making changes
 */

import { db } from "../lib/db";
import { syncOperations, products, productVariants } from "../db/schema";
import { customers, sales, saleItems, abonos, distribuciones } from "../db/schema";
import { eq, and, isNull, not, inArray } from "drizzle-orm";
import { now, toISODate } from "../lib/date-utils";

const DRY_RUN = process.argv.includes("--dry-run");
const BUSINESS_ID_ARG = process.argv.find((arg, i) => process.argv[i - 1] === "--business-id");

interface BackfillResult {
  entity: string;
  created: number;
  skipped: number;
}

/**
 * Generate a deterministic operation ID for backfilled records.
 * This ensures idempotency - running the script multiple times won't create duplicates.
 */
function generateBackfillOperationId(entity: string, entityId: string, businessId: string): string {
  return `backfill-${entity}-${entityId}-${businessId.slice(0, 8)}`;
}

/**
 * Check if a sync_operation already exists for this entity.
 */
async function operationExists(businessId: string, operationId: string): Promise<boolean> {
  const existing = await db.query.syncOperations.findFirst({
    where: (so, { eq, and }) => and(
      eq(so.businessId, businessId),
      eq(so.operationId, operationId)
    ),
  });
  return !!existing;
}

/**
 * Create a sync_operation record for an entity.
 * Uses CURRENT timestamp for processedAt so records are visible to incremental pull,
 * while preserving original entity timestamp in clientTimestamp.
 */
async function createSyncOperation(
  businessId: string,
  entity: string,
  entityId: string,
  payload: Record<string, unknown>,
  entityTimestamp: Date
): Promise<boolean> {
  const operationId = generateBackfillOperationId(entity, entityId, businessId);
  
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would create: ${entity}/${entityId.slice(-8)}`);
    return false;
  }

  // Check for existing to avoid duplicates
  const exists = await operationExists(businessId, operationId);
  if (exists) {
    return false;
  }

  // Use current time for processedAt so backfilled records appear in incremental pull
  // regardless of when the original entity was created
  const currentTimestamp = now();

  try {
    await db.insert(syncOperations).values({
      businessId,
      operationId,
      entity,
      action: "create",
      entityId,
      payload,
      status: "processed",
      clientTimestamp: entityTimestamp,
      processedAt: currentTimestamp,
    });
    return true;
  } catch (error: any) {
    // Ignore unique constraint violations (race condition)
    if (error?.code === "23505") {
      return false;
    }
    throw error;
  }
}

/**
 * Backfill sync_operations for customers.
 */
async function backfillCustomers(businessId?: string): Promise<BackfillResult> {
  console.log("\n📋 Backfilling customers...");
  
  const where = businessId 
    ? and(eq(customers.businessId, businessId), eq(customers.syncStatus, "synced"))
    : eq(customers.syncStatus, "synced");
  
  const allCustomers = await db.query.customers.findMany({ where });
  
  let created = 0;
  let skipped = 0;

  for (const customer of allCustomers) {
    const payload = {
      name: customer.name,
      dni: customer.dni,
      phone: customer.phone,
      address: customer.address,
      notes: customer.notes,
    };

    const wasCreated = await createSyncOperation(
      customer.businessId,
      "customers",
      customer.id,
      payload,
      customer.updatedAt || customer.createdAt
    );

    if (wasCreated) {
      created++;
      if (!DRY_RUN && created % 50 === 0) {
        console.log(`  ✓ ${created} customers processed...`);
      }
    } else {
      skipped++;
    }
  }

  console.log(`  ✓ Customers: ${created} created, ${skipped} skipped (already exist)`);
  return { entity: "customers", created, skipped };
}

/**
 * Backfill sync_operations for sales.
 */
async function backfillSales(businessId?: string): Promise<BackfillResult> {
  console.log("\n📋 Backfilling sales...");
  
  const where = businessId 
    ? and(eq(sales.businessId, businessId), eq(sales.syncStatus, "synced"))
    : eq(sales.syncStatus, "synced");
  
  const allSales = await db.query.sales.findMany({ where });
  
  let created = 0;
  let skipped = 0;

  for (const sale of allSales) {
    const payload = {
      sellerId: sale.sellerId,
      customerId: sale.customerId,
      type: sale.type,
      saleType: sale.saleType,
      paymentMode: sale.paymentMode,
      totalAmount: sale.totalAmount,
      amountPaid: sale.amountPaid,
      balanceDue: sale.balanceDue,
      status: sale.status,
      version: sale.version,
    };

    const wasCreated = await createSyncOperation(
      sale.businessId,
      "sales",
      sale.id,
      payload,
      sale.updatedAt || sale.createdAt
    );

    if (wasCreated) {
      created++;
      if (!DRY_RUN && created % 50 === 0) {
        console.log(`  ✓ ${created} sales processed...`);
      }
    } else {
      skipped++;
    }
  }

  console.log(`  ✓ Sales: ${created} created, ${skipped} skipped (already exist)`);
  return { entity: "sales", created, skipped };
}

/**
 * Backfill sync_operations for sale_items.
 * Note: sale_items don't have sync_status, so we check if the parent sale is synced.
 */
async function backfillSaleItems(businessId?: string): Promise<BackfillResult> {
  console.log("\n📋 Backfilling sale_items...");
  
  // Get all synced sales first
  const salesWhere = businessId 
    ? and(eq(sales.businessId, businessId), eq(sales.syncStatus, "synced"))
    : eq(sales.syncStatus, "synced");
  
  const syncedSales = await db.query.sales.findMany({ 
    where: salesWhere,
    columns: { id: true, businessId: true }
  });
  
  const syncedSaleIds = syncedSales.map(s => s.id);
  
  if (syncedSaleIds.length === 0) {
    console.log(`  ✓ Sale items: 0 created, 0 skipped (no synced sales)`);
    return { entity: "sale_items", created: 0, skipped: 0 };
  }

  // Get all items for synced sales
  const allItems = await db.query.saleItems.findMany({
    where: inArray(saleItems.saleId, syncedSaleIds),
  });
  
  let created = 0;
  let skipped = 0;

  // Group by businessId for the operation
  const saleBusinessMap = new Map(syncedSales.map(s => [s.id, s.businessId]));

  for (const item of allItems) {
    const itemBusinessId = saleBusinessMap.get(item.saleId);
    if (!itemBusinessId) continue;

    const payload = {
      saleId: item.saleId,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      variantName: item.variantName,
      quantity: item.quantity,
      orderedQuantity: item.orderedQuantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    };

    const wasCreated = await createSyncOperation(
      itemBusinessId,
      "sale_items",
      item.id,
      payload,
      item.createdAt
    );

    if (wasCreated) {
      created++;
      if (!DRY_RUN && created % 100 === 0) {
        console.log(`  ✓ ${created} sale_items processed...`);
      }
    } else {
      skipped++;
    }
  }

  console.log(`  ✓ Sale items: ${created} created, ${skipped} skipped (already exist)`);
  return { entity: "sale_items", created, skipped };
}

/**
 * Backfill sync_operations for abonos.
 */
async function backfillAbonos(businessId?: string): Promise<BackfillResult> {
  console.log("\n📋 Backfilling abonos...");
  
  const where = businessId 
    ? and(eq(abonos.businessId, businessId), eq(abonos.syncStatus, "synced"))
    : eq(abonos.syncStatus, "synced");
  
  const allAbonos = await db.query.abonos.findMany({ where });
  
  let created = 0;
  let skipped = 0;

  for (const abono of allAbonos) {
    const payload = {
      customerId: abono.customerId,
      amount: abono.amount,
      paymentMethod: abono.paymentMethod,
      notes: abono.notes,
      relatedSaleId: abono.relatedSaleId,
    };

    const wasCreated = await createSyncOperation(
      abono.businessId,
      "abonos",
      abono.id,
      payload,
      abono.createdAt
    );

    if (wasCreated) {
      created++;
    } else {
      skipped++;
    }
  }

  console.log(`  ✓ Abonos: ${created} created, ${skipped} skipped (already exist)`);
  return { entity: "abonos", created, skipped };
}

/**
 * Backfill sync_operations for distribuciones.
 */
async function backfillDistribuciones(businessId?: string): Promise<BackfillResult> {
  console.log("\n📋 Backfilling distribuciones...");
  
  const where = businessId 
    ? and(eq(distribuciones.businessId, businessId), eq(distribuciones.syncStatus, "synced"))
    : eq(distribuciones.syncStatus, "synced");
  
  const allDistribuciones = await db.query.distribuciones.findMany({ where });
  
  let created = 0;
  let skipped = 0;

  for (const dist of allDistribuciones) {
    const payload = {
      vendedorId: dist.vendedorId,
      puntoVenta: dist.puntoVenta,
      fecha: dist.fecha,
      estado: dist.estado,
      modo: dist.modo,
      montoRecaudado: dist.montoRecaudado,
    };

    const wasCreated = await createSyncOperation(
      dist.businessId,
      "distribuciones",
      dist.id,
      payload,
      dist.createdAt
    );

    if (wasCreated) {
      created++;
    } else {
      skipped++;
    }
  }

  console.log(`  ✓ Distribuciones: ${created} created, ${skipped} skipped (already exist)`);
  return { entity: "distribuciones", created, skipped };
}

/**
 * Backfill sync_operations for products.
 */
async function backfillProducts(businessId?: string): Promise<BackfillResult> {
  console.log("\n📋 Backfilling products...");
  
  const where = businessId 
    ? and(eq(products.businessId, businessId), eq(products.syncStatus, "synced"))
    : eq(products.syncStatus, "synced");
  
  const allProducts = await db.query.products.findMany({ where });
  
  let created = 0;
  let skipped = 0;

  for (const product of allProducts) {
    const payload = {
      name: product.name,
      type: product.type,
      unit: product.unit,
      basePrice: product.basePrice,
      costPrice: product.costPrice,
      isActive: product.isActive,
      hasVariants: product.hasVariants,
    };

    const wasCreated = await createSyncOperation(
      product.businessId,
      "products",
      product.id,
      payload,
      product.updatedAt || product.createdAt
    );

    if (wasCreated) {
      created++;
      if (!DRY_RUN && created % 50 === 0) {
        console.log(`  ✓ ${created} products processed...`);
      }
    } else {
      skipped++;
    }
  }

  console.log(`  ✓ Products: ${created} created, ${skipped} skipped (already exist)`);
  return { entity: "products", created, skipped };
}

/**
 * Backfill sync_operations for product_variants.
 */
async function backfillProductVariants(businessId?: string): Promise<BackfillResult> {
  console.log("\n📋 Backfilling product_variants...");
  
  const where = businessId 
    ? and(eq(productVariants.businessId, businessId), eq(productVariants.syncStatus, "synced"))
    : eq(productVariants.syncStatus, "synced");
  
  const allVariants = await db.query.productVariants.findMany({ where });
  
  let created = 0;
  let skipped = 0;

  for (const variant of allVariants) {
    const payload = {
      productId: variant.productId,
      name: variant.name,
      sku: variant.sku,
      unitQuantity: variant.unitQuantity,
      price: variant.price,
      costPrice: variant.costPrice,
      isActive: variant.isActive,
      sortOrder: variant.sortOrder,
    };

    const wasCreated = await createSyncOperation(
      variant.businessId,
      "product_variants",
      variant.id,
      payload,
      variant.updatedAt || variant.createdAt
    );

    if (wasCreated) {
      created++;
      if (!DRY_RUN && created % 50 === 0) {
        console.log(`  ✓ ${created} product_variants processed...`);
      }
    } else {
      skipped++;
    }
  }

  console.log(`  ✓ Product variants: ${created} created, ${skipped} skipped (already exist)`);
  return { entity: "product_variants", created, skipped };
}

/**
 * Main backfill function.
 */
export async function backfillSyncOperations(businessId?: string): Promise<BackfillResult[]> {
  console.log("🔄 Starting sync_operations backfill...");
  
  if (DRY_RUN) {
    console.log("⚠️  DRY RUN MODE - No changes will be made");
  }
  
  if (businessId) {
    console.log(`📍 Filtering by business: ${businessId}`);
  }
  
  console.log(`📅 Timestamp: ${toISODate(now())}`);

  const results: BackfillResult[] = [];

  // Backfill each entity type
  results.push(await backfillProducts(businessId));
  results.push(await backfillProductVariants(businessId));
  results.push(await backfillCustomers(businessId));
  results.push(await backfillSales(businessId));
  results.push(await backfillSaleItems(businessId));
  results.push(await backfillAbonos(businessId));
  results.push(await backfillDistribuciones(businessId));

  // Summary
  const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);

  console.log("\n" + "=".repeat(50));
  console.log("📊 BACKFILL SUMMARY");
  console.log("=".repeat(50));
  
  for (const result of results) {
    console.log(`  ${result.entity}: ${result.created} created, ${result.skipped} skipped`);
  }
  
  console.log("=".repeat(50));
  console.log(`  TOTAL: ${totalCreated} created, ${totalSkipped} skipped`);
  console.log("=".repeat(50));

  if (DRY_RUN) {
    console.log("\n⚠️  This was a DRY RUN. Run without --dry-run to apply changes.");
  } else {
    console.log("\n✅ Backfill completed successfully!");
  }

  return results;
}

// Run if called directly
if (import.meta.main) {
  backfillSyncOperations(BUSINESS_ID_ARG)
    .then(() => {
      console.log("\n👋 Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Error:", error);
      process.exit(1);
    });
}
