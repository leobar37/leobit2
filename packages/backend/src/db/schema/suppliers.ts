import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
  text,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { supplierTypeEnum } from "./enums";
import { businesses } from "./businesses";

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),

    name: varchar("name", { length: 255 }).notNull(),

    type: supplierTypeEnum("type").notNull().default("regular"),

    ruc: varchar("ruc", { length: 20 }),

    address: text("address"),

    phone: varchar("phone", { length: 20 }),

    email: varchar("email", { length: 255 }),

    notes: text("notes"),

    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_suppliers_business_id").on(table.businessId),
    index("idx_suppliers_type").on(table.type),
    index("idx_suppliers_name").on(table.name),
    index("idx_suppliers_is_active").on(table.isActive),
  ]
);

export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;

export const suppliersRelations = relations(suppliers, ({ one }) => ({
  business: one(businesses, {
    fields: [suppliers.businessId],
    references: [businesses.id],
  }),
}));
