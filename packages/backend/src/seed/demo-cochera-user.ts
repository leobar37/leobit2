import { eq } from "drizzle-orm";
import { SUBSCRIPTION_PLANS, getCalendarMonthPeriod, getDefaultFlags } from "@avileo/shared";
import { auth } from "../lib/auth";
import { db } from "../lib/db";
import {
  businesses,
  businessUsers,
  businessSubscriptions,
  cocheraSessions,
  cocheraSettings,
  subscriptionUsage,
} from "../db/schema";
import { RequestContext } from "../context/request-context";
import { defaultCalculatorSettings } from "../db/schema/businesses";

const COCHERA_ADMIN = {
  email: "cochera@avileo.com",
  password: "cochera123456",
  name: "Admin Cochera",
};

const COCHERA_OPERATOR = {
  email: "cochera.operador@avileo.com",
  password: "cochera123456",
  name: "Operador Cochera",
};

const COCHERA_BUSINESS = {
  name: "Avileo Cochera Demo",
  ruc: "20456789123",
  address: "Av. Los Parqueos 321, Lima",
  phone: "988777666",
  email: "cochera@avileo.com",
};

const COCHERA_FREE_BUSINESS = {
  name: "Avileo Cochera Gratis Demo",
  ruc: "20456789124",
  address: "Jr. Cochera Gratis 101, Lima",
  phone: "988777667",
  email: "cochera.gratis@avileo.com",
};

async function ensureUser(seedUser: typeof COCHERA_ADMIN): Promise<string> {
  const existingUser = await db.query.user.findFirst({
    where: (user, { eq: compare }) => compare(user.email, seedUser.email),
  });

  if (existingUser) {
    console.log(`⚠ User ${seedUser.email} already exists (ID: ${existingUser.id})`);
    return existingUser.id;
  }

  try {
    const result = await auth.api.signUpEmail({
      body: {
        email: seedUser.email,
        password: seedUser.password,
        name: seedUser.name,
      },
    });
    console.log(`✓ User created: ${seedUser.email} (ID: ${result.user.id})`);
    return result.user.id;
  } catch (error: any) {
    if (error?.message?.includes("already exists") || error?.message?.includes("already registered")) {
      const found = await db.query.user.findFirst({
        where: (user, { eq: compare }) => compare(user.email, seedUser.email),
      });
      if (found) return found.id;
    }
    throw new Error(`Failed to create ${seedUser.email}: ${error?.message || error}`);
  }
}

function createCocheraContext(businessId: string, businessUserId: string): RequestContext {
  const flags = getDefaultFlags("cochera");
  return new RequestContext(
    "system",
    "system@avileo.com",
    "System",
    businessId,
    businessUserId,
    "ADMIN_NEGOCIO",
    null,
    ["*"],
    true,
    true,
    defaultCalculatorSettings,
    "cochera",
    flags
  );
}

async function ensureBusiness(
  ownerUserId: string,
  businessSeed: typeof COCHERA_BUSINESS,
  plan: "gratis" | "profesional"
) {
  const existingBusiness = await db.query.businesses.findFirst({
    where: eq(businesses.ruc, businessSeed.ruc),
  });

  let businessId = existingBusiness?.id;

  if (!businessId) {
    const [business] = await db
      .insert(businesses)
      .values({
        name: businessSeed.name,
        ruc: businessSeed.ruc,
        address: businessSeed.address,
        phone: businessSeed.phone,
        email: businessSeed.email,
        usarDistribucion: false,
        businessMode: "cochera",
      })
      .returning();
    businessId = business.id;
    console.log(`✓ Cochera business created: ${business.name} (ID: ${business.id})`);
  } else {
    console.log(`⚠ Cochera business already exists: ${businessSeed.name} (ID: ${businessId})`);
  }

  let businessUser = await db.query.businessUsers.findFirst({
    where: (table, { and, eq: compare }) =>
      and(compare(table.businessId, businessId!), compare(table.userId, ownerUserId)),
  });

  if (!businessUser) {
    [businessUser] = await db
      .insert(businessUsers)
      .values({
        businessId,
        userId: ownerUserId,
        role: "ADMIN_NEGOCIO",
        salesPoint: "Oficina Principal",
      })
      .returning();
    console.log(`✓ Admin linked to ${businessSeed.name}`);
  }

  await ensureSubscription(createCocheraContext(businessId, businessUser.id), plan);

  return { businessId, businessUserId: businessUser.id };
}

async function ensureOperator(businessId: string, operatorUserId: string) {
  const existing = await db.query.businessUsers.findFirst({
    where: (table, { and, eq: compare }) =>
      and(compare(table.businessId, businessId), compare(table.userId, operatorUserId)),
  });

  if (existing) {
    console.log("⚠ Cochera operator already linked");
    return existing.id;
  }

  const [operator] = await db
    .insert(businessUsers)
    .values({
      businessId,
      userId: operatorUserId,
      role: "VENDEDOR",
      salesPoint: "Turno Operación",
    })
    .returning();

  console.log("✓ Cochera operator linked as VENDEDOR");
  return operator.id;
}

