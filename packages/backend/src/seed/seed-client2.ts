import { eq, count } from "drizzle-orm";
import { auth } from "../lib/auth";
import { db } from "../lib/db";
import { RequestContext } from "../context/request-context";
import { abonos, businesses, businessUsers, sales as salesSchema } from "../db/schema";
import { backfillSyncOperations } from "./backfill-sync-operations";
import {
  ABONOS,
  CLIENT2_BUSINESS,
  CLIENT2_METADATA,
  CLIENT2_USER,
  CUSTOMERS,
  PRODUCTS,
  SALES,
  toSeedKey,
} from "./client2-data";
import { repositories, services } from "./services";
import { validateCanonical, formatValidationReport } from "./validate-canonical";

const FORCE_MODE = process.argv.includes("--force");

interface SeedVariantRef {
  id: string;
  key: string;
  name: string;
}

interface SeedProductRef {
  id: string;
  key: string;
  name: string;
  variants: SeedVariantRef[];
}

interface SeedCustomerRef {
  id: string;
  key: string;
  name: string;
}

interface SeedSaleRef {
  id: string;
  sourceRef: string;
}

async function checkExistingSales(businessId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(salesSchema)
    .where(eq(salesSchema.businessId, businessId));
  return result[0]?.count ?? 0;
}

async function checkExistingAbonos(businessId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(abonos)
    .where(eq(abonos.businessId, businessId));
  return result[0]?.count ?? 0;
}

export async function seedClient2User() {
  console.log("🌱 Seeding JUAVIK client2...\n");

  // Validate canonical data before proceeding
  console.log("🔍 Validating canonical dataset...");
  const validationResult = validateCanonical({
    failOnBlocking: !FORCE_MODE,
    includeWarnings: true,
  });

  if (!validationResult.valid && !FORCE_MODE) {
    console.error("\n❌ Canonical validation failed:");
    console.error(formatValidationReport(validationResult));
    throw new Error(
      "Canonical validation failed. Fix errors or use --force to skip validation."
    );
  }

  if (validationResult.valid) {
    console.log(`✓ Canonical validation passed: ${validationResult.stats.totalFound}/100 files`);
  } else if (FORCE_MODE) {
    console.log(
      "⚠️ FORCE MODE: Continuing despite validation errors"
    );
  }

  console.log(
    `📊 Canonical dataset: ${CLIENT2_METADATA.canonicalFileCount} files, ${CLIENT2_METADATA.customerCount} customers, ${CLIENT2_METADATA.saleCount} sales, ${CLIENT2_METADATA.abonoCount} abonos`
  );

  const existingUser = await db.query.user.findFirst({
    where: (user, { eq: compare }) => compare(user.email, CLIENT2_USER.email),
  });

  let userId: string;

  if (existingUser) {
    console.log(`⚠ User already exists (ID: ${existingUser.id})`);
    userId = existingUser.id;
  } else {
    try {
      const result = await auth.api.signUpEmail({
        body: {
          email: CLIENT2_USER.email,
          password: CLIENT2_USER.password,
          name: CLIENT2_USER.name,
        },
      });
      userId = result.user.id;
      console.log(`✓ User created (ID: ${userId})`);
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.message?.includes("already registered")) {
        const result = await auth.api.signInEmail({
          body: {
            email: CLIENT2_USER.email,
            password: CLIENT2_USER.password,
          },
        });
        userId = result.user.id;
        console.log(`✓ Found existing user (ID: ${userId})`);
      } else {
        throw new Error(`Failed to create user: ${error?.message || error}`);
      }
    }
  }

  const existingBusinessUser = await db.query.businessUsers.findFirst({
    where: eq(businessUsers.userId, userId),
  });

  let businessId: string;
  let businessUserId: string;

  if (existingBusinessUser) {
    console.log("⚠ Business already linked to user");
    businessId = existingBusinessUser.businessId;
    businessUserId = existingBusinessUser.id;

    // Check for existing sales (rerun safety)
    const existingSalesCount = await checkExistingSales(businessId);
    const existingAbonosCount = await checkExistingAbonos(businessId);

    if (existingSalesCount > 0 || existingAbonosCount > 0) {
      console.log(`\n⚠️ RERUN POLICY CHECK:`);
      console.log(`   - Existing sales: ${existingSalesCount}`);
      console.log(`   - Existing abonos: ${existingAbonosCount}`);

      if (!FORCE_MODE) {
        console.error(`\n❌ ERROR: JUAVIK business already has transactional data.`);
        console.error(`   To prevent duplicate data, seeding is blocked.`);
        console.error(`\n   Options:`);
        console.error(`   1. Reset the database: bun run db:reset`);
        console.error(`   2. Use --force to skip this check: bun run db:seed:client2 --force`);
        throw new Error("Business already has sales/abonos. Use --force to override.");
      } else {
        console.log(`\n⚠️ FORCE MODE: Skipping safety check and continuing...`);
        console.log(`   WARNING: This may result in duplicate data!`);
      }
    } else {
      console.log(`✓ Business exists but has no transactional data - proceeding with idempotent setup`);
    }
  } else {
    const [business] = await db
      .insert(businesses)
      .values({
        name: CLIENT2_BUSINESS.name,
        ruc: CLIENT2_BUSINESS.ruc,
        address: CLIENT2_BUSINESS.address,
        phone: CLIENT2_BUSINESS.phone,
        email: CLIENT2_BUSINESS.email,
        modoOperacion: CLIENT2_BUSINESS.modoOperacion,
        controlKilos: CLIENT2_BUSINESS.controlKilos,
        usarDistribucion: CLIENT2_BUSINESS.usarDistribucion,
        permitirVentaSinStock: CLIENT2_BUSINESS.permitirVentaSinStock,
      })
      .returning();

    const [businessUser] = await db
      .insert(businessUsers)
      .values({
        businessId: business.id,
        userId,
        role: "ADMIN_NEGOCIO",
        salesPoint: "Oficina Principal",
      })
      .returning();

    businessId = business.id;
    businessUserId = businessUser.id;

    console.log(`✓ Business created: ${business.name} (ID: ${business.id})`);
    console.log(`✓ User linked to business as ADMIN_NEGOCIO`);
  }

  const ctx = RequestContext.forWorker(businessId, businessUserId);

  await seedClient2Data(ctx);

  console.log("\n🔄 Running sync operations backfill...");
  const backfillResults = await backfillSyncOperations(businessId);
  const totalCreated = backfillResults.reduce((sum, result) => sum + result.created, 0);
  const totalSkipped = backfillResults.reduce((sum, result) => sum + result.skipped, 0);
  console.log(`✓ Backfill complete: ${totalCreated} created, ${totalSkipped} skipped`);

  console.log("\n✅ JUAVIK client2 seed completed!");
  console.log("\nLogin credentials:");
  console.log(`  Email: ${CLIENT2_USER.email}`);
  console.log(`  Password: ${CLIENT2_USER.password}`);
}

