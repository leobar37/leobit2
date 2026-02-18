import { db, businessUsers } from "../lib/db";
import { RequestContext } from "../context/request-context";
import { createTestUser } from "./auth";
import { services } from "./services";
import { repositories } from "./services";
import {
  TEST_BUSINESS,
  PRODUCTS,
  PRODUCT_VARIANTS,
  CUSTOMERS,
  SALES,
  ABONOS,
  DISTRIBUCIONES,
  SUPPLIERS,
  PURCHASES,
} from "./data";
import { inventory, saleItems, sales, abonos, distribuciones, customers, products, suppliers as suppliersSchema, purchaseItems, purchases, productVariants } from "../db/schema";

const FORCE_MODE = process.argv.includes("--force");

interface SeedProduct {
  id: string;
  name: string;
  variants: Array<{ id: string; name: string }>;
}

interface SeedResult {
  userId: string;
  businessId: string;
  businessUserId: string;
  productsCount: number;
  variantsCount: number;
  inventoryCount: number;
  customersCount: number;
  salesCount: number;
  abonosCount: number;
  distribucionesCount: number;
  suppliersCount: number;
  purchasesCount: number;
}

async function seed(): Promise<SeedResult> {
  console.log("🌱 Starting database seed...\n");

  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed cannot run in production environment");
  }

  if (FORCE_MODE) {
    console.log("⚠️ FORCE MODE: Clearing existing seeded data...\n");
    await clearExistingData();
  }

  const user = await createTestUser();
  console.log();

  const { business, businessUserId } = await createBusinessAndLinkUser(user.userId);
  console.log(`✓ Business created: ${business.name} (ID: ${business.id})\n`);

  const ctx = RequestContext.forWorker(business.id, businessUserId);
  console.log("Created admin context for seeding\n");

  const products = await seedProducts(ctx);
  console.log(`✓ Seeded ${products.length} products with variants\n`);

  const suppliers = await seedSuppliers(ctx);
  console.log(`✓ Seeded ${suppliers.length} suppliers\n`);

  const purchases = await seedPurchases(ctx, suppliers, products);
  console.log(`✓ Seeded ${purchases.length} purchases\n`);

  const inventoryItems = await seedInventory(ctx, products);
  console.log(`✓ Seeded ${inventoryItems.length} inventory items\n`);

  const customers = await seedCustomers(ctx);
  console.log(`✓ Seeded ${customers.length} customers\n`);

  const sales = await seedSales(ctx, customers, products);
  console.log(`✓ Seeded ${sales.length} sales\n`);

  const abonos = await seedAbonos(ctx, customers);
  console.log(`✓ Seeded ${abonos.length} abonos\n`);

  const distribuciones = await seedDistribuciones(ctx, businessUserId);
  console.log(`✓ Seeded ${distribuciones.length} distribuciones\n`);

  console.log("✅ Seed completed successfully!\n");
  console.log("Login credentials:");
  console.log(`  Email: demo@avileo.com`);
  console.log(`  Password: demo123456`);
  console.log();

  return {
    userId: user.userId,
    businessId: business.id,
    businessUserId,
    productsCount: products.length,
    variantsCount: products.reduce((acc, p) => acc + p.variants.length, 0),
    inventoryCount: inventoryItems.length,
    customersCount: customers.length,
    salesCount: sales.length,
    abonosCount: abonos.length,
    distribucionesCount: distribuciones.length,
    suppliersCount: suppliers.length,
    purchasesCount: purchases.length,
  };
}

async function createBusinessAndLinkUser(userId: string): Promise<{ business: { id: string; name: string }; businessUserId: string }> {
  const existingMembership = await db.query.businessUsers.findFirst({
    where: (bu, { eq }) => eq(bu.userId, userId),
  });

  if (existingMembership) {
    const business = await db.query.businesses.findFirst({
      where: (b, { eq }) => eq(b.id, existingMembership.businessId),
    });
    if (business) {
      console.log(`⚠ User already linked to business: ${business.name}`);
      return { business, businessUserId: existingMembership.id };
    }
  }

  const tempCtx = RequestContext.forWorker("temp", "temp");

  const business = await repositories.business.create(tempCtx, {
    name: TEST_BUSINESS.name,
    ruc: TEST_BUSINESS.ruc,
    address: TEST_BUSINESS.address,
    phone: TEST_BUSINESS.phone,
    email: TEST_BUSINESS.email,
  });

  const [businessUser] = await db.insert(businessUsers).values({
    businessId: business.id,
    userId: userId,
    role: "ADMIN_NEGOCIO",
    salesPoint: "Oficina Principal",
  }).returning();

  await repositories.business.update(tempCtx, business.id, {
    modoOperacion: TEST_BUSINESS.modoOperacion,
    controlKilos: TEST_BUSINESS.controlKilos,
    usarDistribucion: TEST_BUSINESS.usarDistribucion,
    permitirVentaSinStock: TEST_BUSINESS.permitirVentaSinStock,
  });

  return { business, businessUserId: businessUser.id };
}

