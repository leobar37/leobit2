import { db, businessUsers } from "../lib/db";
import { RequestContext } from "../context/request-context";
import { createTestUser } from "./auth";
import { services } from "./services";
import { repositories } from "./services";
import {
  TEST_BUSINESS,
  PRODUCTS,
  CUSTOMERS,
  SALES,
  ABONOS,
  DISTRIBUCIONES,
} from "./data";

interface SeedResult {
  userId: string;
  businessId: string;
  productsCount: number;
  customersCount: number;
  salesCount: number;
  abonosCount: number;
  distribucionesCount: number;
}

async function seed(): Promise<SeedResult> {
  console.log("🌱 Starting database seed...\n");

  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed cannot run in production environment");
  }

  const user = await createTestUser();
  console.log();

  const business = await createBusinessAndLinkUser(user.userId);
  console.log(`✓ Business created: ${business.name} (ID: ${business.id})\n`);

  const ctx = RequestContext.forWorker(business.id);
  console.log("Created admin context for seeding\n");

  const products = await seedProducts(ctx);
  console.log(`✓ Seeded ${products.length} products\n`);

  const customers = await seedCustomers(ctx);
  console.log(`✓ Seeded ${customers.length} customers\n`);

  const sales = await seedSales(ctx, customers, products);
  console.log(`✓ Seeded ${sales.length} sales\n`);

  const abonos = await seedAbonos(ctx, customers);
  console.log(`✓ Seeded ${abonos.length} abonos\n`);

  const distribuciones = await seedDistribuciones(ctx, user.userId);
  console.log(`✓ Seeded ${distribuciones.length} distribuciones\n`);

  console.log("✅ Seed completed successfully!\n");
  console.log("Login credentials:");
  console.log(`  Email: demo@avileo.com`);
  console.log(`  Password: demo123456`);
  console.log();

  return {
    userId: user.userId,
    businessId: business.id,
    productsCount: products.length,
    customersCount: customers.length,
    salesCount: sales.length,
    abonosCount: abonos.length,
    distribucionesCount: distribuciones.length,
  };
}

async function createBusinessAndLinkUser(userId: string) {
  const existingMembership = await db.query.businessUsers.findFirst({
    where: (bu, { eq }) => eq(bu.userId, userId),
    with: { business: true },
  });

  if (existingMembership && existingMembership.business) {
    const business = existingMembership.business as { id: string; name: string };
    console.log(`⚠ User already linked to business: ${business.name}`);
    return business;
  }

  const tempCtx = RequestContext.forWorker("temp");

  const business = await repositories.business.create(tempCtx, {
    name: TEST_BUSINESS.name,
    ruc: TEST_BUSINESS.ruc,
    address: TEST_BUSINESS.address,
    phone: TEST_BUSINESS.phone,
    email: TEST_BUSINESS.email,
  });

  await db.insert(businessUsers).values({
    businessId: business.id,
    userId: userId,
    role: "ADMIN_NEGOCIO",
    salesPoint: "Oficina Principal",
  });

  await repositories.business.update(tempCtx, business.id, {
    modoOperacion: TEST_BUSINESS.modoOperacion,
    controlKilos: TEST_BUSINESS.controlKilos,
    usarDistribucion: TEST_BUSINESS.usarDistribucion,
    permitirVentaSinStock: TEST_BUSINESS.permitirVentaSinStock,
  });

  return business;
}

async function seedProducts(ctx: RequestContext) {
  const existing = await services.product.getProducts(ctx);
  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} products already exist, skipping`);
    return existing;
  }

  const products = [];
  for (const product of PRODUCTS) {
    const created = await services.product.createProduct(ctx, {
      name: product.name,
      type: product.type,
      unit: product.unit,
      basePrice: parseFloat(product.basePrice),
      isActive: product.isActive,
    });
    products.push(created);
  }

  return products;
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
  products: Array<{ id: string; name: string }>
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
      return {
        productId: product.id,
        productName: product.name,
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

async function seedDistribuciones(ctx: RequestContext, userId: string) {
  const existing = await services.distribucion.getDistribuciones(ctx);
  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} distribuciones already exist, skipping`);
    return existing;
  }

  const distribuciones = [];
  for (const distData of DISTRIBUCIONES) {
    const created = await services.distribucion.createDistribucion(ctx, {
      vendedorId: userId,
      puntoVenta: distData.puntoVenta,
      kilosAsignados: distData.kilosAsignados,
      fecha: distData.fecha,
    });

    distribuciones.push(created);
  }

  return distribuciones;
}

seed()
  .then((result) => {
    console.log("\n📊 Seed Summary:");
    console.log(`  User ID: ${result.userId}`);
    console.log(`  Business ID: ${result.businessId}`);
    console.log(`  Products: ${result.productsCount}`);
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
