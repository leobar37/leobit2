import { db } from "../src/lib/db";
import {
  user,
  session,
  account,
  verification,
  userProfiles,
  businesses,
  businessUsers,
  customers,
  sales,
  saleItems,
  abonos,
  products,
  productVariants,
  distribuciones,
  distribucionItems,
  suppliers,
  purchases,
  purchaseItems,
  tags,
  customerTags,
  staffInvitations,
  saleTokens,
  files,
  assets,
  businessPaymentSettings,
  businessUserWhatsAppSettings,
  whatsAppTemplates,
  whatsAppMessages,
  systemConfig,
  productUnits,
  variantInventory,
  customerGroups,
  customerGroupMembers,
  visitas,
  waterRoutes,
  waterCustomerProfiles,
  waterDeliveryStops,
  waterContainerLedgerEntries,
  waterDepositLedgerEntries,
  cocheraSettings,
  cocheraSessions,
  businessSubscriptions,
  subscriptionUsage,
} from "../src/db/schema";
import { eq, ne, and } from "drizzle-orm";
import { auth } from "../src/lib/auth";

const DEMO_EMAIL = "demo@avileo.com";
const CLIENT_EMAIL = "cliente1@gmail.com";
const WATER_EMAIL = "agua@avileo.com";

// Demo user data
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

// Client1 user data (Pollería y Bodega)
const CLIENT_USER = {
  email: "cliente1@gmail.com",
  password: "Prueba@123",
  name: "Cliente Uno",
};

const CLIENT_BUSINESS = {
  name: "Pollería y Bodega Cliente 1",
  ruc: "20567890123",
  address: "Av. Los Pollos 123, Lima",
  phone: "999-111-222",
  email: "cliente1@gmail.com",
};

// Water user data (Agua / Bidones)
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

async function ensureDemoUserExists() {
  // Check if demo user exists
  let demoUser: any = await db.query.user.findFirst({
    where: eq(user.email, DEMO_EMAIL),
  });

  if (!demoUser) {
    console.log("Creating demo user...");
    try {
      const result = await auth.api.signUpEmail({
        body: {
          email: DEMO_USER.email,
          password: DEMO_USER.password,
          name: DEMO_USER.name,
        },
      });
      demoUser = result.user;
      console.log(`✓ Demo user created (ID: ${demoUser.id})`);
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.message?.includes("already registered")) {
        demoUser = await db.query.user.findFirst({
          where: eq(user.email, DEMO_EMAIL),
        });
        if (demoUser) {
          console.log(`✓ Demo user already exists (ID: ${demoUser.id})`);
        } else {
          throw new Error(`Failed to create demo user: ${error?.message || error}`);
        }
      } else {
        throw error;
      }
    }
  } else {
    console.log(`✓ Demo user exists (ID: ${demoUser.id})`);
  }

  if (!demoUser) {
    throw new Error("Demo user could not be created or found");
  }

  // Check if business exists
  let businessUser = await db.query.businessUsers.findFirst({
    where: eq(businessUsers.userId, demoUser.id),
    with: {
      business: true,
    },
  });

  if (!businessUser) {
    console.log("Creating demo business...");
    
    const [business] = await db
      .insert(businesses)
      .values({
        name: DEMO_BUSINESS.name,
        ruc: DEMO_BUSINESS.ruc,
        address: DEMO_BUSINESS.address,
        phone: DEMO_BUSINESS.phone,
        email: DEMO_BUSINESS.email,
        usarDistribucion: true,
      })
      .returning();

    const [bu] = await db.insert(businessUsers).values({
      businessId: business.id,
      userId: demoUser.id,
      role: "ADMIN_NEGOCIO",
      salesPoint: "Oficina Principal",
    }).returning();

    businessUser = {
      ...bu,
      business,
    };

    console.log(`✓ Business created: ${business.name} (ID: ${business.id})`);
  } else {
    console.log(`✓ Business exists: ${(businessUser as any).business.name} (ID: ${businessUser.businessId})`);
  }

  return { demoUser, businessUser };
}

