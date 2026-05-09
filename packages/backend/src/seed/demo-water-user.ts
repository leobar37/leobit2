import { auth } from "../lib/auth";
import { db } from "../lib/db";
import { businesses, businessUsers } from "../db/schema";
import { eq } from "drizzle-orm";
import { RequestContext } from "../context/request-context";
import { services, repositories, seedDefaultCategories } from "./services";
import { WaterRouteRepository } from "../services/repository/water-route.repository";
import { WaterCustomerProfileRepository } from "../services/repository/water-customer-profile.repository";
import { VisitaRepository } from "../services/repository/visita.repository";
import { DistribucionRepository } from "../services/repository/distribucion.repository";

const WATER_USER = {
  email: "agua@avileo.com",
  password: "agua123456",
  name: "Usuario Agua",
};

const WATER_BUSINESS = {
  name: "Agua Pura Demo",
  ruc: "10987654321",
  address: "Av. del Agua 456, Lima",
  phone: "999000111",
  email: "agua@avileo.com",
};

const WATER_CATEGORIES = [
  { name: "Bidón", color: "#0ea5e9" },
  { name: "Accesorios", color: "#64748b" },
];

const WATER_PRODUCTS = [
  {
    name: "Bidón 20L",
    type: "bidon" as const,
    unit: "unidad" as const,
    basePrice: "8.00",
    isActive: true,
  },
  {
    name: "Bidón 10L",
    type: "bidon" as const,
    unit: "unidad" as const,
    basePrice: "5.00",
    isActive: true,
  },
  {
    name: "Dispensador",
    type: "accesorio" as const,
    unit: "unidad" as const,
    basePrice: "45.00",
    isActive: true,
  },
];

const WATER_PRODUCT_VARIANTS = [
  // Bidón 20L
  [
    { name: "Con retorno", sku: "BID-20-RET", unitQuantity: 1, price: 8.0 },
    { name: "Sin retorno", sku: "BID-20-SIN", unitQuantity: 1, price: 12.0 },
  ],
  // Bidón 10L
  [
    { name: "Con retorno", sku: "BID-10-RET", unitQuantity: 1, price: 5.0 },
    { name: "Sin retorno", sku: "BID-10-SIN", unitQuantity: 1, price: 8.0 },
  ],
  // Dispensador
  [
    { name: "Eléctrico", sku: "DIS-ELEC", unitQuantity: 1, price: 45.0 },
    { name: "Manual", sku: "DIS-MANU", unitQuantity: 1, price: 25.0 },
  ],
];

const WATER_CUSTOMERS = [
  {
    name: "Carlos Mendoza",
    dni: "45678912",
    phone: "999111222",
    address: "Jr. Las Flores 456",
    notes: "Cliente frecuente, pide cada lunes",
  },
  {
    name: "Ana Torres",
    dni: "12345678",
    phone: "999333444",
    address: "Av. Los Pinos 789",
    notes: "Cliente recurrente, ruta norte",
  },
  {
    name: "Luis Ramírez",
    dni: "87654321",
    phone: "999555666",
    address: "Calle Luna 321",
    notes: "Paga puntual, ruta sur",
  },
];

const WATER_VENDEDOR = {
  email: "repartidor.agua@avileo.com",
  password: "agua123456",
  name: "Repartidor Agua",
};

const WATER_ROUTES = [
  { name: "Ruta Norte", zone: "Los Olivos", description: "Zona norte de Lima" },
  { name: "Ruta Sur", zone: "Surco", description: "Zona sur de Lima" },
];

interface SeedProduct {
  id: string;
  name: string;
  variants: Array<{ id: string; name: string }>;
}

interface SeedCustomer {
  id: string;
  name: string;
}