async function seedProducts(ctx: RequestContext): Promise<SeedProduct[]> {
  const existing = await services.product.getProducts(ctx);
  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} products already exist, loading with variants`);
    const seedProducts: SeedProduct[] = [];
    for (const product of existing) {
      const variants = await services.productVariant.getVariantsByProduct(ctx, product.id);
      seedProducts.push({
        id: product.id,
        name: product.name,
        variants: variants.map(v => ({ id: v.id, name: v.name })),
      });
    }
    return seedProducts;
  }

  const seedProducts: SeedProduct[] = [];

  for (let i = 0; i < PRODUCTS.length; i++) {
    const productDef = PRODUCTS[i];
    const variantsDef = PRODUCT_VARIANTS[i];

    const product = await services.product.createProduct(ctx, {
      name: productDef.name,
      type: productDef.type,
      unit: productDef.unit,
      basePrice: parseFloat(productDef.basePrice),
      isActive: productDef.isActive,
    });

    console.log(`   ✓ Product: ${product.name}`);

    const seedProduct: SeedProduct = {
      id: product.id,
      name: product.name,
      variants: [],
    };

    for (const variantDef of variantsDef) {
      const variant = await services.productVariant.createVariant(ctx, {
        productId: product.id,
        name: variantDef.name,
        sku: variantDef.sku,
        unitQuantity: variantDef.unitQuantity,
        price: variantDef.price,
        isActive: true,
      });

      console.log(`     ↳ Variant: ${variant.name}`);

      seedProduct.variants.push({
        id: variant.id,
        name: variant.name,
      });
    }

    seedProducts.push(seedProduct);
  }

  return seedProducts;
}

async function seedSuppliers(ctx: RequestContext): Promise<Array<{ id: string; name: string }>> {
  const existing = await services.supplier.getSuppliers(ctx);
  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} suppliers already exist, loading`);
    return existing.map((s) => ({ id: s.id, name: s.name }));
  }

  const seedSuppliers: Array<{ id: string; name: string }> = [];

  try {
    const generic = await services.supplier.createGenericSupplier(ctx);
    console.log(`   ✓ Generic Supplier: ${generic.name}`);
    seedSuppliers.push({ id: generic.id, name: generic.name });
  } catch {
    console.log(`   ℹ Generic supplier already exists`);
  }

  for (const supplierDef of SUPPLIERS) {
    const supplier = await services.supplier.createSupplier(ctx, {
      name: supplierDef.name,
      type: supplierDef.type,
      ruc: supplierDef.ruc,
      address: supplierDef.address,
      phone: supplierDef.phone,
      email: supplierDef.email,
      notes: supplierDef.notes,
    });

    console.log(`   ✓ Supplier: ${supplier.name}`);
    seedSuppliers.push({ id: supplier.id, name: supplier.name });
  }

  return seedSuppliers;
}

async function seedPurchases(
  ctx: RequestContext,
  suppliers: Array<{ id: string }>,
  products: SeedProduct[]
): Promise<Array<{ id: string }>> {
  const existing = await services.purchase.getPurchases(ctx);
  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} purchases already exist, skipping`);
    return existing.map((p) => ({ id: p.id }));
  }

  const seedPurchases: Array<{ id: string }> = [];

  for (const purchaseDef of PURCHASES) {
    const supplier = suppliers[purchaseDef.supplierIndex];
    if (!supplier) {
      console.warn(`   ⚠ Supplier not found at index ${purchaseDef.supplierIndex}, skipping purchase`);
      continue;
    }

    const purchaseItems = purchaseDef.items.map((item) => {
      const product = products[item.productIndex];
      if (!product) {
        throw new Error(`Product not found at index ${item.productIndex}`);
      }

      const variant = product.variants[item.variantIndex];
      if (!variant) {
        throw new Error(`Variant not found at index ${item.variantIndex} for product ${product.name}`);
      }

      return {
        productId: product.id,
        variantId: variant.id,
        quantity: item.quantity,
        unitCost: item.unitCost,
      };
    });

    const purchase = await services.purchase.createPurchase(ctx, {
      supplierId: supplier.id,
      purchaseDate: purchaseDef.purchaseDate,
      invoiceNumber: purchaseDef.invoiceNumber,
      notes: purchaseDef.notes,
      items: purchaseItems,
    });

    console.log(`   ✓ Purchase: ${purchase.invoiceNumber || "N/A"} - S/ ${purchase.totalAmount}`);
    seedPurchases.push({ id: purchase.id });
  }

  return seedPurchases;
}

async function seedCustomers(ctx: RequestContext) {
  const existing = await services.customer.getCustomers(ctx);
  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} customers already exist, skipping`);
    return existing;
  }

  const customers = [];
  for (const customer of CUSTOMERS) {
    const created = await services.customer.createCustomer(ctx, {
      name: customer.name,
      dni: customer.dni,
      phone: customer.phone,
      address: customer.address,
      notes: customer.notes,
    });
    customers.push(created);
  }

  return customers;
}

