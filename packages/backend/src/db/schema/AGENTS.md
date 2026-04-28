# AGENTS.md - Database Schema Directory

> **Drizzle ORM table definitions for Avileo**

## Overview

This directory contains all Drizzle ORM table definitions. Schema files define database tables, relations, and types for the offline-first chicken sales management system.

## Schema File Organization

```
db/schema/
├── index.ts                    # Barrel exports
├── auth.ts                     # Better Auth tables (user, session)
├── businesses.ts               # Business/tenant tables
├── customers.ts                # Customer management
├── sales.ts                    # Sales & sale items
├── payments.ts                 # Payments/abonos
├── products.ts                 # Product catalog
├── purchases.ts                # Purchase orders
├── suppliers.ts                # Supplier management
├── inventory.ts                # Inventory tracking
├── distribucion.ts             # Distribution records
├── tags.ts                     # Customer tags
├── closings.ts                 # Daily closing reports
├── sync-operations.ts          # Offline sync queue
├── files.ts                    # File attachments
├── assets.ts                   # Business assets
├── whatsapp-templates.ts       # WhatsApp message templates
├── whatsapp-messages.ts        # WhatsApp message log
├── staff-invitations.ts        # Team invitations
├── product-units.ts            # Product unit definitions
├── business-payment-settings.ts # Payment configuration
├── business-user-whatsapp-settings.ts # WhatsApp per-user settings
├── user-profiles.ts            # Extended user data
├── customer-tags.ts            # Customer-tag relationships
├── sale-tokens.ts              # Public sale access tokens
├── config.ts                   # Business configuration
├── enums.ts                    # Shared enum definitions
└── ... (25 total files)
```

## Table Definition Pattern

### Basic Table Structure

```typescript
// schema/customers.ts
import { pgTable, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

// 1. Define enums (if needed)
export const syncStatusEnum = pgEnum("sync_status", ["pending", "synced", "error"]);

// 2. Define table
export const customers = pgTable("customers", {
  id: text("id").primaryKey().$defaultFn(createId),
  name: text("name").notNull(),
  dni: text("dni"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  
  // Multi-tenancy: ALL tables must have businessId
  businessId: text("business_id").notNull().references(() => businesses.id),
  
  // Audit fields
  createdBy: text("created_by").references(() => businessUsers.id),
  updatedBy: text("updated_by").references(() => businessUsers.id),
  
  // Sync status for offline support
  syncStatus: syncStatusEnum("sync_status").default("pending"),
  syncAttempts: integer("sync_attempts").default(0),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 3. Define relations
export const customersRelations = relations(customers, ({ one, many }) => ({
  business: one(businesses, {
    fields: [customers.businessId],
    references: [businesses.id],
  }),
  sales: many(sales),
  tags: many(customerTags),
}));

// 4. Export types
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
```

## Critical Patterns

### 1. Multi-Tenancy - Mandatory businessId

**EVERY table MUST have businessId:**

```typescript
// ✅ CORRECT - Always filter by tenant
businessId: text("business_id")
  .notNull()
  .references(() => businesses.id),

// ❌ INCORRECT - Missing tenant isolation
// (security breach)
```

### 2. Operational FK Pattern

Operational FKs point to `business_users.id` (not `users.id`):

```typescript
// ✅ CORRECT - Operational FK to business_users
sellerId: text("seller_id").references(() => businessUsers.id),
createdBy: text("created_by").references(() => businessUsers.id),

// ❌ INCORRECT - Pointing to auth users
sellerId: text("seller_id").references(() => users.id),
```

### 3. Sync Status Fields (Offline Tables)

Tables that sync offline MUST have these fields:

```typescript
{
  syncStatus: syncStatusEnum("sync_status").default("pending"),
  syncAttempts: integer("sync_attempts").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}
```

**Sync Status Values:**
- `"pending"` - Created/updated offline, waiting to sync
- `"synced"` - Confirmed synced with backend
- `"error"` - Sync failed after retries

### 4. Better Auth Tables

Auth tables (`users`, `sessions`) are managed by Better Auth - don't modify:

```typescript
// schema/auth.ts - Managed by Better Auth
export { users, sessions, accounts, verifications } from "better-auth-drizzle";
```

### 5. Primary Key Convention

Use CUID2 for all primary keys:

```typescript
import { createId } from "@paralleldrive/cuid2";

id: text("id").primaryKey().$defaultFn(createId),
```

## Enum Definitions

Centralize enums in `enums.ts` or define locally:

```typescript
// schema/enums.ts
export const saleStatusEnum = pgEnum("sale_status", [
  "pending", 
  "confirmed", 
  "cancelled"
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "card", 
  "transfer",
  "yape",
  "plin",
]);
```

## Table Categories

### Core Business Tables

| Table | Purpose | Syncable |
|-------|---------|----------|
| `customers` | Customer directory | ✅ Yes |
| `sales` | Sale transactions | ✅ Yes |
| `saleItems` | Line items per sale | ✅ Yes |
| `payments` | Payment/abono records | ✅ Yes |
| `products` | Product catalog | ❌ No (read-only cache) |
| `purchases` | Purchase orders | ✅ Yes |

### Inventory & Operations

| Table | Purpose | Syncable |
|-------|---------|----------|
| `inventory` | Daily inventory assignments | ✅ Yes |
| `distribucion` | Product distribution | ✅ Yes |
| `distribucionItems` | Distribution line items | ✅ Yes |

### Configuration Tables

| Table | Purpose | Syncable |
|-------|---------|----------|
| `businesses` | Tenant/business settings | ❌ No |
| `businessUsers` | Business membership | ❌ No |
| `productUnits` | Unit definitions | ❌ No |
| `tags` | Customer tags | ❌ No |

### Supporting Tables

| Table | Purpose | Syncable |
|-------|---------|----------|
| `files` | File attachments | ❌ No |
| `assets` | Business assets | ❌ No |

## Migration Workflow

1. **Modify schema file** (e.g., `customers.ts`)
2. **Generate migration:**
   ```bash
   cd packages/backend
   bun run db:generate
   ```
3. **Review migration** in `drizzle/` directory
4. **Apply migration:**
   ```bash
   bun run db:migrate
   # OR for dev:
   bun run db:push
   ```

## Indexes

Add indexes for frequently queried columns:

```typescript
export const customers = pgTable("customers", {
  // ... columns
}, (table) => ({
  businessIdx: index("customers_business_idx").on(table.businessId),
  phoneIdx: index("customers_phone_idx").on(table.phone),
  syncStatusIdx: index("customers_sync_idx").on(table.syncStatus),
}));
```

## Relations

Define relations for nested queries:

```typescript
export const salesRelations = relations(sales, ({ one, many }) => ({
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
  items: many(saleItems),
  payments: many(payments),
  business: one(businesses, {
    fields: [sales.businessId],
    references: [businesses.id],
  }),
}));
```

## Important Notes

### DO:
- Always include `businessId` for multi-tenancy
- Use CUID2 for primary keys
- Add `syncStatus` + `syncAttempts` for offline tables
- Point operational FKs to `business_users.id`
- Define relations for nested queries
- Create indexes for filtered columns

### DON'T:
- Don't modify Better Auth tables directly
- Don't skip `businessId` on any table
- Don't use auto-increment integers for IDs
- Don't forget timestamps on operational tables
- Don't use `users.id` for operational FKs

---

*See [Backend AGENTS.md](../../AGENTS.md) for backend overview.*
