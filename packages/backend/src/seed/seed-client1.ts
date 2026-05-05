import { auth } from "../lib/auth";
import { db } from "../lib/db";
import { businesses, businessUsers } from "../db/schema";
import { eq } from "drizzle-orm";
import { RequestContext } from "../context/request-context";
import { services, repositories, seedDefaultCategories } from "./services";


const CLIENT1_USER = {
  email: "cliente1@gmail.com",
  password: "Prueba@123",
  name: "Cliente Uno",
};

const CLIENT1_BUSINESS = {
  name: "Pollería y Bodega Cliente 1",
  ruc: "20567890123",
  address: "Av. Los Pollos 123, Lima",
  phone: "999111222",
  email: "cliente1@gmail.com",
};

// Productos: Pollo, Azúcar, Huevos (con variantes específicas)
const CLIENT1_CATEGORIES = [
  { name: "Pollo", color: "#f97316" },
  { name: "Huevo", color: "#eab308" },
  { name: "Otro", color: "#6b7280" },
];

const CLIENT1_PRODUCTS = [
  {
    name: "Pollo",
    type: "pollo" as const,
    unit: "kg" as const,
    basePrice: "12.50",
    isActive: true,
  },
  {
    name: "Azúcar",
    type: "otro" as const,
    unit: "kg" as const,
    basePrice: "5.00",
    isActive: true,
  },
  {
    name: "Huevos",
    type: "huevo" as const,
    unit: "unidad" as const,
    basePrice: "0.80",
    isActive: true,
  },
];

const CLIENT1_PRODUCT_VARIANTS = [
  // Pollo - solo por kg
  [
    { name: "Entero (kg)", sku: "POL-ENT", unitQuantity: 1, price: 12.5 },
  ],
  // Azúcar - solo 1kg
  [
    { name: "1kg", sku: "AZU-1KG", unitQuantity: 1, price: 5.0 },
  ],
  // Huevos - Java, Media Java, Casillero
  [
    { name: "Java (30un)", sku: "HUE-JAV", unitQuantity: 30, price: 25.0 },
    { name: "Media Java (15un)", sku: "HUE-MED", unitQuantity: 15, price: 13.0 },
    { name: "Casillero (180un)", sku: "HUE-CAS", unitQuantity: 180, price: 140.0 },
  ],
];

const CLIENT1_CUSTOMERS = [
  { name: "Ana María López", dni: "45678912", phone: "999111222", address: "Jr. Las Flores 456", notes: "Cliente frecuente" },
  { name: "Carlos Rodríguez", dni: "12345678", phone: "999333444", address: "Av. Los Pinos 789", notes: "" },
  { name: "María Elena Sánchez", dni: "87654321", phone: "999555666", address: "Calle Luna 321", notes: "Paga puntual" },
  { name: "Pedro Gómez", dni: "23456789", phone: "999777888", address: "Av. Sol 654", notes: "Cliente nuevo" },
];

interface SeedProduct {
  id: string;
  name: string;
  variants: Array<{ id: string; name: string }>;
}

export async function seedClient1User() {
  console.log("🌱 Seeding cliente1@gmail.com...\n");

  // Check if user already exists
  const existingUser = await db.query.user.findFirst({
    where: (user, { eq }) => eq(user.email, CLIENT1_USER.email),
  });

  let userId: string;

  if (existingUser) {
    console.log(`⚠ User already exists (ID: ${existingUser.id})`);
    userId = existingUser.id;
  } else {
    // Create user using Better Auth API
    try {
      const result = await auth.api.signUpEmail({
        body: {
          email: CLIENT1_USER.email,
          password: CLIENT1_USER.password,
          name: CLIENT1_USER.name,
        },
      });
      userId = result.user.id;
      console.log(`✓ User created (ID: ${userId})`);
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.message?.includes("already registered")) {
        console.log(`⚠ User already exists`);
        // Try to sign in to get user info
        const result = await auth.api.signInEmail({
          body: {
            email: CLIENT1_USER.email,
            password: CLIENT1_USER.password,
          },
        });
        userId = result.user.id;
        console.log(`✓ Found existing user (ID: ${userId})`);
      } else {
        throw new Error(`Failed to create user: ${error?.message || error}`);
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
    console.log(`⚠ Business already linked to user`);
    businessId = existingBusinessUser.businessId;
    businessUserId = existingBusinessUser.id;
  } else {
    // Create business
    const [business] = await db
      .insert(businesses)
      .values({
        name: CLIENT1_BUSINESS.name,
        ruc: CLIENT1_BUSINESS.ruc,
        address: CLIENT1_BUSINESS.address,
        phone: CLIENT1_BUSINESS.phone,
        email: CLIENT1_BUSINESS.email,
        usarDistribucion: false,
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

  // Seed all data
  await seedClient1Data(ctx);

  console.log("\n✅ Cliente1 seed completed!");
  console.log("\nLogin credentials:");
  console.log(`  Email: ${CLIENT1_USER.email}`);
  console.log(`  Password: ${CLIENT1_USER.password}`);
}

async function seedClient1Data(ctx: RequestContext) {
  console.log("\n📦 Seeding cliente1 data...\n");

  // Seed payment methods
  const config = await services.paymentMethodConfig.getConfig(ctx);
  console.log(`✓ Payment methods configured`);

  const categoryMap = await seedDefaultCategories(ctx, CLIENT1_CATEGORIES);
  console.log(`✓ Seeded ${categoryMap.size} categories`);

  // Seed products
  const products = await seedProducts(ctx, categoryMap);
  console.log(`✓ Seeded ${products.length} products with variants`);

  // Seed inventory
  await seedInventory(ctx, products);
  console.log(`✓ Inventory stocked`);

  // Seed customers
  const customers = await seedCustomers(ctx);
  console.log(`✓ Seeded ${customers.length} customers`);
}

async function seedProducts(ctx: RequestContext, categoryMap: Map<string, string>): Promise<SeedProduct[]> {
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

  for (let i = 0; i < CLIENT1_PRODUCTS.length; i++) {
    const productDef = CLIENT1_PRODUCTS[i];
    const variantsDef = CLIENT1_PRODUCT_VARIANTS[i];

    const categoryId = categoryMap.get(productDef.type) ?? null;

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

async function seedInventory(ctx: RequestContext, products: SeedProduct[]) {
  for (const product of products) {
    for (const variant of product.variants) {
      // Check if variant inventory already exists
      const existing = await repositories.productVariant.getInventory(ctx, variant.id);
      if (existing) {
        console.log(`⚠ Variant ${variant.name} already has inventory, skipping`);
        continue;
      }
      // Create variant inventory with initial stock of 100
      await repositories.productVariant.createInventory(ctx, {
        variantId: variant.id,
        quantity: "100",
      });
    }
  }
}

async function seedCustomers(ctx: RequestContext) {
  const existing = await services.customer.getCustomers(ctx);
  if (existing.length > 0) {
    console.log(`⚠ ${existing.length} customers already exist, skipping`);
    return existing;
  }

  const customers = [];
  for (const customer of CLIENT1_CUSTOMERS) {
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

// Run if executed directly
if (import.meta.main) {
  seedClient1User()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n❌ Seed failed:", error);
      process.exit(1);
    });
}
