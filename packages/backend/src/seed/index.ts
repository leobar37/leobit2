import { db, businessUsers } from "../lib/db";
import { RequestContext } from "../context/request-context";
import { createTestUser, createClientUser } from "./auth";
import { services } from "./services";
import { repositories, seedDefaultCategories } from "./services";
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
  TAGS,
  CUSTOMER_TAGS,
  CATEGORIES,
} from "./data";
import {
  CLIENT_USER,
  CLIENT_BUSINESS,
  PRODUCTS as CLIENT_PRODUCTS,
  PRODUCT_VARIANTS as CLIENT_PRODUCT_VARIANTS,
  CUSTOMERS as CLIENT_CUSTOMERS,
  SALES as CLIENT_SALES,
  ABONOS as CLIENT_ABONOS,
  DISTRIBUCIONES as CLIENT_DISTRIBUCIONES,
  SUPPLIERS as CLIENT_SUPPLIERS,
  PURCHASES as CLIENT_PURCHASES,
  TAGS as CLIENT_TAGS,
  CUSTOMER_TAGS as CLIENT_CUSTOMER_TAGS,
  CATEGORIES as CLIENT_CATEGORIES,
} from "./client-data";
import {
  CLIENT1_USER,
  CLIENT1_BUSINESS,
  PRODUCTS as CLIENT1_PRODUCTS,
  PRODUCT_VARIANTS as CLIENT1_PRODUCT_VARIANTS,
  CUSTOMERS as CLIENT1_CUSTOMERS,
  SALES as CLIENT1_SALES,
  ABONOS as CLIENT1_ABONOS,
  DISTRIBUCIONES as CLIENT1_DISTRIBUCIONES,
  SUPPLIERS as CLIENT1_SUPPLIERS,
  PURCHASES as CLIENT1_PURCHASES,
  TAGS as CLIENT1_TAGS,
  CUSTOMER_TAGS as CLIENT1_CUSTOMER_TAGS,
  CATEGORIES as CLIENT1_CATEGORIES,
} from "./client1-data";
import {
  saleItems as saleItemsSchema,
  sales as salesSchema,
  abonos as abonosSchema,
  distribuciones,
  customers as customersSchema,
  products as productsSchema,
  productVariants as productVariantsSchema,
  suppliers as suppliersSchema,
  purchaseItems,
  purchases,
  businessPaymentSettings
} from "../db/schema";

const FORCE_MODE = process.argv.includes("--force");
const CLIENT_MODE = process.argv.includes("--client");
const CLIENT1_MODE = process.argv.includes("--client1");

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
  paymentMethodsConfigured: boolean;
  tagsCount: number;
  customerTagsCount: number;
}

// Detectar si los datos del cliente son datos reales del JSON
function isRealClientData(): boolean {
  return CLIENT_MODE && CLIENT_CUSTOMERS.length > 0 && 'id' in CLIENT_CUSTOMERS[0];
}

