#!/usr/bin/env bun
/**
 * Decode JWT token to find user ID
 * Run with: bun scripts/decode-jwt.ts "token"
 */

import { auth } from "../src/lib/auth";
import { db } from "../src/lib/db";
import { user } from "../src/db/schema/auth";
import { businessUsers, businesses } from "../src/db/schema";
import { eq, and } from "drizzle-orm";

const TOKEN = process.argv[2];

if (!TOKEN) {
  console.log("Usage: bun scripts/decode-jwt.ts <token>");
  console.log("\nTo get token from localStorage:");
  console.log("1. Open browser DevTools → Application → Local Storage");
  console.log("2. Copy 'bearer_token' value");
  process.exit(1);
}

async function decodeToken() {
  try {
    console.log("🔐 Decoding JWT token...\n");

    // Verify the token using Better Auth
    const session = await auth.api.getSession({
      headers: new Headers({ authorization: `Bearer ${TOKEN}` }),
    });

    if (!session) {
      console.log("❌ Invalid or expired token");
      process.exit(1);
    }

    console.log("✅ Token is valid!");
    console.log("");
    console.log("📧 User info:");
    console.log(`   ID: ${session.user.id}`);
    console.log(`   Email: ${session.user.email}`);
    console.log(`   Name: ${session.user.name || "N/A"}`);
    console.log("");

    // Check if user exists in our DB
    const userRecord = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
    });

    if (!userRecord) {
      console.log("❌ User not found in database!");
      process.exit(1);
    }

    console.log("✅ User found in database");
    console.log("");

    // Check business memberships
    console.log("🔍 Checking business memberships...\n");

    const targetBusinessId = "e732a72b-7ffa-49fa-8a01-ee4e321a9588";

    // Find first membership (this is what the code does when no targetBusinessId)
    const firstMembership = await db.query.businessUsers.findFirst({
      where: eq(businessUsers.userId, session.user.id),
      with: { business: true },
    });

    if (!firstMembership) {
      console.log("❌ User has NO business memberships at all!");
      process.exit(1);
    }

    console.log(`   First membership (findFirst without businessId filter):`);
    console.log(`     Business ID: ${firstMembership.businessId}`);
    console.log(`     Business Name: ${firstMembership.business?.name}`);
    console.log(`     Role: ${firstMembership.role}`);
    console.log(`     Active: ${firstMembership.isActive}`);
    console.log("");

    // Find exact membership with target business
    const exactMembership = await db.query.businessUsers.findFirst({
      where: and(
        eq(businessUsers.userId, session.user.id),
        eq(businessUsers.businessId, targetBusinessId)
      ),
      with: { business: true },
    });

    if (!exactMembership) {
      console.log("❌ User is NOT a member of business:");
      console.log(`   ${targetBusinessId}`);
      console.log("");
      console.log("   This is why the PUT request fails with 403!");
    } else {
      console.log("✅ User IS a member of target business!");
      console.log(`   Role: ${exactMembership.role}`);
      console.log(`   Active: ${exactMembership.isActive}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

decodeToken();