async function seedSales(
  ctx: RequestContext,
  customers: Array<{ id: string }>,
  products: SeedProduct[]
) {
  const existing = await services.sale.getSales(ctx);
  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} sales already exist, skipping`);
    return existing;
  }

  const sales = [];
  for (const saleData of SALES) {
    const customer = customers[saleData.customerIndex];
    if (!customer) continue;

    const saleDate = new Date();
    saleDate.setDate(saleDate.getDate() - saleData.daysAgo);

    const items = saleData.items.map((item) => {
      const product = products[item.productIndex];
      const variant = product.variants[0];
      return {
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        variantName: variant.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.quantity * item.unitPrice,
      };
    });

    const created = await services.sale.createSale(ctx, {
      clientId: customer.id,
      saleType: saleData.saleType,
      totalAmount: saleData.totalAmount,
      amountPaid: saleData.amountPaid,
      tara: saleData.tara,
      netWeight: saleData.netWeight,
      items,
    });

    sales.push(created);
  }

  return sales;
}

async function seedAbonos(ctx: RequestContext, customers: Array<{ id: string }>) {
  const existing = await services.payment.getPayments(ctx);
  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} abonos already exist, skipping`);
    return existing;
  }

  const abonos = [];
  for (const abonoData of ABONOS) {
    const customer = customers[abonoData.customerIndex];
    if (!customer) continue;

    const created = await services.payment.createPayment(ctx, {
      clientId: customer.id,
      amount: abonoData.amount,
      paymentMethod: abonoData.paymentMethod,
      notes: abonoData.notes,
    });

    abonos.push(created);
  }

  return abonos;
}

async function seedDistribuciones(ctx: RequestContext, businessUserId: string) {
  const existing = await services.distribucion.getDistribuciones(ctx);
  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} distribuciones already exist, skipping`);
    return existing;
  }

  const distribuciones = [];
  const seenDates = new Set<string>();

  for (const distData of DISTRIBUCIONES) {
    // Skip duplicate dates for the same seller
    if (seenDates.has(distData.fecha)) {
      console.log(`⚠ Skipping duplicate distribucion for fecha: ${distData.fecha}`);
      continue;
    }
    seenDates.add(distData.fecha);

    try {
      const created = await services.distribucion.createDistribucion(ctx, {
        vendedorId: businessUserId,
        puntoVenta: distData.puntoVenta,
        kilosAsignados: distData.kilosAsignados,
        fecha: distData.fecha,
      });
      distribuciones.push(created);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Ya existe una distribución")) {
        console.log(`⚠ Distribucion already exists for fecha: ${distData.fecha}, skipping`);
        continue;
      }
      throw error;
    }
  }

  return distribuciones;
}

async function seedInventory(ctx: RequestContext, products: Array<{ id: string }>) {
  const existing = await services.inventory.getInventory(ctx);
  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} inventory items already exist, skipping`);
    return existing;
  }

  const inventoryItems = [];
  for (const product of products) {
    const created = await services.inventory.updateStock(ctx, product.id, 100);
    inventoryItems.push(created);
  }

  return inventoryItems;
}

async function clearExistingData() {
  await db.delete(saleItems);
  await db.delete(sales);
  await db.delete(abonos);
  await db.delete(distribuciones);
  await db.delete(customers);
  await db.delete(purchaseItems);
  await db.delete(purchases);
  await db.delete(suppliersSchema);
  await db.delete(inventory);
  await db.delete(productVariants);
  await db.delete(products);
  console.log("✓ Cleared existing data\n");
}

seed()
  .then((result) => {
    console.log("\n📊 Seed Summary:");
    console.log(`  User ID: ${result.userId}`);
    console.log(`  Business ID: ${result.businessId}`);
    console.log(`  Products: ${result.productsCount} (${result.variantsCount} variants)`);
    console.log(`  Suppliers: ${result.suppliersCount}`);
    console.log(`  Purchases: ${result.purchasesCount}`);
    console.log(`  Inventory Items: ${result.inventoryCount}`);
    console.log(`  Customers: ${result.customersCount}`);
    console.log(`  Sales: ${result.salesCount}`);
    console.log(`  Abonos: ${result.abonosCount}`);
    console.log(`  Distribuciones: ${result.distribucionesCount}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Seed failed:", error);
    process.exit(1);
  });
