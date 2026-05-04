/**
 * Expense Categories Schema
 * Categorias predefinidas y personalizadas para clasificar gastos
 */
import { pgTable, uuid, varchar, text, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { businesses } from "./businesses";
import { expenses } from "./expenses";

export const expenseCategories = pgTable(
  "expense_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Multi-tenancy
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),

    // Category info
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    icon: varchar("icon", { length: 50 }).notNull().default("receipt"),
    color: varchar("color", { length: 20 }).notNull().default("orange"),

    // Status
    isActive: boolean("is_active").notNull().default(true),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_expense_categories_business_id").on(table.businessId),
    index("idx_expense_categories_is_active").on(table.isActive),
    uniqueIndex("ux_expense_categories_business_name_ci").on(
      table.businessId,
      sql`lower(${table.name})`
    ),
  ]
);

export const expenseCategoriesRelations = relations(expenseCategories, ({ one, many }) => ({
  business: one(businesses, {
    fields: [expenseCategories.businessId],
    references: [businesses.id],
  }),
  expenses: many(expenses),
}));

export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type NewExpenseCategory = typeof expenseCategories.$inferInsert;