export async function seedWaterUser() {
  console.log("🌱 Seeding water user...\n");

  // Check if water user already exists
  const existingUser = await db.query.user.findFirst({
    where: (user, { eq: compare }) => compare(user.email, WATER_USER.email),
  });

  let userId: string;

  if (existingUser) {
    console.log(`⚠ Water user already exists (ID: ${existingUser.id})`);
    userId = existingUser.id;
  } else {
    try {
      const result = await auth.api.signUpEmail({
        body: {
          email: WATER_USER.email,
          password: WATER_USER.password,
          name: WATER_USER.name,
        },
      });
      userId = result.user.id;
      console.log(`✓ Water user created (ID: ${userId})`);
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.message?.includes("already registered")) {
        console.log(`⚠ Water user already exists`);
        const result = await auth.api.signInEmail({
          body: {
            email: WATER_USER.email,
            password: WATER_USER.password,
          },
        });
        userId = result.user.id;
        console.log(`✓ Found existing water user (ID: ${userId})`);
      } else {
        throw new Error(`Failed to create water user: ${error?.message || error}`);
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
    console.log(`⚠ Business already linked to water user`);
    businessId = existingBusinessUser.businessId;
    businessUserId = existingBusinessUser.id;
  } else {
    // Create business with water mode
    const [business] = await db
      .insert(businesses)
      .values({
        name: WATER_BUSINESS.name,
        ruc: WATER_BUSINESS.ruc,
        address: WATER_BUSINESS.address,
        phone: WATER_BUSINESS.phone,
        email: WATER_BUSINESS.email,
        usarDistribucion: true,
        businessMode: "agua",
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

    console.log(`✓ Water business created: ${business.name} (ID: ${business.id})`);
    console.log(`✓ User linked to business as ADMIN_NEGOCIO`);

    // Create vendedor/repartidor user for route assignment
    try {
      const vendedorResult = await auth.api.signUpEmail({
        body: {
          email: WATER_VENDEDOR.email,
          password: WATER_VENDEDOR.password,
          name: WATER_VENDEDOR.name,
        },
      });
      await db.insert(businessUsers).values({
        businessId: business.id,
        userId: vendedorResult.user.id,
        role: "VENDEDOR",
        salesPoint: "Movil",
      });
      console.log(`✓ Vendedor created: ${WATER_VENDEDOR.email}`);
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.message?.includes("already registered")) {
        console.log(`⚠ Vendedor already exists`);
      } else {
        console.log(`⚠ Could not create vendedor: ${error?.message || error}`);
      }
    }
  }

  // Create context for seeding data
  const ctx = RequestContext.forWorker(businessId, businessUserId);

  // Seed all water demo data
  await seedWaterDemoData(ctx);

  console.log("\n✅ Water user seed completed!");
  console.log("\nLogin credentials (Admin):");
  console.log(`  Email: ${WATER_USER.email}`);
  console.log(`  Password: ${WATER_USER.password}`);
  console.log("\nLogin credentials (Repartidor):");
  console.log(`  Email: ${WATER_VENDEDOR.email}`);
  console.log(`  Password: ${WATER_VENDEDOR.password}`);
}

async function seedWaterDemoData(ctx: RequestContext) {
  console.log("\n📦 Seeding water demo data...\n");

  // Seed payment methods
  await services.paymentMethodConfig.getConfig(ctx);
  console.log(`✓ Payment methods configured`);

  // Seed categories
  const categoryMap = await seedDefaultCategories(ctx, WATER_CATEGORIES);
  console.log(`✓ Seeded ${categoryMap.size} categories`);

  // Seed products
  const products = await seedWaterProducts(ctx, categoryMap);
  console.log(`✓ Seeded ${products.length} products with variants`);

  // Seed inventory
  await seedWaterInventory(ctx, products);
  console.log(`✓ Inventory stocked`);

  // Seed customers
  const customers = await seedWaterCustomers(ctx);
  console.log(`✓ Seeded ${customers.length} customers`);

  // Seed water routes
  const routes = await seedWaterRoutes(ctx);
  console.log(`✓ Seeded ${routes.length} water routes`);

  // Seed water customer profiles
  await seedWaterCustomerProfiles(ctx, customers, routes);
  console.log(`✓ Seeded water customer profiles`);
}

async function seedWaterProducts(
  ctx: RequestContext,
  categoryMap: Map<string, string>
): Promise<SeedProduct[]> {
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

  for (let i = 0; i < WATER_PRODUCTS.length; i++) {
    const productDef = WATER_PRODUCTS[i];
    const variantsDef = WATER_PRODUCT_VARIANTS[i];

    const categoryId = categoryMap.get("bidón") ?? null;

    const result = await services.product.createProduct(ctx, {
      name: productDef.name,
      categoryId,
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

async function seedWaterInventory(ctx: RequestContext, products: SeedProduct[]) {
  for (const product of products) {
    for (const variant of product.variants) {
      const existing = await repositories.productVariant.getInventory(ctx, variant.id);
      if (existing) {
        console.log(`⚠ Variant ${variant.name} already has inventory, skipping`);
        continue;
      }
      await repositories.productVariant.createInventory(ctx, {
        variantId: variant.id,
        quantity: "100",
      });
    }
  }
}

async function seedWaterCustomers(ctx: RequestContext): Promise<SeedCustomer[]> {
  const existing = await services.customer.getCustomers(ctx);
  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} customers already exist, skipping`);
    return existing.map(c => ({ id: c.id, name: c.name }));
  }

  const customers: SeedCustomer[] = [];
  for (const customer of WATER_CUSTOMERS) {
    const result = await services.customer.createCustomer(ctx, {
      name: customer.name,
      dni: customer.dni,
      phone: customer.phone,
      address: customer.address,
      notes: customer.notes,
    });
    customers.push({ id: result.data.id, name: result.data.name });
  }

  return customers;
}

async function seedWaterRoutes(ctx: RequestContext) {
  const routeRepo = new WaterRouteRepository();
  const existing = await routeRepo.findMany(ctx, true);
  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} routes already exist, skipping`);
    return existing;
  }

  const routes = [];
  for (const routeDef of WATER_ROUTES) {
    const route = await routeRepo.create(ctx, {
      name: routeDef.name,
      zone: routeDef.zone,
      description: routeDef.description,
    });
    routes.push(route);
  }

  return routes;
}

async function seedWaterCustomerProfiles(
  ctx: RequestContext,
  customers: SeedCustomer[],
  routes: Array<{ id: string; name: string }>
) {
  const profileRepo = new WaterCustomerProfileRepository();

  const profiles = [
    {
      customerIndex: 0,
      routeIndex: 0,
      frequency: "weekly" as const,
      days: ["monday"],
      defaultQty: 2,
      containersAtCustomer: 0,
      depositAmount: "0",
      depositStatus: "none" as const,
      instructions: "Dejar en la puerta",
    },
    {
      customerIndex: 1,
      routeIndex: 0,
      frequency: "weekly" as const,
      days: ["tuesday"],
      defaultQty: 1,
      containersAtCustomer: 0,
      depositAmount: "0",
      depositStatus: "none" as const,
      instructions: "Llamar antes de llegar",
    },
    {
      customerIndex: 2,
      routeIndex: 1,
      frequency: "biweekly" as const,
      days: ["friday"],
      defaultQty: 3,
      containersAtCustomer: 0,
      depositAmount: "0",
      depositStatus: "none" as const,
      instructions: "Entregar después de las 3pm",
    },
  ];

  for (const profileDef of profiles) {
    const customer = customers[profileDef.customerIndex];
    const route = routes[profileDef.routeIndex];
    if (!customer || !route) continue;

    const existing = await profileRepo.findByCustomerId(ctx, customer.id);
    if (existing) {
      console.log(`⚠ Profile for ${customer.name} already exists, skipping`);
      continue;
    }

    await profileRepo.create(ctx, customer.id, {
      deliveryFrequency: profileDef.frequency,
      deliveryDays: profileDef.days,
      defaultContainerQuantity: profileDef.defaultQty,
      containersAtCustomer: profileDef.containersAtCustomer,
      depositAmount: profileDef.depositAmount,
      depositStatus: profileDef.depositStatus,
      waterRouteId: route.id,
      deliveryInstructions: profileDef.instructions,
    });
  }
}

// Run if executed directly
if (import.meta.main) {
  seedWaterUser()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n❌ Water seed failed:", error);
      process.exit(1);
    });
}