export async function seedDatabase(): Promise<SeedResult> {
  console.log("🌱 Starting database seed...\n");

  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed cannot run in production environment");
  }

  // Detectar modo
  const isClient = CLIENT_MODE;
  const isClient1 = CLIENT1_MODE;

  // Detectar si usamos datos reales (solo para --client con JSON exportado)
  const useRealData = isRealClientData();

  if (useRealData) {
    console.log("📦 Modo DATOS REALES: Usando exportación de cliente@avileo.com\n");
  } else if (isClient1) {
    console.log("📦 Modo CLIENTE1: Creando cuenta para cliente1@gmail.com\n");
  }

  // Select data based on mode
  let currentUser, currentBusiness, currentProducts, currentProductVariants, currentCustomers;
  let currentSales, currentAbonos, currentDistribuciones, currentSuppliers, currentPurchases;
  let currentTags, currentCustomerTags, currentCategories;

  if (isClient1) {
    // Modo cliente1@gmail.com
    currentUser = CLIENT1_USER;
    currentBusiness = CLIENT1_BUSINESS;
    currentProducts = CLIENT1_PRODUCTS;
    currentProductVariants = CLIENT1_PRODUCT_VARIANTS;
    currentCustomers = CLIENT1_CUSTOMERS;
    currentSales = CLIENT1_SALES;
    currentAbonos = CLIENT1_ABONOS;
    currentDistribuciones = CLIENT1_DISTRIBUCIONES;
    currentSuppliers = CLIENT1_SUPPLIERS;
    currentPurchases = CLIENT1_PURCHASES;
    currentTags = CLIENT1_TAGS;
    currentCustomerTags = CLIENT1_CUSTOMER_TAGS;
    currentCategories = CLIENT1_CATEGORIES;
  } else if (isClient) {
    // Modo cliente@avileo.com
    currentUser = CLIENT_USER;
    currentBusiness = CLIENT_BUSINESS;
    currentProducts = CLIENT_PRODUCTS;
    currentProductVariants = CLIENT_PRODUCT_VARIANTS;
    currentCustomers = CLIENT_CUSTOMERS;
    currentSales = CLIENT_SALES;
    currentAbonos = CLIENT_ABONOS;
    currentDistribuciones = CLIENT_DISTRIBUCIONES;
    currentSuppliers = CLIENT_SUPPLIERS;
    currentPurchases = CLIENT_PURCHASES;
    currentTags = CLIENT_TAGS;
    currentCustomerTags = CLIENT_CUSTOMER_TAGS;
    currentCategories = CLIENT_CATEGORIES;
  } else {
    // Modo E2E (default)
    currentUser = { email: "e2e@avileo.com", password: "e2e123456", name: "Usuario E2E" };
    currentBusiness = TEST_BUSINESS;
    currentProducts = PRODUCTS;
    currentProductVariants = PRODUCT_VARIANTS;
    currentCustomers = CUSTOMERS;
    currentSales = SALES;
    currentAbonos = ABONOS;
    currentDistribuciones = DISTRIBUCIONES;
    currentSuppliers = SUPPLIERS;
    currentPurchases = PURCHASES;
    currentTags = TAGS;
    currentCustomerTags = CUSTOMER_TAGS;
    currentCategories = CATEGORIES;
  }

  if (FORCE_MODE && !isClient && !isClient1) {
    console.log("⚠️ FORCE MODE: Clearing existing seeded data...\n");
    await clearExistingData();
  }

  // Create user (different function for client modes vs e2e)
  const user = (isClient || isClient1)
    ? await createClientUser(currentUser.email, currentUser.password, currentUser.name)
    : await createTestUser();
  console.log();

  // Check if user already has a business - reuse it instead of creating new
  const existingBusinessUser = await db.query.businessUsers.findFirst({
    where: (bu, { eq }) => eq(bu.userId, user.userId),
    with: {
      business: true,
    },
  });

  let business: { id: string; name: string };
  let businessUserId: string;

  if (existingBusinessUser) {
    business = existingBusinessUser.business;
    businessUserId = existingBusinessUser.id;
    console.log(`✓ Reusing existing business: ${business.name} (ID: ${business.id})\n`);
  } else {
    const result = await createBusinessAndLinkUser(user.userId, currentBusiness);
    business = result.business;
    businessUserId = result.businessUserId;
    console.log(`✓ Business created: ${business.name} (ID: ${business.id})\n`);
  }

  const ctx = RequestContext.forWorker(business.id, businessUserId);
  console.log("Created admin context for seeding\n");

  const paymentMethods = await seedPaymentMethods(ctx);
  console.log(`✓ Payment methods configured\n`);

  const categoryMap = await seedDefaultCategories(ctx, currentCategories);
  console.log(`✓ Seeded ${categoryMap.size} categories\n`);

  let seededProducts: SeedProduct[];
  let seededCustomers: any[];
  let seededSales: any[];
  let seededAbonos: any[];

  if (useRealData) {
    // Modo datos reales - usar funciones especiales con IDs preservados
    seededProducts = await seedRealProducts(ctx, currentProducts, currentProductVariants, categoryMap);
    console.log(`✓ Seeded ${seededProducts.length} products with variants (IDs preservados)\n`);

    // Saltar suppliers, purchases, inventory en modo datos reales
    const suppliers: any[] = [];
    const purchases: any[] = [];
    const inventoryItems: any[] = [];
    console.log(`ℹ Skipping suppliers, purchases, inventory in real data mode\n`);

    seededCustomers = await seedRealCustomers(ctx, currentCustomers);
    console.log(`✓ Seeded ${seededCustomers.length} customers (IDs preservados)\n`);

    seededSales = await seedRealSales(ctx, currentSales);
    console.log(`✓ Seeded ${seededSales.length} sales with items (IDs preservados)\n`);

    seededAbonos = await seedRealAbonos(ctx, currentAbonos);
    console.log(`✓ Seeded ${seededAbonos.length} abonos (IDs preservados)\n`);

    // Saltar distribuciones, tags en modo datos reales
    const distribuciones: any[] = [];
    const seededTags: any[] = [];
    const customerTagsCount = 0;
    console.log(`ℹ Skipping distribuciones, tags in real data mode\n`);

    console.log("✅ Seed completed successfully with REAL DATA!\n");
    console.log("Login credentials:");
    console.log(`  Email: ${currentUser.email}`);
    console.log(`  Password: ${isClient ? "Cliente112345" : isClient1 ? "Prueba@123" : "e2e123456"}`);
    console.log();

    return {
      userId: user.userId,
      businessId: business.id,
      businessUserId,
      productsCount: seededProducts.length,
      variantsCount: seededProducts.reduce((acc, p) => acc + p.variants.length, 0),
      inventoryCount: 0,
      customersCount: seededCustomers.length,
      salesCount: seededSales.length,
      abonosCount: seededAbonos.length,
      distribucionesCount: 0,
      suppliersCount: 0,
      purchasesCount: 0,
      paymentMethodsConfigured: !!paymentMethods,
      tagsCount: 0,
      customerTagsCount: 0,
    };
  } else {
    // Modo normal (E2E o Client demo básico)
    seededProducts = await seedProducts(ctx, currentProducts, currentProductVariants, categoryMap);
    console.log(`✓ Seeded ${seededProducts.length} products with variants\n`);

    const suppliers = await seedSuppliers(ctx, currentSuppliers);
    console.log(`✓ Seeded ${suppliers.length} suppliers\n`);

    const purchases = await seedPurchases(ctx, suppliers, seededProducts, currentPurchases);
    console.log(`✓ Seeded ${purchases.length} purchases\n`);

    const inventoryItems = await seedVariantInventory(ctx, seededProducts);
    console.log(`✓ Seeded ${inventoryItems.length} variant inventory items\n`);

    seededCustomers = await seedCustomers(ctx, currentCustomers);
    console.log(`✓ Seeded ${seededCustomers.length} customers\n`);

    seededSales = await seedSales(ctx, seededCustomers, seededProducts, currentSales);
    console.log(`✓ Seeded ${seededSales.length} sales\n`);

    seededAbonos = await seedAbonos(ctx, seededCustomers, currentAbonos);
    console.log(`✓ Seeded ${seededAbonos.length} abonos\n`);

    const distribuciones = await seedDistribuciones(ctx, businessUserId, seededProducts, currentDistribuciones);
    console.log(`✓ Seeded ${distribuciones.length} distribuciones\n`);

    const seededTags = await seedTags(ctx, currentTags);
    console.log(`✓ Seeded ${seededTags.length} tags\n`);

    const customerTagsCount = await seedCustomerTags(ctx, seededCustomers, seededTags, currentCustomerTags);
    console.log(`✓ Seeded ${customerTagsCount} customer tags\n`);

    console.log("✅ Seed completed successfully!\n");
    console.log("Login credentials:");
    console.log(`  Email: ${currentUser.email}`);
    console.log(`  Password: ${isClient ? "Cliente112345" : isClient1 ? "Prueba@123" : "e2e123456"}`);
    console.log();

    return {
      userId: user.userId,
      businessId: business.id,
      businessUserId,
      productsCount: seededProducts.length,
      variantsCount: seededProducts.reduce((acc, p) => acc + p.variants.length, 0),
      inventoryCount: inventoryItems.length,
      customersCount: seededCustomers.length,
      salesCount: seededSales.length,
      abonosCount: seededAbonos.length,
      distribucionesCount: distribuciones.length,
      suppliersCount: suppliers.length,
      purchasesCount: purchases.length,
      paymentMethodsConfigured: !!paymentMethods,
      tagsCount: seededTags.length,
      customerTagsCount: customerTagsCount,
    };
  }
}