async function seedClient2Data(ctx: RequestContext) {
  console.log("\n📦 Seeding JUAVIK canonical data...\n");

  await services.paymentMethodConfig.getConfig(ctx);
  console.log("✓ Payment methods configured");

  const products = await seedProducts(ctx);
  console.log(`✓ Seeded ${products.length} products with ${products.reduce((sum, product) => sum + product.variants.length, 0)} variants`);

  await seedInventory(ctx, products);
  console.log("✓ Inventory stocked");

  const customers = await seedCustomers(ctx);
  console.log(`✓ Seeded ${customers.length} customers`);

  const sales = await seedSales(ctx, customers, products);
  console.log(`✓ Seeded ${sales.length} sales`);

  const abonosCount = await seedAbonos(ctx, customers, sales);
  console.log(`✓ Seeded ${abonosCount} abonos`);
}

async function seedProducts(ctx: RequestContext): Promise<SeedProductRef[]> {
  const existing = await services.product.getProducts(ctx);
  const existingByName = new Map(existing.map((product) => [product.name, product]));
  const resolvedProducts: SeedProductRef[] = [];

  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} products already exist, reconciling with canonical dataset`);
  }

  for (const productDef of PRODUCTS) {
    const existingProduct = existingByName.get(productDef.name);

    const product = existingProduct
      ? existingProduct
      : (await services.product.createProduct(ctx, {
          name: productDef.name,
          type: productDef.type,
          unit: productDef.unit,
          basePrice: parseFloat(productDef.basePrice),
          isActive: productDef.isActive,
        })).data;

    const existingVariants = await services.productVariant.getVariantsByProduct(ctx, product.id, {
      includeInactive: true,
    });
    const variantsByName = new Map(existingVariants.map((variant) => [variant.name, variant]));

    const resolvedProduct: SeedProductRef = {
      id: product.id,
      key: productDef.key,
      name: product.name,
      variants: [],
    };

    for (const variantDef of productDef.variants) {
      const existingVariant = variantsByName.get(variantDef.name);
      const variant = existingVariant
        ? existingVariant
        : await repositories.productVariant.create(ctx, {
            productId: product.id,
            name: variantDef.name,
            sku: variantDef.sku,
            unitQuantity: variantDef.unitQuantity.toString(),
            price: variantDef.price.toFixed(2),
            isActive: true,
            sortOrder: resolvedProduct.variants.length,
          });

      resolvedProduct.variants.push({
        id: variant.id,
        key: variantDef.key,
        name: variant.name,
      });
    }

    resolvedProducts.push(resolvedProduct);
  }

  return resolvedProducts;
}

async function seedInventory(ctx: RequestContext, products: SeedProductRef[]) {
  const inventoryTargetByVariantKey = new Map<string, number>();

  for (const productDef of PRODUCTS) {
    for (const variantDef of productDef.variants) {
      inventoryTargetByVariantKey.set(`${productDef.key}:${variantDef.key}`, variantDef.initialInventory);
    }
  }

  for (const product of products) {
    for (const variant of product.variants) {
      const targetQuantity = inventoryTargetByVariantKey.get(`${product.key}:${variant.key}`) ?? 100;
      const existingInventory = await repositories.productVariant.getInventory(ctx, variant.id);

      if (!existingInventory) {
        await repositories.productVariant.createInventory(ctx, {
          variantId: variant.id,
          quantity: targetQuantity.toString(),
        });
        continue;
      }

      if (Number(existingInventory.quantity) !== targetQuantity) {
        await repositories.productVariant.updateInventory(ctx, variant.id, targetQuantity.toString());
      }
    }
  }
}

async function seedCustomers(ctx: RequestContext): Promise<SeedCustomerRef[]> {
  const existing = await services.customer.getCustomers(ctx);
  const existingByKey = new Map(existing.map((customer) => [toSeedKey(customer.name), customer]));

  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} customers already exist, reconciling with canonical dataset`);
  }

  const seededCustomers: SeedCustomerRef[] = [];

  for (const customerDef of CUSTOMERS) {
    const existingCustomer = existingByKey.get(customerDef.key);
    const customer = existingCustomer
      ? existingCustomer
      : (await services.customer.createCustomer(ctx, {
          name: customerDef.name,
          dni: customerDef.dni ?? undefined,
          phone: customerDef.phone ?? undefined,
          address: customerDef.address ?? undefined,
          notes: customerDef.notes,
        })).data;

    seededCustomers.push({
      id: customer.id,
      key: customerDef.key,
      name: customer.name,
    });
  }

  return seededCustomers;
}