async function ensureClientUserExists() {
  // Check if client user exists
  let clientUser: any = await db.query.user.findFirst({
    where: eq(user.email, CLIENT_EMAIL),
  });

  if (!clientUser) {
    console.log("\nCreating client user...");
    try {
      const result = await auth.api.signUpEmail({
        body: {
          email: CLIENT_USER.email,
          password: CLIENT_USER.password,
          name: CLIENT_USER.name,
        },
      });
      clientUser = result.user;
      console.log(`✓ Client user created (ID: ${clientUser.id})`);
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.message?.includes("already registered")) {
        clientUser = await db.query.user.findFirst({
          where: eq(user.email, CLIENT_EMAIL),
        });
        if (clientUser) {
          console.log(`✓ Client user already exists (ID: ${clientUser.id})`);
        } else {
          throw new Error(`Failed to create client user: ${error?.message || error}`);
        }
      } else {
        throw error;
      }
    }
  } else {
    console.log(`✓ Client user exists (ID: ${clientUser.id})`);
  }

  if (!clientUser) {
    throw new Error("Client user could not be created or found");
  }

  // Check if business exists for client
  let businessUser = await db.query.businessUsers.findFirst({
    where: eq(businessUsers.userId, clientUser.id),
    with: {
      business: true,
    },
  });

  if (!businessUser) {
    console.log("Creating client business...");
    
    const [business] = await db
      .insert(businesses)
      .values({
        name: CLIENT_BUSINESS.name,
        ruc: CLIENT_BUSINESS.ruc,
        address: CLIENT_BUSINESS.address,
        phone: CLIENT_BUSINESS.phone,
        email: CLIENT_BUSINESS.email,
        usarDistribucion: false,
      })
      .returning();

    const [bu] = await db.insert(businessUsers).values({
      businessId: business.id,
      userId: clientUser.id,
      role: "ADMIN_NEGOCIO",
      salesPoint: "Oficina Principal",
    }).returning();

    businessUser = {
      ...bu,
      business,
    };

    console.log(`✓ Business created: ${business.name} (ID: ${business.id})`);
  } else {
    console.log(`✓ Business exists: ${(businessUser as any).business.name} (ID: ${businessUser.businessId})`);
  }

  return { clientUser, businessUser };
}

async function ensureWaterUserExists() {
  // Check if water user exists
  let waterUser: any = await db.query.user.findFirst({
    where: eq(user.email, WATER_EMAIL),
  });

  if (!waterUser) {
    console.log("\nCreating water user...");
    try {
      const result = await auth.api.signUpEmail({
        body: {
          email: WATER_USER.email,
          password: WATER_USER.password,
          name: WATER_USER.name,
        },
      });
      waterUser = result.user;
      console.log(`✓ Water user created (ID: ${waterUser.id})`);
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.message?.includes("already registered")) {
        waterUser = await db.query.user.findFirst({
          where: eq(user.email, WATER_EMAIL),
        });
        if (waterUser) {
          console.log(`✓ Water user already exists (ID: ${waterUser.id})`);
        } else {
          throw new Error(`Failed to create water user: ${error?.message || error}`);
        }
      } else {
        throw error;
      }
    }
  } else {
    console.log(`✓ Water user exists (ID: ${waterUser.id})`);
  }

  if (!waterUser) {
    throw new Error("Water user could not be created or found");
  }

  // Check if business exists for water user
  let businessUser = await db.query.businessUsers.findFirst({
    where: eq(businessUsers.userId, waterUser.id),
    with: {
      business: true,
    },
  });

  if (!businessUser) {
    console.log("Creating water business...");

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

    const [bu] = await db.insert(businessUsers).values({
      businessId: business.id,
      userId: waterUser.id,
      role: "ADMIN_NEGOCIO",
      salesPoint: "Oficina Principal",
    }).returning();

    businessUser = {
      ...bu,
      business,
    };

    console.log(`✓ Business created: ${business.name} (ID: ${business.id})`);
  } else {
    console.log(`✓ Business exists: ${(businessUser as any).business.name} (ID: ${businessUser.businessId})`);
  }

  return { waterUser, businessUser };
}