// Funciones para datos reales (IDs preservados)

async function seedRealProducts(
  ctx: RequestContext,
  productsData: any[],
  variantsData: any[][],
  categoryMap: Map<string, string>
): Promise<SeedProduct[]> {
  const existing = await db.query.products.findMany({
    where: (p, { eq }) => eq(p.businessId, ctx.businessId),
  });

  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} products already exist, loading with variants`);
    const seedProducts: SeedProduct[] = [];
    for (const product of existing) {
      const variants = await db.query.productVariants.findMany({
        where: (v, { eq }) => eq(v.productId, product.id),
      });
      seedProducts.push({
        id: product.id,
        name: product.name,
        variants: variants.map(v => ({ id: v.id, name: v.name })),
      });
    }
    return seedProducts;
  }

  const seedProducts: SeedProduct[] = [];

  for (let i = 0; i < productsData.length; i++) {
    const productDef = productsData[i];
    const variantsDef = variantsData[i];

    const categoryId = categoryMap.get(productDef.type) ?? null;
    const categoryColumn = categoryId ? `, category_id` : "";
    const categoryValue = categoryId ? `, '${categoryId}'` : "";

    // Insertar producto con ID preservado usando SQL directo
    await db.execute(`
      INSERT INTO products (id, business_id, name, type, unit, base_price, is_active, created_at${categoryColumn})
      VALUES ('${productDef.id}', '${ctx.businessId}', '${productDef.name.replace(/'/g, "''")}', '${productDef.type}', '${productDef.unit}', '0', ${productDef.isActive}, NOW()${categoryValue})
      ON CONFLICT (id) DO NOTHING
    `);

    console.log(`   ✓ Product: ${productDef.name} (ID: ${productDef.id.slice(-8)})`);

    const seedProduct: SeedProduct = {
      id: productDef.id,
      name: productDef.name,
      variants: [],
    };

    for (const variantDef of variantsDef) {
      // Insertar variante con ID preservado
      await db.execute(`
        INSERT INTO product_variants (id, product_id, business_id, name, sku, unit_quantity, price, is_active, created_at, updated_at)
        VALUES ('${variantDef.id}', '${productDef.id}', '${ctx.businessId}', '${variantDef.name.replace(/'/g, "''")}', '${variantDef.sku}', ${variantDef.unitQuantity}, ${variantDef.price}, true, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `);

      console.log(`     ↳ Variant: ${variantDef.name} (ID: ${variantDef.id.slice(-8)})`);

      seedProduct.variants.push({
        id: variantDef.id,
        name: variantDef.name,
      });
    }

    seedProducts.push(seedProduct);
  }

  return seedProducts;
}

