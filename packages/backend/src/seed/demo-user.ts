import { auth } from "../lib/auth";
import { db } from "../lib/db";
import { businesses, businessUsers } from "../db/schema";
import { eq } from "drizzle-orm";
import { RequestContext } from "../context/request-context";
import { services } from "./services";
import { backfillSyncOperations } from "./backfill-sync-operations";

const DEMO_USER = {
  email: "demo@avileo.com",
  password: "demo123456",
  name: "Usuario Demo",
};

const DEMO_BUSINESS = {
  name: "Pollos Demo",
  ruc: "12345678901",
  address: "Av. Demo 123",
  phone: "999888777",
  email: "demo@avileo.com",
};

// Demo data - full dataset for development
const DEMO_PRODUCTS = [
  {
    name: "Pollo Entero",
    type: "pollo" as const,
    unit: "kg" as const,
    basePrice: "12.50",
    isActive: true,
  },
  {
    name: "Huevos",
    type: "huevo" as const,
    unit: "unidad" as const,
    basePrice: "0.80",
    isActive: true,
  },
  {
    name: "Menudencias",
    type: "otro" as const,
    unit: "kg" as const,
    basePrice: "15.00",
    isActive: true,
  },
];

const DEMO_PRODUCT_VARIANTS = [
  // Pollo Entero
  [
    { name: "Entero (kg)", sku: "POL-ENT", unitQuantity: 1, price: 12.5 },
    { name: "Medio Pollo", sku: "POL-MED", unitQuantity: 0.5, price: 6.5 },
  ],
  // Huevos
  [
    { name: "Unidad", sku: "HUE-UNI", unitQuantity: 1, price: 0.8 },
    { name: "Maple (30un)", sku: "HUE-MAP", unitQuantity: 30, price: 21.0 },
    { name: "Cubeta (180un)", sku: "HUE-CUB", unitQuantity: 180, price: 120.0 },
  ],
  // Menudencias
  [
    { name: "Mollejas", sku: "MEN-MOL", unitQuantity: 0.5, price: 14.0 },
    { name: "Patitas", sku: "MEN-PAT", unitQuantity: 1, price: 12.0 },
    { name: "Alas", sku: "MEN-ALA", unitQuantity: 1, price: 19.0 },
  ],
];

const DEMO_CUSTOMERS = [
  { name: "Maria Garcia", dni: "45678912", phone: "999111222", address: "Jr. Las Flores 456", notes: "Cliente frecuente" },
  { name: "Juan Perez", dni: "12345678", phone: "999333444", address: "Av. Los Pinos 789", notes: "" },
  { name: "Carmen Rodriguez", dni: "87654321", phone: "999555666", address: "Calle Luna 321", notes: "Paga puntual" },
  { name: "Pedro Sanchez", dni: "23456789", phone: "999777888", address: "Av. Sol 654", notes: "Cliente nuevo" },
];

const DEMO_SUPPLIERS = [
  {
    name: "Avícola El Buen Sabor",
    type: "regular" as const,
    ruc: "20123456789",
    address: "Av. Principal 123, Lima",
    phone: "987654321",
    email: "ventas@avicola.com",
    notes: "Proveedor principal de pollo. Entrega diaria.",
  },
  {
    name: "Granja Los Andes",
    type: "regular" as const,
    ruc: "20987654321",
    address: "Carretera Central Km 25",
    phone: "912345678",
    email: "contacto@granjalosandes.com",
    notes: "Huevos de calidad premium",
  },
];

interface SeedProduct {
  id: string;
  name: string;
  variants: Array<{ id: string; name: string }>;
}

