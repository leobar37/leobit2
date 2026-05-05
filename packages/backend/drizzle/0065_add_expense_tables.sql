-- Add expense categories and expenses tables
-- Created: 2026-05-04

-- Create expense_categories table
CREATE TABLE IF NOT EXISTS "expense_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "name" varchar(100) NOT NULL,
  "description" text,
  "icon" varchar(50) NOT NULL DEFAULT 'receipt',
  "color" varchar(20) NOT NULL DEFAULT 'orange',
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT NOW(),
  "updated_at" timestamp NOT NULL DEFAULT NOW()
);

-- Create unique index for category name per business (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS "ux_expense_categories_business_name_ci"
  ON "expense_categories" ("business_id", lower("name"));

-- Create indexes for expense_categories
CREATE INDEX IF NOT EXISTS "idx_expense_categories_business_id"
  ON "expense_categories" ("business_id");
CREATE INDEX IF NOT EXISTS "idx_expense_categories_is_active"
  ON "expense_categories" ("is_active");

-- Create expenses table
CREATE TABLE IF NOT EXISTS "expenses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "distribucion_id" uuid REFERENCES "distribuciones"("id") ON DELETE SET NULL,
  "category_id" uuid NOT NULL REFERENCES "expense_categories"("id") ON DELETE RESTRICT,
  "seller_id" uuid REFERENCES "business_users"("id") ON DELETE SET NULL,
  "amount" decimal(12, 2) NOT NULL,
  "description" text,
  "expense_date" date NOT NULL,
  "payment_method" payment_method NOT NULL DEFAULT 'efectivo',
  "reference_number" varchar(50),
  "receipt_image_id" uuid REFERENCES "files"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT NOW(),
  "updated_at" timestamp NOT NULL DEFAULT NOW()
);

-- Create indexes for expenses
CREATE INDEX IF NOT EXISTS "idx_expenses_business_id"
  ON "expenses" ("business_id");
CREATE INDEX IF NOT EXISTS "idx_expenses_category_id"
  ON "expenses" ("category_id");
CREATE INDEX IF NOT EXISTS "idx_expenses_distribucion_id"
  ON "expenses" ("distribucion_id");
CREATE INDEX IF NOT EXISTS "idx_expenses_seller_id"
  ON "expenses" ("seller_id");
CREATE INDEX IF NOT EXISTS "idx_expenses_expense_date"
  ON "expenses" ("expense_date");
CREATE INDEX IF NOT EXISTS "idx_expenses_payment_method"
  ON "expenses" ("payment_method");