async function seedRealCustomers(ctx: RequestContext, customersData: any[]) {
  if (customersData.length === 0) {
    console.log(`⚠ No customers to seed (empty array)`);
    return [];
  }

  const existing = await db.query.customers.findMany({
    where: (c, { eq }) => eq(c.businessId, ctx.businessId),
  });

  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} customers already exist, skipping`);
    return existing;
  }

  const inserted = [];
  for (const customer of customersData) {
    await db.insert(customersSchema).values({
      id: customer.id,
      businessId: ctx.businessId,
      name: customer.name,
      dni: customer.dni,
      phone: customer.phone,
      address: customer.address,
      notes: customer.notes,
      createdBy: customer.createdBy,
      createdAt: new Date(customer.createdAt),
      updatedAt: new Date(customer.updatedAt),
    });
    inserted.push(customer);
  }

  return inserted;
}

async function seedRealSales(ctx: RequestContext, salesData: any[]) {
  if (salesData.length === 0) {
    console.log(`⚠ No sales to seed (empty array)`);
    return [];
  }

  const existing = await db.query.sales.findMany({
    where: (s, { eq }) => eq(s.businessId, ctx.businessId),
  });

  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} sales already exist, skipping`);
    return existing;
  }

  let totalItems = 0;

  for (const sale of salesData) {
    // Insertar venta con ID preservado
    await db.insert(salesSchema).values({
      id: sale.id,
      businessId: ctx.businessId,
      customerId: sale.customerId,
      sellerId: ctx.businessUserId,
      distribucionId: sale.distribucionId,
      type: sale.type,
      saleType: sale.saleType,
      paymentMode: sale.paymentMode,
      totalAmount: sale.totalAmount,
      amountPaid: sale.amountPaid,
      balanceDue: sale.balanceDue,
      tara: sale.tara,
      netWeight: sale.netWeight,
      saleDate: new Date(sale.saleDate),
      deliveryDate: sale.deliveryDate,
      orderDate: sale.orderDate,
      status: sale.status,
      version: sale.version,
      allowCustomerEdit: sale.allowCustomerEdit,
      cancelledAt: sale.cancelledAt,
      cancelledBy: sale.cancelledBy,
      cancelReason: sale.cancelReason,
      refundAmount: sale.refundAmount,
      refundDate: sale.refundDate,
      refundMethod: sale.refundMethod,
      refundReference: sale.refundReference,
      refundNotes: sale.refundNotes,
      advancePaymentMethod: sale.advancePaymentMethod,
      advanceReferenceNumber: sale.advanceReferenceNumber,
      advanceProofImageId: sale.advanceProofImageId,
      createdAt: new Date(sale.createdAt),
      updatedAt: new Date(sale.updatedAt),
    });

    // Insertar items de la venta con IDs preservados
    for (const item of sale.items) {
      await db.insert(saleItemsSchema).values({
        id: item.id,
        businessId: ctx.businessId,
        saleId: sale.id,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        quantity: item.quantity,
        orderedQuantity: item.orderedQuantity,
        deliveredQuantity: item.deliveredQuantity,
        unitPrice: item.unitPrice,
        unitPriceQuoted: item.unitPriceQuoted,
        unitPriceFinal: item.unitPriceFinal,
        subtotal: item.subtotal,
        isModified: item.isModified,
        originalQuantity: item.originalQuantity,
      });
      totalItems++;
    }
  }

  console.log(`   ✅ ${salesData.length} sales with ${totalItems} items inserted`);

  return salesData;
}

