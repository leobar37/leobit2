/**
 * Assets Schema
 * Galería compartida de imágenes/videos para productos y categorías
 * Múltiples entidades pueden referenciar el mismo asset
 */
import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { businesses } from "./businesses";
import { user } from "./auth";

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Multi-tenancy
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),

    // File metadata
    filename: varchar("filename", { length: 255 }).notNull(),
    storagePath: varchar("storage_path", { length: 500 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),

    // Audit
    createdAt: timestamp("created_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
    deletedBy: uuid("deleted_by").references(() => user.id),
  },
  (table) => [
    index("idx_assets_business_id").on(table.businessId),
    index("idx_assets_created_at").on(table.createdAt),
    index("idx_assets_deleted_at").on(table.deletedAt),
  ]
);

export const assetsRelations = relations(assets, ({ one }) => ({
  business: one(businesses, {
    fields: [assets.businessId],
    references: [businesses.id],
  }),
  deletedByUser: one(user, {
    fields: [assets.deletedBy],
    references: [user.id],
  }),
}));

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