async function seedSales(
  ctx: RequestContext,
  customers: SeedCustomerRef[],
  products: SeedProductRef[]
): Promise<SeedSaleRef[]> {
  const existing = await services.sale.getSales(ctx);

  if (existing.length > 0) {
    throw new Error(`Business already has ${existing.length} sales. Reset the JUAVIK business before reseeding transactional data.`);
  }

  const customersByKey = new Map(customers.map((customer) => [customer.key, customer]));
  const productsByKey = new Map(products.map((product) => [product.key, product]));
  const seededSales: SeedSaleRef[] = [];

  for (const saleDef of SALES) {
    const customer = customersByKey.get(saleDef.customerKey);
    if (!customer) {
      throw new Error(`Customer not found for sale ${saleDef.sourceRef}`);
    }

    const items = saleDef.items.map((item) => {
      const product = productsByKey.get(item.productKey);
      if (!product) {
        throw new Error(`Product not found for sale ${saleDef.sourceRef}: ${item.productKey}`);
      }

      const variant = product.variants.find((candidate) => candidate.key === item.variantKey);
      if (!variant) {
        throw new Error(`Variant not found for sale ${saleDef.sourceRef}: ${product.key}/${item.variantKey}`);
      }

      return {
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        variantName: variant.name,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toFixed(2),
        subtotal: item.subtotal.toFixed(2),
      };
    });

    const createdSale = await repositories.sale.create(ctx, {
      customerId: customer.id,
      saleType: saleDef.saleType,
      totalAmount: saleDef.totalAmount.toFixed(2),
      amountPaid: saleDef.amountPaid.toFixed(2),
      balanceDue: Math.max(saleDef.totalAmount - saleDef.amountPaid, 0).toFixed(2),
      saleDate: `${saleDef.saleDate}T12:00:00.000Z`,
      items,
    });

    await repositories.sale.update(ctx, createdSale.id, {
      status: "active",
      paymentMode: saleDef.saleType === "contado" ? "pago_total" : "debe_todo",
    });

    seededSales.push({
      id: createdSale.id,
      sourceRef: saleDef.sourceRef,
    });
  }

  return seededSales;
}

async function seedAbonos(
  ctx: RequestContext,
  customers: SeedCustomerRef[],
  sales: SeedSaleRef[]
) {
  const existing = await services.payment.getPayments(ctx);

  if (existing.length > 0) {
    throw new Error(`Business already has ${existing.length} abonos. Reset the JUAVIK business before reseeding payments.`);
  }

  const customersByKey = new Map(customers.map((customer) => [customer.key, customer]));
  const salesBySourceRef = new Map(sales.map((sale) => [sale.sourceRef, sale.id]));

  for (const abonoDef of ABONOS) {
    const customer = customersByKey.get(abonoDef.customerKey);
    if (!customer) {
      throw new Error(`Customer not found for abono ${abonoDef.sourceRef}`);
    }

    const relatedSaleId = salesBySourceRef.get(abonoDef.relatedSaleSourceRef);

    await db.insert(abonos).values({
      customerId: customer.id,
      businessId: ctx.businessId,
      sellerId: ctx.businessUserId,
      amount: abonoDef.amount.toFixed(2),
      paymentMethod: abonoDef.paymentMethod,
      notes: abonoDef.notes,
      relatedSaleId,
      createdAt: new Date(`${abonoDef.paymentDate}T12:05:00.000Z`),
      updatedAt: new Date(`${abonoDef.paymentDate}T12:05:00.000Z`),
    });
  }

  return ABONOS.length;
}

if (import.meta.main) {
  seedClient2User()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n❌ Seed failed:", error);
      process.exit(1);
    });
}