async function seedRealAbonos(ctx: RequestContext, abonosData: any[]) {
  if (abonosData.length === 0) {
    console.log(`⚠ No abonos to seed (empty array)`);
    return [];
  }

  const existing = await db.query.abonos.findMany({
    where: (a, { eq }) => eq(a.businessId, ctx.businessId),
  });

  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} abonos already exist, skipping`);
    return existing;
  }

  for (const abono of abonosData) {
    await db.insert(abonosSchema).values({
      id: abono.id,
      businessId: ctx.businessId,
      customerId: abono.customerId,
      sellerId: ctx.businessUserId,
      amount: abono.amount,
      paymentMethod: abono.paymentMethod,
      notes: abono.notes,
      proofImageId: abono.proofImageId,
      referenceNumber: abono.referenceNumber,
      relatedSaleId: abono.relatedSaleId,
      createdAt: new Date(abono.createdAt),
    });
  }

  return abonosData;
}

// Funciones originales (modo E2E)

async function createBusinessAndLinkUser(userId: string, businessData: typeof TEST_BUSINESS): Promise<{ business: { id: string; name: string }; businessUserId: string }> {
  const tempCtx = RequestContext.forWorker("temp", "temp");

  const business = await repositories.business.create(tempCtx, {
    name: businessData.name,
    ruc: businessData.ruc,
    address: businessData.address,
    phone: businessData.phone,
    email: businessData.email,
  });

  const [businessUser] = await db.insert(businessUsers).values({
    businessId: business.id,
    userId: userId,
    role: "ADMIN_NEGOCIO",
    salesPoint: "Oficina Principal",
  }).returning();

  await repositories.business.update(tempCtx, business.id, {
    modoOperacion: businessData.modoOperacion,
    controlKilos: businessData.controlKilos,
    usarDistribucion: businessData.usarDistribucion,
    permitirVentaSinStock: businessData.permitirVentaSinStock,
  });

  return { business, businessUserId: businessUser.id };
}

async function seedProducts(
  ctx: RequestContext,
  productsData: Array<{
    name: string;
    type: "pollo" | "huevo" | "otro";
    unit: "kg" | "unidad";
    basePrice: string;
    isActive: boolean;
  }>,
  variantsData: Array<Array<{
    name: string;
    sku: string;
    unitQuantity: number;
    price: number;
  }>>,
  categoryMap: Map<string, string>
): Promise<SeedProduct[]> {
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

  for (let i = 0; i < productsData.length; i++) {
    const productDef = productsData[i];
    const variantsDef = variantsData[i];

    const categoryId = categoryMap.get(productDef.type) ?? null;

    const result = await services.product.createProduct(ctx, {
      name: productDef.name,
      categoryId,
      unit: productDef.unit,
      basePrice: parseFloat(productDef.basePrice),
      isActive: productDef.isActive,
    });

    const product = result.data;

    console.log(`   ✓ Product: ${product.name}`);

    const seedProduct: SeedProduct = {
      id: product.id,
      name: product.name,
      variants: [],
    };

    for (const variantDef of variantsDef) {
      const variantResult = await services.productVariant.createVariant(ctx, {
        productId: product.id,
        name: variantDef.name,
        sku: variantDef.sku,
        unitQuantity: variantDef.unitQuantity,
        price: variantDef.price,
        isActive: true,
      });

      const variant = variantResult.data;

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

async function seedSuppliers(ctx: RequestContext, suppliersData: typeof SUPPLIERS): Promise<Array<{ id: string; name: string }>> {
  if (suppliersData.length === 0) {
    console.log(`⚠ No suppliers to seed (empty array)`);
    return [];
  }

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

  for (const supplierDef of suppliersData) {
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
  products: SeedProduct[],
  purchasesData: typeof PURCHASES
): Promise<Array<{ id: string }>> {
  if (purchasesData.length === 0) {
    console.log(`⚠ No purchases to seed (empty array)`);
    return [];
  }

  const existing = await services.purchase.getPurchases(ctx);
  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} purchases already exist, skipping`);
    return existing.map((p) => ({ id: p.id }));
  }

  const seedPurchases: Array<{ id: string }> = [];

  for (const purchaseDef of purchasesData) {
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

async function seedCustomers(ctx: RequestContext, customersData: typeof CUSTOMERS) {
  if (customersData.length === 0) {
    console.log(`⚠ No customers to seed (empty array)`);
    return [];
  }

  const existing = await services.customer.getCustomers(ctx);
  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} customers already exist, skipping`);
    return existing;
  }

  const customers = [];
  for (const customer of customersData) {
    const result = await services.customer.createCustomer(ctx, {
      name: customer.name,
      dni: customer.dni,
      phone: customer.phone,
      address: customer.address,
      notes: customer.notes,
    });
    customers.push(result.data);
  }

  return customers;
}

async function seedSales(
  ctx: RequestContext,
  customers: Array<{ id: string }>,
  products: SeedProduct[],
  salesData: typeof SALES
) {
  if (salesData.length === 0) {
    console.log(`⚠ No sales to seed (empty array)`);
    return [];
  }

  const existing = await services.sale.getSales(ctx);
  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} sales already exist, skipping`);
    return existing;
  }

  const sales = [];
  for (const saleData of salesData) {
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

    const result = await services.sale.createSale(ctx, {
      customerId: customer.id,
      saleType: saleData.saleType,
      totalAmount: saleData.totalAmount,
      amountPaid: saleData.amountPaid,
      tara: saleData.tara,
      netWeight: saleData.netWeight,
      items,
    });

    sales.push(result.data);
  }

  return sales;
}

