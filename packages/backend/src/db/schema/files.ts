/**
 * Files Schema
 * Archivos privados/adjuntos específicos de entidades
 * Logos, fotos de perfil, comprobantes de pago, vouchers
 */
import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  text,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { businesses } from "./businesses";
import { user } from "./auth";

export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Multi-tenancy (nullable para onboarding)
    businessId: uuid("business_id").references(() => businesses.id),

    // File metadata
    filename: varchar("filename", { length: 255 }).notNull(),
    storagePath: varchar("storage_path", { length: 500 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),

    // Audit
    createdAt: timestamp("created_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
    deletedBy: text("deleted_by").references(() => user.id),

    // Timestamps
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_files_business_id").on(table.businessId),
    index("idx_files_created_at").on(table.createdAt),
    index("idx_files_deleted_at").on(table.deletedAt),
    index("idx_files_updated_at").on(table.updatedAt),
  ]
);

export const filesRelations = relations(files, ({ one }) => ({
  business: one(businesses, {
    fields: [files.businessId],
    references: [businesses.id],
  }),
  logoForBusiness: one(businesses, {
    fields: [files.id],
    references: [businesses.logoFileId],
  }),
  deletedByUser: one(user, {
    fields: [files.deletedBy],
    references: [user.id],
  }),
}));

export type FileRecord = typeof files.$inferSelect;
export type NewFileRecord = typeof files.$inferInsert;