async function resetDatabase() {
  console.log("🗑️  Starting database reset...\n");

  if (process.env.NODE_ENV === "production") {
    throw new Error("Reset cannot run in production environment");
  }

  // First ensure all three users exist
  const { demoUser } = await ensureDemoUserExists();
  const { clientUser } = await ensureClientUserExists();
  const { waterUser } = await ensureWaterUserExists();
  
  const demoBusinessId = (await db.query.businessUsers.findFirst({
    where: eq(businessUsers.userId, demoUser.id),
  }))?.businessId;

  const clientBusinessId = (await db.query.businessUsers.findFirst({
    where: eq(businessUsers.userId, clientUser.id),
  }))?.businessId;

  const waterBusinessId = (await db.query.businessUsers.findFirst({
    where: eq(businessUsers.userId, waterUser.id),
  }))?.businessId;

  console.log("\n🧹 Cleaning all operational data...\n");

  // Delete in correct order to respect FK constraints
  const deletions = [
    { name: "Water container ledger", fn: () => db.delete(waterContainerLedgerEntries) },
    { name: "Water deposit ledger", fn: () => db.delete(waterDepositLedgerEntries) },
    { name: "Water delivery stops", fn: () => db.delete(waterDeliveryStops) },
    { name: "Water customer profiles", fn: () => db.delete(waterCustomerProfiles) },
    { name: "Water routes", fn: () => db.delete(waterRoutes) },
    { name: "Cochera sessions", fn: () => db.delete(cocheraSessions) },
    { name: "Cochera settings", fn: () => db.delete(cocheraSettings) },
    { name: "Subscription usage", fn: () => db.delete(subscriptionUsage) },
    { name: "Business subscriptions", fn: () => db.delete(businessSubscriptions) },
    { name: "Sale items", fn: () => db.delete(saleItems) },
    { name: "Visitas", fn: () => db.delete(visitas) },
    { name: "Sales", fn: () => db.delete(sales) },
    { name: "Abonos", fn: () => db.delete(abonos) },
    { name: "Customer tags", fn: () => db.delete(customerTags) },
    { name: "Customer group members", fn: () => db.delete(customerGroupMembers) },
    { name: "Customer groups", fn: () => db.delete(customerGroups) },
    { name: "Tags", fn: () => db.delete(tags) },
    { name: "Customers", fn: () => db.delete(customers) },
    { name: "Distribucion items", fn: () => db.delete(distribucionItems) },
    { name: "Distribuciones", fn: () => db.delete(distribuciones) },
    { name: "Variant inventory", fn: () => db.delete(variantInventory) },
    { name: "Product variants", fn: () => db.delete(productVariants) },
    { name: "Product units", fn: () => db.delete(productUnits) },
    { name: "Products", fn: () => db.delete(products) },
    { name: "Purchase items", fn: () => db.delete(purchaseItems) },
    { name: "Purchases", fn: () => db.delete(purchases) },
    { name: "Suppliers", fn: () => db.delete(suppliers) },
    { name: "Staff invitations", fn: () => db.delete(staffInvitations) },
    { name: "Sale tokens", fn: () => db.delete(saleTokens) },
    { name: "Files", fn: () => db.delete(files) },
    { name: "Assets", fn: () => db.delete(assets) },
    { name: "WhatsApp messages", fn: () => db.delete(whatsAppMessages) },
    { name: "WhatsApp templates", fn: () => db.delete(whatsAppTemplates) },
    { name: "Business user WhatsApp settings", fn: () => db.delete(businessUserWhatsAppSettings) },
    { name: "Business payment settings", fn: () => db.delete(businessPaymentSettings) },
    { name: "System config", fn: () => db.delete(systemConfig) },
    { name: "User profiles (others)", fn: () => db.delete(userProfiles).where(and(ne(userProfiles.userId, demoUser.id), ne(userProfiles.userId, clientUser.id), ne(userProfiles.userId, waterUser.id))) },
    { name: "Sessions (others)", fn: () => db.delete(session).where(and(ne(session.userId, demoUser.id), ne(session.userId, clientUser.id), ne(session.userId, waterUser.id))) },
    { name: "Accounts (others)", fn: () => db.delete(account).where(and(ne(account.userId, demoUser.id), ne(account.userId, clientUser.id), ne(account.userId, waterUser.id))) },
    { name: "Verifications", fn: () => db.delete(verification) },
    { name: "Business users (others)", fn: () => db.delete(businessUsers).where(and(ne(businessUsers.userId, demoUser.id), ne(businessUsers.userId, clientUser.id), ne(businessUsers.userId, waterUser.id))) },
    { name: "Businesses (others)", fn: () => db.delete(businesses).where(and(ne(businesses.id, demoBusinessId!), ne(businesses.id, clientBusinessId!), ne(businesses.id, waterBusinessId!))) },
    { name: "Other users", fn: () => db.delete(user).where(and(ne(user.id, demoUser.id), ne(user.id, clientUser.id), ne(user.id, waterUser.id))) },
  ];

  for (const { name, fn } of deletions) {
    try {
      await fn();
      console.log(`  ✓ ${name} deleted`);
    } catch (error) {
      console.log(`  ⚠ ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ DATABASE RESET COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(60));
  console.log("\n🎯 Preserved:");
  console.log(`   • Demo User: ${DEMO_EMAIL} (ID: ${demoUser.id})`);
  console.log(`   • Demo Business: Pollos Demo (ID: ${demoBusinessId})`);
  console.log(`   • Client User: ${CLIENT_EMAIL} (ID: ${clientUser.id})`);
  console.log(`   • Client Business: Pollería y Bodega Cliente 1 (ID: ${clientBusinessId})`);
  console.log(`   • Water User: ${WATER_EMAIL} (ID: ${waterUser.id})`);
  console.log(`   • Water Business: Agua Pura Demo (ID: ${waterBusinessId})`);
  console.log("\n🔐 Login credentials:");
  console.log(`   Demo: ${DEMO_EMAIL} / ${DEMO_USER.password}`);
  console.log(`   Client: ${CLIENT_EMAIL} / ${CLIENT_USER.password}`);
  console.log(`   Water: ${WATER_EMAIL} / ${WATER_USER.password}`);
  console.log("\n💡 The database is now clean with demo accounts ready for seeding.\n");
}

// Run if executed directly
if (import.meta.main) {
  resetDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n❌ Reset failed:", error);
      process.exit(1);
    });
}
