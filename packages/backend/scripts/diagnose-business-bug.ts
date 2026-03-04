#!/usr/bin/env bun
/**
 * Diagnostic script to verify the multi-business membership bug
 * Run with: bun scripts/diagnose-business-bug.ts
 */

import { db } from "../src/lib/db";
import { businessUsers, businesses } from "../src/db/schema";
import { eq, sql } from "drizzle-orm";

async function diagnoseBusinessBug() {
  console.log("🔍 Diagnosing business membership bug...\n");

  try {
    // 1. Count total business memberships
    const totalMemberships = await db
      .select({ count: sql<number>`count(*)` })
      .from(businessUsers);
    
    console.log(`📊 Total business memberships: ${totalMemberships[0].count}\n`);

    // 2. Find users with multiple business memberships
    const usersWithMultipleBusinesses = await db.execute(sql`
      SELECT 
        bu.user_id,
        COUNT(*) as business_count,
        STRING_AGG(b.name, ', ' ORDER BY bu.joined_at) as business_names,
        STRING_AGG(bu.is_active::text, ', ' ORDER BY bu.joined_at) as active_statuses
      FROM business_users bu
      JOIN businesses b ON b.id = bu.business_id
      GROUP BY bu.user_id
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
    `);

    if (usersWithMultipleBusinesses.length === 0) {
      console.log("✅ No users with multiple businesses found.");
      console.log("   The bug may not affect your current data.\n");
    } else {
      console.log(`🚨 Found ${usersWithMultipleBusinesses.length} users with MULTIPLE businesses!\n`);
      console.log("These users are affected by the findFirst() bug:\n");
      
      for (const user of usersWithMultipleBusinesses) {
        console.log(`  User ID: ${user.user_id}`);
        console.log(`  Business Count: ${user.business_count}`);
        console.log(`  Businesses: ${user.business_names}`);
        console.log(`  Active Status: ${user.active_statuses}`);
        
        // Check if first business is inactive (this would cause 403)
        const statuses = (user.active_statuses as string).split(', ');
        if (statuses[0] === 'false') {
          console.log(`  ⚠️  WARNING: First business (used by findFirst) is INACTIVE!`);
          console.log(`      This user WILL get 403 errors on all protected routes.`);
        }
        console.log("");
      }
    }

    // 3. Check inactive memberships that might cause 403
    const inactiveMemberships = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(businessUsers)
      .where(eq(businessUsers.isActive, false));

    console.log(`📊 Total inactive memberships: ${inactiveMemberships[0].count}`);
    
    if (inactiveMemberships[0].count > 0) {
      const inactiveDetails = await db.execute(sql`
        SELECT 
          bu.user_id,
          b.name as business_name,
          bu.joined_at
        FROM business_users bu
        JOIN businesses b ON b.id = bu.business_id
        WHERE bu.is_active = false
        ORDER BY bu.joined_at DESC
        LIMIT 10
      `);
      
      console.log("\n⚠️  Inactive memberships (will cause 403 errors):\n");
      for (const member of inactiveDetails) {
        console.log(`  User: ${member.user_id}`);
        console.log(`  Business: ${member.business_name}`);
        console.log("");
      }
    }

    // 4. Show how findFirst() would behave for ALL users
    console.log("\n🔍 Simulating findFirst() behavior for all users:\n");
    
    const allUsers = await db.execute(sql`
      SELECT DISTINCT user_id FROM business_users LIMIT 10
    `);
    
    for (const userRow of allUsers) {
      const memberships = await db.query.businessUsers.findMany({
        where: eq(businessUsers.userId, userRow.user_id as string),
        with: { business: true },
        orderBy: (bu, { asc }) => [asc(bu.joinedAt)],
      });

      if (memberships.length > 0) {
        console.log(`User ${userRow.user_id}:`);
        console.log(`  findFirst() returns: ${memberships[0]?.business?.name} (${memberships[0]?.isActive ? 'active' : 'INACTIVE'}) [${memberships[0]?.role}]`);
        if (memberships.length > 1) {
          console.log(`  ⚠️  Has ${memberships.length} total memberships!`);
          memberships.forEach((m, i) => {
            console.log(`      ${i + 1}. ${m.business?.name} - ${m.role} - ${m.isActive ? 'active' : 'INACTIVE'}`);
          });
        }
        console.log("");
      }
    }

    // 5. Summary
    console.log("\n📋 Summary:\n");
    console.log(`Total users with multiple businesses: ${usersWithMultipleBusinesses.length}`);
    console.log(`Total inactive memberships: ${inactiveMemberships[0].count}`);
    
    if (usersWithMultipleBusinesses.length > 0) {
      console.log("\n🚨 BUG CONFIRMED!");
      console.log("   Users with multiple businesses will experience:");
      console.log("   - Wrong business context (arbitrary selection)");
      console.log("   - 403 errors if first business is inactive");
      console.log("   - Unable to access other businesses\n");
      console.log("   RECOMMENDATION: Apply the fix immediately.\n");
    } else if (inactiveMemberships[0].count > 0) {
      console.log("\n⚠️  WARNING:");
      console.log("   No users with multiple businesses, BUT");
      console.log("   There are inactive memberships.");
      console.log("   If an inactive membership is selected first, user gets 403.\n");
    } else {
      console.log("\n✅ No immediate bug detected.");
      console.log("   However, the code is still vulnerable if users join multiple businesses.\n");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error running diagnosis:", error);
    process.exit(1);
  }
}

diagnoseBusinessBug();
