# T-001: Backend Payment Draft Support

## Objective
Add `status` column to payments table and support creating draft payments that can be updated incrementally before confirmation.

## Changes

### 1. Database Schema

```typescript
// packages/backend/src/db/schema/payments.ts
export const paymentStatusEnum = pgEnum("payment_status", [
  "draft",
  "confirmed",
  "cancelled",
]);

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  status: paymentStatusEnum("status").notNull().default("draft"),
  customerId: text("customer_id").references(() => customers.id),
  relatedSaleId: text("related_sale_id").references(() => sales.id),
  businessId: text("business_id").notNull(),
  sellerId: text("seller_id"),
  amount: numeric("amount", { precision: 10, scale: 2 }),
  paymentMethod: text("payment_method"),
  referenceNumber: text("reference_number"),
  proofImageId: text("proof_image_id"),
  notes: text("notes"),
  // AI-ready metadata (JSONB for flexibility)
  metadata: jsonb("metadata").$type<{
    extractedAmount?: string;
    extractedDate?: string;
    extractedPhone?: string;
    confidence?: number;
    rawText?: string;
  }>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
```

### 2. API Endpoints

```typescript
// POST /payments - Create draft payment
// Body: { customerId?, relatedSaleId?, status: "draft" }
// Returns: { id, status, ... }

// PATCH /payments/:id - Update draft payment
// Body: { paymentMethod?, referenceNumber?, proofImageId?, amount?, notes? }
// Returns: updated payment

// POST /payments/:id/confirm - Confirm draft payment
// Body: { amount, ... }
// Returns: confirmed payment
```

### 3. Migration

```sql
-- Add status column with default "draft"
ALTER TABLE payments ADD COLUMN status payment_status NOT NULL DEFAULT 'draft';

-- Add metadata JSONB column
ALTER TABLE payments ADD COLUMN metadata JSONB;

-- Update existing payments to "confirmed"
UPDATE payments SET status = 'confirmed' WHERE status = 'draft';
```

## Acceptance Criteria
- [ ] Can create a payment with status "draft"
- [ ] Can update a draft payment multiple times
- [ ] Can confirm a draft payment
- [ ] Existing payments remain functional
