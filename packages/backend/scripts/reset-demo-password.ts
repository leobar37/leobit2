import { db } from "../src/lib/db";
import { auth } from "../src/lib/auth";
import { eq } from "drizzle-orm";
import { user, account } from "../src/db/schema";

const DEMO_EMAIL = "demo@avileo.com";
const DEMO_PASSWORD = "demo123456";

async function resetDemoPassword() {
  console.log("🔑 Resetting demo user password...\n");

  // Find demo user
  const demoUser = await db.query.user.findFirst({
    where: eq(user.email, DEMO_EMAIL),
  });

  if (!demoUser) {
    console.log("❌ Demo user not found. Run the seed first.");
    process.exit(1);
  }

  console.log(`✓ Found demo user (ID: ${demoUser.id})`);

  // Find the credential account for this user
  const userAccount = await db.query.account.findFirst({
    where: eq(account.userId, demoUser.id),
  });

  if (!userAccount) {
    console.log("⚠ No credential account found. Creating one...");
  } else {
    console.log(`✓ Found account (ID: ${userAccount.id})`);
  }

  // Use Better Auth's internal password hashing to set the password correctly
  // We need to use the auth API to properly set the password
  try {
    // First, let's try to update the password through the auth API
    // Since there's no direct "setPassword" API, we'll use the internal hash function
    // Better Auth uses bcrypt or argon2 - we need to check which one

    // Let's try signing in first to see if the password works
    console.log("\n🧪 Testing current password...");
    try {
      const signInResult = await auth.api.signInEmail({
        body: {
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
        },
      });
      console.log("✓ Current password works! No reset needed.");
      console.log(`  User: ${signInResult.user.email}`);
      process.exit(0);
    } catch (signInError: any) {
      console.log(`⚠ Current password failed: ${signInError?.message || signInError}`);
    }

    // Password doesn't work, need to reset it
    // We'll delete the old account record and let Better Auth recreate it
    if (userAccount) {
      console.log("\n🗑️  Deleting old credential account...");
      await db.delete(account).where(eq(account.id, userAccount.id));
      console.log("✓ Old account deleted");
    }

    // Now sign up again with the same email - Better Auth should handle this
    // But since the user exists, signUpEmail will fail with "already exists"
    // So we need a different approach

    // Let's manually hash the password using Better Auth's internal hasher
    // We need to access the internal Better Auth context
    console.log("\n🔐 Re-creating credential account with correct password...");

    // Access Better Auth's internal password hasher
    const authContext = (auth as any).options;
    const passwordConfig = authContext?.emailAndPassword;

    if (!passwordConfig) {
      console.log("❌ Could not access password configuration");
      process.exit(1);
    }

    // Better Auth uses @noble/hashes/scrypt by default or bcrypt
    // Let's try using the auth API's internal hash function
    const internalAuth = (auth as any).api;

    // Try to create a new account with the hashed password
    // We need to hash the password properly
    const { hashPassword } = await import("better-auth/crypto");
    const hashedPassword = await hashPassword(DEMO_PASSWORD);

    console.log("✓ Password hashed");

    // Insert new account record with hashed password
    const newAccountId = `demo_account_${Date.now()}`;
    await db.insert(account).values({
      id: newAccountId,
      userId: demoUser.id,
      accountId: DEMO_EMAIL,
      providerId: "credential",
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("✓ New credential account created");

    // Test the new password
    console.log("\n🧪 Testing new password...");
    const testResult = await auth.api.signInEmail({
      body: {
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      },
    });

    console.log("✅ Password reset successful!");
    console.log(`  User: ${testResult.user.email}`);
    console.log(`  Password: ${DEMO_PASSWORD}`);

  } catch (error: any) {
    console.error("\n❌ Password reset failed:", error?.message || error);
    console.error(error);
    process.exit(1);
  }
}

if (import.meta.main) {
  resetDemoPassword()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n❌ Fatal error:", error);
      process.exit(1);
    });
}