async function seedAbonos(ctx: RequestContext, customers: Array<{ id: string }>, abonosData: typeof ABONOS) {
  if (abonosData.length === 0) {
    console.log(`⚠ No abonos to seed (empty array)`);
    return [];
  }

  const existing = await services.payment.getPayments(ctx);
  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} abonos already exist, skipping`);
    return existing;
  }

  const abonos = [];
  for (const abonoData of abonosData) {
    const customer = customers[abonoData.customerIndex];
    if (!customer) continue;

    const created = await services.payment.createPayment(ctx, {
      customerId: customer.id,
      amount: abonoData.amount,
      paymentMethod: abonoData.paymentMethod,
      notes: abonoData.notes,
    });

    abonos.push(created);
  }

  return abonos;
}

async function seedDistribuciones(ctx: RequestContext, businessUserId: string, products: SeedProduct[], distribucionesData: typeof DISTRIBUCIONES) {
  if (distribucionesData.length === 0) {
    console.log(`⚠ No distribuciones to seed (empty array)`);
    return [];
  }

  const existing = await services.distribucion.getDistribuciones(ctx);
  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} distribuciones already exist, skipping`);
    return existing;
  }

  const distribuciones = [];
  const seenDates = new Set<string>();

  for (const distData of distribucionesData) {
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
        fecha: distData.fecha,
        modo: "libre",
        items: [
          {
            variantId: products[0].variants[0].id,
            cantidadAsignada: 5,
            unidad: "kg",
          }
        ],
      });
      distribuciones.push(created);
      console.log(`   ✓ Distribución: ${distData.puntoVenta} - 5kg`);
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

