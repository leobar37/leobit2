import { db, businessUsers } from "../lib/db";
import { RequestContext } from "../context/request-context";
import { createTestUser, createClientUser } from "./auth";
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
  ORDERS,
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
  ORDERS as CLIENT_ORDERS,
} from "./client-data";
import { inventory, saleItems, sales, abonos, distribuciones, customers, products, suppliers as suppliersSchema, purchaseItems, purchases, productVariants, businessPaymentSettings } from "../db/schema";

const FORCE_MODE = process.argv.includes("--force");
const CLIENT_MODE = process.argv.includes("--client");

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
}

export async function seedDatabase(): Promise<SeedResult> {
  console.log("🌱 Starting database seed...\n");

  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed cannot run in production environment");
  }

  // Select data based on mode
  const isClient = CLIENT_MODE;
  const currentUser = isClient ? CLIENT_USER : { email: "e2e@avileo.com", password: "e2e123456", name: "Usuario E2E" };
  const currentBusiness = isClient ? CLIENT_BUSINESS : TEST_BUSINESS;
  const currentProducts = isClient ? CLIENT_PRODUCTS : PRODUCTS;
  const currentProductVariants = isClient ? CLIENT_PRODUCT_VARIANTS : PRODUCT_VARIANTS;
  const currentCustomers = isClient ? CLIENT_CUSTOMERS : CUSTOMERS;
  const currentSales = isClient ? CLIENT_SALES : SALES;
  const currentAbonos = isClient ? CLIENT_ABONOS : ABONOS;
  const currentDistribuciones = isClient ? CLIENT_DISTRIBUCIONES : DISTRIBUCIONES;
  const currentSuppliers = isClient ? CLIENT_SUPPLIERS : SUPPLIERS;
  const currentPurchases = isClient ? CLIENT_PURCHASES : PURCHASES;
  const currentOrders = isClient ? CLIENT_ORDERS : ORDERS;

  if (FORCE_MODE && !isClient) {
    console.log("⚠️ FORCE MODE: Clearing existing seeded data...\n");
    await clearExistingData();
  }

  // Create user (different function for client vs e2e)
  const user = isClient
    ? await createClientUser(currentUser.email, currentUser.password, currentUser.name)
    : await createTestUser();
  console.log();

  const { business, businessUserId } = await createBusinessAndLinkUser(user.userId, currentBusiness);
  console.log(`✓ Business created: ${business.name} (ID: ${business.id})\n`);

  const ctx = RequestContext.forWorker(business.id, businessUserId);
  console.log("Created admin context for seeding\n");

  const paymentMethods = await seedPaymentMethods(ctx);
  console.log(`✓ Payment methods configured\n`);

  const seededProducts = await seedProducts(ctx, currentProducts, currentProductVariants);
  console.log(`✓ Seeded ${seededProducts.length} products with variants\n`);

  const suppliers = await seedSuppliers(ctx, currentSuppliers);
  console.log(`✓ Seeded ${suppliers.length} suppliers\n`);

  const purchases = await seedPurchases(ctx, suppliers, seededProducts, currentPurchases);
  console.log(`✓ Seeded ${purchases.length} purchases\n`);

  const inventoryItems = await seedInventory(ctx, seededProducts);
  console.log(`✓ Seeded ${inventoryItems.length} inventory items\n`);

  const seededCustomers = await seedCustomers(ctx, currentCustomers);
  console.log(`✓ Seeded ${seededCustomers.length} customers\n`);

  const seededSales = await seedSales(ctx, seededCustomers, seededProducts, currentSales);
  console.log(`✓ Seeded ${seededSales.length} sales\n`);

  const seededAbonos = await seedAbonos(ctx, seededCustomers, currentAbonos);
  console.log(`✓ Seeded ${seededAbonos.length} abonos\n`);

  const distribuciones = await seedDistribuciones(ctx, businessUserId, seededProducts, currentDistribuciones);
  console.log(`✓ Seeded ${distribuciones.length} distribuciones\n`);

  const seededOrders = await seedOrders(ctx, seededCustomers, seededProducts, currentOrders);
  console.log(`✓ Seeded ${seededOrders.length} orders\n`);

  console.log("✅ Seed completed successfully!\n");
  console.log("Login credentials:");
  console.log(`  Email: ${currentUser.email}`);
  console.log(`  Password: ${isClient ? "Cliente112345" : "e2e123456"}`);
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
    ordersCount: seededOrders.length,
    paymentMethodsConfigured: !!paymentMethods,
  };
}

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

async function seedProducts(ctx: RequestContext, productsData: typeof PRODUCTS, variantsData: typeof PRODUCT_VARIANTS): Promise<SeedProduct[]> {
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
      clientId: customer.id,
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

async function seedOrders(
  ctx: RequestContext,
  customers: Array<{ id: string }>,
  products: SeedProduct[],
  ordersData: typeof ORDERS
) {
  if (ordersData.length === 0) {
    console.log(`⚠ No orders to seed (empty array)`);
    return [];
  }

  const existing = await services.order.getOrders(ctx);
  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} orders already exist, skipping`);
    return existing;
  }

  const orders = [];
  for (const orderData of ordersData) {
    const customer = customers[orderData.customerIndex];
    if (!customer) continue;

    const items = orderData.items.map((item) => {
      const product = products[item.productIndex];
      const variant = product.variants[item.variantIndex];
      return {
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        variantName: variant.name,
        orderedQuantity: item.orderedQuantity,
        unitPriceQuoted: item.unitPriceQuoted,
      };
    });

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => 
      sum + (item.orderedQuantity * item.unitPriceQuoted), 0
    );

    // Create order based on status
    let created;
    if (orderData.status === "draft") {
      created = await services.order.createOrder(ctx, {
        clientId: customer.id,
        deliveryDate: orderData.deliveryDate,
        paymentIntent: orderData.paymentIntent,
        totalAmount,
        items,
      });
    } else if (orderData.status === "confirmed") {
      const draft = await services.order.createOrder(ctx, {
        clientId: customer.id,
        deliveryDate: orderData.deliveryDate,
        paymentIntent: orderData.paymentIntent,
        totalAmount,
        items,
      });
      created = await services.order.confirmOrder(ctx, draft.id, draft.version);
    }

    if (created) {
      orders.push(created);
      console.log(`   ✓ Order: ${created.id.slice(-8)} - ${orderData.status} - S/ ${orderData.totalAmount}`);
    }
  }

  return orders;
}

async function clearExistingData() {
  const { orderItems, orders } = await import("../db/schema/orders");
  await db.delete(orderItems);
  await db.delete(orders);
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
      console.log(`  Orders: ${result.ordersCount}`);
      console.log(`  Payment Methods: ${result.paymentMethodsConfigured ? "✓ Configured" : "✗ Not Configured"}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Seed failed:", error);
      process.exit(1);
    });
}
