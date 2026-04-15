/**
 * Payments Schema (Abonos)
 * Pagos de deuda independientes de ventas
 */
import {
  pgTable,
  uuid,
  decimal,
  text,
  varchar,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { paymentMethodEnum, syncStatusEnum } from "./enums";
import { businesses, businessUsers } from "./businesses";
import { customers } from "./customers";
import { files } from "./files";
import { sales } from "./sales";

// Table definition
export const abonos = pgTable(
  "abonos",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Relations
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    // sellerId apunta a business_users (quien recibe el pago dentro del negocio)
    // Optional for legacy data - may be null for historical records
    sellerId: uuid("seller_id")
      .references(() => businessUsers.id),

    // Payment details
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("efectivo"),
    notes: text("notes"),

    // Payment proof - file ID reference (Yape/Plin screenshot or QR code)
    proofImageId: uuid("proof_image_id").references(() => files.id),

    // Reference number for reconciliation (Yape/Plin transaction ID)
    referenceNumber: varchar("reference_number", { length: 50 }).unique(),

    // Related sale for cancellation tracking
    relatedSaleId: uuid("related_sale_id").references(() => sales.id),

    // Sync status for offline-first
    syncStatus: syncStatusEnum("sync_status").notNull().default("synced"),
    syncAttempts: integer("sync_attempts").notNull().default(0),

    // Version for optimistic locking (multi-device conflict detection)
    version: integer("version").notNull().default(1),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_abonos_business_id").on(table.businessId),
    index("idx_payments_customer_id").on(table.customerId),
    index("idx_abonos_seller_id").on(table.sellerId),
    index("idx_abonos_payment_method").on(table.paymentMethod),
    index("idx_abonos_proof_image_id").on(table.proofImageId),
    index("idx_abonos_related_sale_id").on(table.relatedSaleId),
    index("idx_abonos_sync_status").on(table.syncStatus),
    index("idx_abonos_created_at").on(table.createdAt),
    index("idx_abonos_updated_at").on(table.updatedAt),
  ]
);

// Type exports
export type Abono = typeof abonos.$inferSelect;
export type NewAbono = typeof abonos.$inferInsert;

export const abonosRelations = relations(abonos, ({ one }) => ({
  business: one(businesses, {
    fields: [abonos.businessId],
    references: [businesses.id],
  }),
  customer: one(customers, {
    fields: [abonos.customerId],
    references: [customers.id],
  }),
  seller: one(businessUsers, {
    fields: [abonos.sellerId],
    references: [businessUsers.id],
  }),
  proofImage: one(files, {
    fields: [abonos.proofImageId],
    references: [files.id],
  }),
}));