async function seedVariantInventory(ctx: RequestContext, products: SeedProduct[]) {
  const inventoryItems = [];
  for (const product of products) {
    for (const variant of product.variants) {
      const existing = await repositories.productVariant.getInventory(ctx, variant.id);
      if (existing) {
        console.log(`⚠ Variant ${variant.name} already has inventory, skipping`);
        continue;
      }
      const created = await repositories.productVariant.createInventory(ctx, {
        variantId: variant.id,
        quantity: "100",
      });
      inventoryItems.push(created);
    }
  }

  return inventoryItems;
}

async function seedPaymentMethods(ctx: RequestContext) {
  const config = await services.paymentMethodConfig.getConfig(ctx);
  const isNewlyCreated = config.createdAt.getTime() === config.updatedAt.getTime();
  if (isNewlyCreated) {
    console.log(`✓ Payment methods configured (default)`);
  } else {
    console.log(`⚠ Payment methods already configured, skipping`);
  }
  return config;
}

async function seedTags(
  ctx: RequestContext,
  tagsData: Array<{ name: string; color: string }>
): Promise<Array<{ id: string; name: string }>> {
  if (tagsData.length === 0) {
    console.log(`⚠ No tags to seed (empty array)`);
    return [];
  }

  const existing = await services.tag.listTags(ctx);
  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} tags already exist, skipping`);
    return existing.map((t) => ({ id: t.id, name: t.name }));
  }

  const seededTags = [];
  for (const tagDef of tagsData) {
    const created = await services.tag.createTag(ctx, {
      name: tagDef.name,
      color: tagDef.color,
    });
    seededTags.push({ id: created.data.id, name: created.data.name });
    console.log(`   ✓ Tag: ${created.data.name} (${created.data.color})`);
  }

  return seededTags;
}

async function seedCustomerTags(
  ctx: RequestContext,
  customers: Array<{ id: string }>,
  tags: Array<{ id: string; name: string }>,
  customerTagsData: Array<{ customerIndex: number; tagIndex: number }>
): Promise<number> {
  if (customerTagsData.length === 0) {
    console.log(`⚠ No customer tags to seed (empty array)`);
    return 0;
  }

  if (customers.length === 0 || tags.length === 0) {
    console.log(`⚠ No customers or tags available for customer-tags`);
    return 0;
  }

  let count = 0;
  for (const ctData of customerTagsData) {
    const customer = customers[ctData.customerIndex];
    const tag = tags[ctData.tagIndex];

    if (!customer || !tag) {
      console.log(`   ⚠ Skipping customer-tag: invalid index`);
      continue;
    }

    try {
      await services.customerTag.addTagToCustomer(ctx, customer.id, tag.id);
      count++;
      console.log(`   ✓ Customer-Tag: ${customer.id.slice(-8)} -> ${tag.name}`);
    } catch (error) {
      // Tag might already be assigned, ignore
      console.log(`   ℹ Customer-Tag already exists: ${customer.id.slice(-8)} -> ${tag.name}`);
    }
  }

  return count;
}

async function clearExistingData() {
  await db.delete(saleItemsSchema);
  await db.delete(salesSchema);
  await db.delete(abonosSchema);
  await db.delete(distribuciones);
  await db.delete(customersSchema);
  await db.delete(purchaseItems);
  await db.delete(purchases);
  await db.delete(suppliersSchema);
  await db.delete(productVariantsSchema); // Also clears variant_inventory via CASCADE
  await db.delete(productsSchema);
  await db.delete(businessPaymentSettings);
  console.log("✓ Cleared existing data\n");
}

// Run seed if this file is executed directly
if (import.meta.main) {
  seedDatabase()
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
      console.log(`  Payment Methods: ${result.paymentMethodsConfigured ? "✓ Configured" : "✗ Not Configured"}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Seed failed:", error);
      process.exit(1);
    });
}