export async function seedDemoUser() {
  console.log("🌱 Seeding demo user...\n");

  // Check if demo user already exists
  const existingUser = await db.query.user.findFirst({
    where: (user, { eq }) => eq(user.email, DEMO_USER.email),
  });

  let userId: string;

  if (existingUser) {
    console.log(`⚠ Demo user already exists (ID: ${existingUser.id})`);
    userId = existingUser.id;
  } else {
    // Create user using Better Auth API
    try {
      const result = await auth.api.signUpEmail({
        body: {
          email: DEMO_USER.email,
          password: DEMO_USER.password,
          name: DEMO_USER.name,
        },
      });
      userId = result.user.id;
      console.log(`✓ Demo user created (ID: ${userId})`);
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.message?.includes("already registered")) {
        console.log(`⚠ Demo user already exists`);
        // Try to sign in to get user info
        const result = await auth.api.signInEmail({
          body: {
            email: DEMO_USER.email,
            password: DEMO_USER.password,
          },
        });
        userId = result.user.id;
        console.log(`✓ Found existing demo user (ID: ${userId})`);
      } else {
        throw new Error(`Failed to create demo user: ${error?.message || error}`);
      }
    }
  }

  // Check if business already exists for this user
  const existingBusinessUser = await db.query.businessUsers.findFirst({
    where: eq(businessUsers.userId, userId),
  });

  let businessId: string;
  let businessUserId: string;

  if (existingBusinessUser) {
    console.log(`⚠ Business already linked to demo user`);
    businessId = existingBusinessUser.businessId;
    businessUserId = existingBusinessUser.id;
  } else {
    // Create business
    const [business] = await db
      .insert(businesses)
      .values({
        name: DEMO_BUSINESS.name,
        ruc: DEMO_BUSINESS.ruc,
        address: DEMO_BUSINESS.address,
        phone: DEMO_BUSINESS.phone,
        email: DEMO_BUSINESS.email,
        modoOperacion: "inventario_propio",
        controlKilos: true,
        usarDistribucion: true,
        permitirVentaSinStock: false,
      })
      .returning();

    // Link user to business as admin
    const [bu] = await db.insert(businessUsers).values({
      businessId: business.id,
      userId: userId,
      role: "ADMIN_NEGOCIO",
      salesPoint: "Oficina Principal",
    }).returning();

    businessId = business.id;
    businessUserId = bu.id;

    console.log(`✓ Business created: ${business.name} (ID: ${business.id})`);
    console.log(`✓ User linked to business as ADMIN_NEGOCIO`);
  }

  // Create context for seeding data
  const ctx = RequestContext.forWorker(businessId, businessUserId);

  // Seed all demo data
  await seedDemoData(ctx);

  // Run backfill to create sync operations
  console.log("\n🔄 Running sync operations backfill...");
  const backfillResults = await backfillSyncOperations(businessId);
  const totalCreated = backfillResults.reduce((sum, r) => sum + r.created, 0);
  const totalSkipped = backfillResults.reduce((sum, r) => sum + r.skipped, 0);
  console.log(`✓ Backfill complete: ${totalCreated} created, ${totalSkipped} skipped`);

  console.log("\n✅ Demo user seed completed!");
  console.log("\nLogin credentials:");
  console.log(`  Email: ${DEMO_USER.email}`);
  console.log(`  Password: ${DEMO_USER.password}`);
}

async function seedDemoData(ctx: RequestContext) {
  console.log("\n📦 Seeding demo data...\n");

  // Seed payment methods
  const config = await services.paymentMethodConfig.getConfig(ctx);
  console.log(`✓ Payment methods configured`);

  // Seed products
  const products = await seedProducts(ctx);
  console.log(`✓ Seeded ${products.length} products with variants`);

  // Seed inventory
  await seedInventory(ctx, products);
  console.log(`✓ Inventory stocked`);

  // Seed suppliers
  const suppliers = await seedSuppliers(ctx);
  console.log(`✓ Seeded ${suppliers.length} suppliers`);

  // Seed customers
  const customers = await seedCustomers(ctx);
  console.log(`✓ Seeded ${customers.length} customers`);

  // Skip sales and abonos for cleaner demo
  // const sales = await seedSales(ctx, customers, products);
  // console.log(`✓ Seeded ${sales.length} sales`);

  // const abonos = await seedAbonos(ctx, customers);
  // console.log(`✓ Seeded ${abonos.length} abonos`);
}

