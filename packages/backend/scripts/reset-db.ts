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
} from "../src/db/schema";
import { eq, ne } from "drizzle-orm";
import { auth } from "../src/lib/auth";

const DEMO_EMAIL = "demo@avileo.com";

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

async function ensureDemoUserExists() {
  // Check if demo user exists
  let demoUser = await db.query.user.findFirst({
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
        // Try to find the user again
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

  // Check if business exists
  let businessUser = await db.query.businessUsers.findFirst({
    where: eq(businessUsers.userId, demoUser.id),
    with: {
      business: true,
    },
  });

  if (!businessUser) {
    console.log("Creating demo business...");
    
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
        usarDistribucion: true,
      })
      .returning();

    // Link user to business
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
    console.log(`✓ Business exists: ${businessUser.business.name} (ID: ${businessUser.businessId})`);
  }

  return { demoUser, businessUser };
}

async function resetDatabase() {
  console.log("🗑️  Starting database reset...\n");

  if (process.env.NODE_ENV === "production") {
    throw new Error("Reset cannot run in production environment");
  }

  // First ensure demo user exists
  const { demoUser, businessUser } = await ensureDemoUserExists();
  const demoBusinessId = businessUser.businessId;

  console.log("\n🧹 Cleaning all operational data...\n");

  // Delete in correct order to respect FK constraints
  const deletions = [
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
    { name: "User profiles (others)", fn: () => db.delete(userProfiles).where(ne(userProfiles.userId, demoUser.id)) },
    { name: "Sessions (others)", fn: () => db.delete(session).where(ne(session.userId, demoUser.id)) },
    { name: "Accounts (others)", fn: () => db.delete(account).where(ne(account.userId, demoUser.id)) },
    { name: "Verifications", fn: () => db.delete(verification) },
    { name: "Business users (others)", fn: () => db.delete(businessUsers).where(ne(businessUsers.userId, demoUser.id)) },
    { name: "Businesses (others)", fn: () => db.delete(businesses).where(ne(businesses.id, demoBusinessId)) },
    { name: "Other users", fn: () => db.delete(user).where(ne(user.id, demoUser.id)) },
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
  console.log(`   • User: ${DEMO_EMAIL} (ID: ${demoUser.id})`);
  console.log(`   • Business: ${businessUser.business.name} (ID: ${demoBusinessId})`);
  console.log(`   • Role: ADMIN_NEGOCIO`);
  console.log("\n🔐 Login credentials:");
  console.log(`   Email: ${DEMO_EMAIL}`);
  console.log(`   Password: ${DEMO_USER.password}`);
  console.log("\n💡 The database is now clean with only the demo account.");
  console.log("   You can now log in and start fresh!\n");
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