async function ensureSubscription(ctx: RequestContext, plan: "gratis" | "profesional") {
  const planConfig = SUBSCRIPTION_PLANS[plan];
  const { periodStart, periodEnd } = getCalendarMonthPeriod(new Date());

  const existing = await db.query.businessSubscriptions.findFirst({
    where: eq(businessSubscriptions.businessId, ctx.businessId),
  });

  if (existing) {
    await db
      .update(businessSubscriptions)
      .set({
        plan: planConfig.plan,
        monthlyRecordLimit: planConfig.monthlyRecordLimit,
        priceMonthly: String(planConfig.priceMonthly),
        features: planConfig.features,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        updatedAt: new Date(),
      })
      .where(eq(businessSubscriptions.id, existing.id));
  } else {
    await db.insert(businessSubscriptions).values({
      businessId: ctx.businessId,
      plan: planConfig.plan,
      monthlyRecordLimit: planConfig.monthlyRecordLimit,
      priceMonthly: String(planConfig.priceMonthly),
      features: planConfig.features,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    });
  }

  const usage = await db.query.subscriptionUsage.findFirst({
    where: eq(subscriptionUsage.businessId, ctx.businessId),
  });

  if (usage) {
    await db
      .update(subscriptionUsage)
      .set({
        periodStart,
        periodEnd,
        recordCount: plan === "gratis" ? planConfig.monthlyRecordLimit ?? 0 : 4,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionUsage.id, usage.id));
  } else {
    await db.insert(subscriptionUsage).values({
      businessId: ctx.businessId,
      periodStart,
      periodEnd,
      recordCount: plan === "gratis" ? planConfig.monthlyRecordLimit ?? 0 : 4,
    });
  }

  console.log(`✓ Subscription configured: ${plan}`);
}

async function seedCocheraData(ctx: RequestContext) {
  const existingSettings = await db.query.cocheraSettings.findFirst({
    where: eq(cocheraSettings.businessId, ctx.businessId),
  });

  if (!existingSettings) {
    await db.insert(cocheraSettings).values({
      businessId: ctx.businessId,
      displayName: "Avileo Cochera Demo",
      displayAddress: "Av. Los Parqueos 321, Lima",
      hourlyRate: "5.00",
      dailyRate: "35.00",
      graceMinutes: 10,
      totalSpaces: 24,
      acceptedPaymentMethods: ["efectivo", "yape", "plin"],
    });
    console.log("✓ Cochera settings created");
  } else {
    console.log("⚠ Cochera settings already exist, skipping");
  }

  const existingSessions = await db.query.cocheraSessions.findFirst({
    where: eq(cocheraSessions.businessId, ctx.businessId),
  });

  if (existingSessions) {
    console.log("⚠ Cochera sessions already exist, skipping");
    return;
  }

  const now = new Date();
  const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000);

  await db.insert(cocheraSessions).values([
    {
      businessId: ctx.businessId,
      plate: "ABC-123",
      vehicleType: "auto",
      status: "dentro",
      entryAt: minutesAgo(35),
      notes: "Cliente frecuente",
    },
    {
      businessId: ctx.businessId,
      plate: "MOT-456",
      vehicleType: "moto",
      status: "dentro",
      entryAt: minutesAgo(95),
    },
    {
      businessId: ctx.businessId,
      plate: "CAM-789",
      vehicleType: "camioneta",
      status: "dentro",
      entryAt: minutesAgo(180),
      notes: "Espacio amplio",
    },
    {
      businessId: ctx.businessId,
      plate: "OUT-101",
      vehicleType: "auto",
      status: "fuera",
      entryAt: minutesAgo(260),
      exitAt: minutesAgo(120),
      checkoutAt: minutesAgo(120),
      checkoutBy: ctx.businessUserId,
      totalAmount: "15.00",
      discountAmount: "0.00",
      paymentMethod: "efectivo",
    },
    {
      businessId: ctx.businessId,
      plate: "OUT-202",
      vehicleType: "moto",
      status: "fuera",
      entryAt: minutesAgo(420),
      exitAt: minutesAgo(255),
      checkoutAt: minutesAgo(255),
      checkoutBy: ctx.businessUserId,
      totalAmount: "10.00",
      discountAmount: "5.00",
      paymentMethod: "yape",
    },
    {
      businessId: ctx.businessId,
      plate: "OUT-303",
      vehicleType: "camioneta",
      status: "fuera",
      entryAt: minutesAgo(1_620),
      exitAt: minutesAgo(1_410),
      checkoutAt: minutesAgo(1_410),
      checkoutBy: ctx.businessUserId,
      totalAmount: "20.00",
      discountAmount: "0.00",
      paymentMethod: "plin",
    },
  ]);

  console.log("✓ Cochera sessions seeded (3 active, 3 completed)");
}

export async function seedCocheraUser() {
  console.log("🌱 Seeding cochera demo users...\n");

  const adminUserId = await ensureUser(COCHERA_ADMIN);
  const operatorUserId = await ensureUser(COCHERA_OPERATOR);

  const professional = await ensureBusiness(adminUserId, COCHERA_BUSINESS, "profesional");
  await ensureOperator(professional.businessId, operatorUserId);
  await seedCocheraData(createCocheraContext(professional.businessId, professional.businessUserId));

  const free = await ensureBusiness(adminUserId, COCHERA_FREE_BUSINESS, "gratis");
  await seedCocheraData(createCocheraContext(free.businessId, free.businessUserId));

  console.log("\n✅ Cochera seed completed!");
  console.log("\nLogin credentials:");
  console.log(`  Admin: ${COCHERA_ADMIN.email} / ${COCHERA_ADMIN.password}`);
  console.log(`  Vendedor: ${COCHERA_OPERATOR.email} / ${COCHERA_OPERATOR.password}`);
}

if (import.meta.main) {
  seedCocheraUser()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n❌ Cochera seed failed:", error);
      process.exit(1);
    });
}