async function seedProducts(ctx: RequestContext): Promise<SeedProduct[]> {
  const existing = await services.product.getProducts(ctx);
  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} products already exist, loading with variants`);
    const seedProducts: SeedProduct[] = [];
    for (const product of existing) {
      if (!product.id) continue;
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

  for (let i = 0; i < DEMO_PRODUCTS.length; i++) {
    const productDef = DEMO_PRODUCTS[i];
    const variantsDef = DEMO_PRODUCT_VARIANTS[i];

    const result = await services.product.createProduct(ctx, {
      name: productDef.name,
      type: productDef.type,
      unit: productDef.unit,
      basePrice: parseFloat(productDef.basePrice),
      isActive: productDef.isActive,
    });

    const product = result.data;

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

      seedProduct.variants.push({
        id: variant.id,
        name: variant.name,
      });
    }

    seedProducts.push(seedProduct);
  }

  return seedProducts;
}

async function seedInventory(ctx: RequestContext, products: SeedProduct[]) {
  // Seed variant inventory instead of deprecated product-level inventory
  for (const product of products) {
    for (const variant of product.variants) {
      // Check if variant inventory already exists
      const existing = await services.productVariant.getInventory(ctx, variant.id);
      if (existing) {
        console.log(`⚠ Variant ${variant.name} already has inventory, skipping`);
        continue;
      }
      // Create variant inventory with initial stock of 100
      await services.productVariant.createInventory(ctx, {
        variantId: variant.id,
        quantity: "100",
      });
    }
  }
}

async function seedSuppliers(ctx: RequestContext) {
  const existing = await services.supplier.getSuppliers(ctx);
  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} suppliers already exist, skipping`);
    return existing;
  }

  const suppliers = [];
  for (const supplierDef of DEMO_SUPPLIERS) {
    const supplier = await services.supplier.createSupplier(ctx, {
      name: supplierDef.name,
      type: supplierDef.type,
      ruc: supplierDef.ruc,
      address: supplierDef.address,
      phone: supplierDef.phone,
      email: supplierDef.email,
      notes: supplierDef.notes,
    });
    suppliers.push(supplier);
  }

  return suppliers;
}

async function seedCustomers(ctx: RequestContext) {
  const existing = await services.customer.getCustomers(ctx);
  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} customers already exist, skipping`);
    return existing;
  }

  const customers = [];
  for (const customer of DEMO_CUSTOMERS) {
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
  products: SeedProduct[]
) {
  const existing = await services.sale.getSales(ctx);
  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} sales already exist, skipping`);
    return existing;
  }

  const sales = [];
  const saleDate = new Date();

  // Create sample sales
  const sampleSales = [
    { customerIndex: 0, saleType: "contado" as const, totalAmount: 25.0, amountPaid: 25.0, items: [{ productIndex: 0, quantity: 2, unitPrice: 12.5 }] },
    { customerIndex: 1, saleType: "credito" as const, totalAmount: 42.0, amountPaid: 0, items: [{ productIndex: 1, quantity: 2, unitPrice: 21.0 }] },
    { customerIndex: 2, saleType: "contado" as const, totalAmount: 15.0, amountPaid: 15.0, items: [{ productIndex: 2, quantity: 1, unitPrice: 15.0 }] },
  ];

  for (const saleData of sampleSales) {
    const customer = customers[saleData.customerIndex];
    if (!customer) continue;

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
      items,
    });

    sales.push(result.data);
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
  // Create sample abono for the credit sale customer
  if (customers.length > 1) {
    try {
      const created = await services.payment.createPayment(ctx, {
        customerId: customers[1].id,
        amount: 20.0,
        paymentMethod: "efectivo",
        notes: "Primer abono",
      });
      abonos.push(created);
    } catch (error: any) {
      // Skip if customer has no debt (contado sale or already paid)
      if (error?.message?.includes("no tiene deuda") || error?.statusCode === 400) {
        console.log(`⚠ No pending debt for customer, skipping abono`);
      } else {
        throw error;
      }
    }
  }

  return abonos;
}

// Run if executed directly
if (import.meta.main) {
  seedDemoUser()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n❌ Seed failed:", error);
      process.exit(1);
    });
}
