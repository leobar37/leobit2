#!/usr/bin/env bun
/**
 * Debug script for payment-methods PUT 403 error
 * Run with: bun scripts/debug-payment-methods.ts
 */

import { db } from "../src/lib/db";
import { businessUsers, businesses } from "../src/db/schema";
import { eq, and } from "drizzle-orm";

const TARGET_BUSINESS_ID = "e732a72b-7ffa-49fa-8a01-ee4e321a9588";

async function debugPaymentMethods() {
  console.log("🔍 Debugging payment-methods PUT 403 error...\n");

  try {
    // 1. Check if business exists
    console.log("📍 Checking business existence...");
    const business = await db.query.businesses.findFirst({
      where: eq(businesses.id, TARGET_BUSINESS_ID),
    });

    if (!business) {
      console.log(`❌ Business ${TARGET_BUSINESS_ID} NOT FOUND in 'businesses' table`);
      console.log("   This is likely the cause of the 403 error!");
      process.exit(1);
    }

    console.log(`✅ Business found: "${business.name}" (ID: ${business.id})`);
    console.log(`   Active: ${business.isActive}`);
    console.log("");

    // 2. Check all memberships for this business
    console.log("👥 Checking memberships for this business...");
    const memberships = await db.query.businessUsers.findMany({
      where: eq(businessUsers.businessId, TARGET_BUSINESS_ID),
    });

    if (memberships.length === 0) {
      console.log(`❌ No memberships found for business ${TARGET_BUSINESS_ID}`);
      console.log("   This is the cause of the 403 error!");
      process.exit(1);
    }

    console.log(`✅ Found ${memberships.length} membership(s):\n`);
    for (const m of memberships) {
      console.log(`  - User ID: ${m.userId}`);
      console.log(`    Role: ${m.role}`);
      console.log(`    Active: ${m.isActive}`);
      console.log(`    Sales Point: ${m.salesPoint || "none"}`);
      console.log(`    Joined: ${m.joinedAt}`);
      console.log("");
    }

    // 3. If user is logged in, check their specific membership
    // This requires the user to provide their email or we can check all memberships
    console.log("💡 To fix this issue:");
    console.log("   1. Ensure the user has an active membership to this business");
    console.log("   2. Or switch to a different business in the frontend");
    console.log("");
    console.log("🔧 Possible solutions:");
    console.log("   - Run: INSERT INTO business_users (id, business_id, user_id, role, is_active) VALUES (...)");
    console.log("   - Or clear localStorage in frontend and re-login");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

debugPaymentMethods();
