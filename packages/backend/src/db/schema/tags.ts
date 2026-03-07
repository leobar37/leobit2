/**
 * Tags Schema
 * Sistema de etiquetas para segmentar clientes
 */
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { businesses } from "./businesses";

// Table definition
export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Tag info
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 20 }).notNull().default("#f97316"),

    // Relations
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_tags_business_id").on(table.businessId),
    index("idx_tags_name").on(table.name),
  ]
);

// Type exports
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export const tagsRelations = relations(tags, ({ one }) => ({
  business: one(businesses, {
    fields: [tags.businessId],
    references: [businesses.id],
  }),
}));
