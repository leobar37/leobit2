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

// Table definition
export const abonos = pgTable(
  "abonos",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Relations
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    clientId: uuid("client_id")
      .notNull()
      .references(() => customers.id),
    // sellerId apunta a business_users (quien recibe el pago dentro del negocio)
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => businessUsers.id),

    // Payment details
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("efectivo"),
    notes: text("notes"),

    // Payment proof - file ID reference (Yape/Plin screenshot or QR code)
    proofImageId: uuid("proof_image_id").references(() => files.id),

    // Reference number for reconciliation (Yape/Plin transaction ID)
    referenceNumber: varchar("reference_number", { length: 50 }),

    // Sync status for offline-first
    syncStatus: syncStatusEnum("sync_status").notNull().default("pending"),
    syncAttempts: integer("sync_attempts").notNull().default(0),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_abonos_business_id").on(table.businessId),
    index("idx_abonos_client_id").on(table.clientId),
    index("idx_abonos_seller_id").on(table.sellerId),
    index("idx_abonos_payment_method").on(table.paymentMethod),
    index("idx_abonos_proof_image_id").on(table.proofImageId),
    index("idx_abonos_sync_status").on(table.syncStatus),
    index("idx_abonos_created_at").on(table.createdAt),
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
  client: one(customers, {
    fields: [abonos.clientId],
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
