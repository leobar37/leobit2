/**
 * Expenses Schema
 * Registro de gastos del negocio
 */
import { pgTable, uuid, varchar, text, decimal, date, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { businesses, businessUsers } from "./businesses";
import { distribuciones } from "./inventory";
import { expenseCategories } from "./expense-categories";
import { files } from "./files";
import { paymentMethodEnum } from "./enums";

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Multi-tenancy
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),

    // Relations
    distribucionId: uuid("distribucion_id").references(() => distribuciones.id, { onDelete: "set null" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => expenseCategories.id, { onDelete: "restrict" }),
    sellerId: uuid("seller_id").references(() => businessUsers.id, { onDelete: "set null" }),

    // Expense details
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    description: text("description"),
    expenseDate: date("expense_date").notNull(),
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("efectivo"),
    referenceNumber: varchar("reference_number", { length: 50 }),

    // Receipt image (optional)
    receiptImageId: uuid("receipt_image_id").references(() => files.id, { onDelete: "set null" }),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_expenses_business_id").on(table.businessId),
    index("idx_expenses_category_id").on(table.categoryId),
    index("idx_expenses_distribucion_id").on(table.distribucionId),
    index("idx_expenses_seller_id").on(table.sellerId),
    index("idx_expenses_expense_date").on(table.expenseDate),
    index("idx_expenses_payment_method").on(table.paymentMethod),
  ]
);

export const expensesRelations = relations(expenses, ({ one }) => ({
  business: one(businesses, {
    fields: [expenses.businessId],
    references: [businesses.id],
  }),
  distribucion: one(distribuciones, {
    fields: [expenses.distribucionId],
    references: [distribuciones.id],
  }),
  category: one(expenseCategories, {
    fields: [expenses.categoryId],
    references: [expenseCategories.id],
  }),
  seller: one(businessUsers, {
    fields: [expenses.sellerId],
    references: [businessUsers.id],
  }),
  receiptImage: one(files, {
    fields: [expenses.receiptImageId],
    references: [files.id],
  }),
}));

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
