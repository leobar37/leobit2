/**
 * Cochera (Parking) Schema
 * Dedicated extension tables for parking garage businesses.
 */
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  decimal,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { businesses, businessUsers } from "./businesses";
import { customers } from "./customers";
import { files } from "./files";
import { paymentMethodEnum } from "./enums";

export const cocheraSettings = pgTable(
  "cochera_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" })
      .unique(),

    // Identity overrides (optional, falls back to business name/address)
    displayName: varchar("display_name", { length: 120 }),
    displayAddress: text("display_address"),

    // Rates
    hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull().default("0"),
    dailyRate: decimal("daily_rate", { precision: 10, scale: 2 }),

    // Rules
    graceMinutes: integer("grace_minutes").notNull().default(0),
    totalSpaces: integer("total_spaces").notNull().default(0),

    // Accepted payment methods for parking checkout
    acceptedPaymentMethods: jsonb("accepted_payment_methods")
      .$type<("efectivo" | "yape" | "plin")[]>()
      .notNull()
      .default(["efectivo"]),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_cochera_settings_business_id").on(table.businessId),
  ]
);

export type CocheraSettings = typeof cocheraSettings.$inferSelect;
export type NewCocheraSettings = typeof cocheraSettings.$inferInsert;

export const cocheraSettingsRelations = relations(cocheraSettings, ({ one }) => ({
  business: one(businesses, {
    fields: [cocheraSettings.businessId],
    references: [businesses.id],
  }),
}));

// Vehicle session status values
export const cocheraSessionStatusEnum = ["dentro", "fuera"] as const;
export type CocheraSessionStatus = (typeof cocheraSessionStatusEnum)[number];

// Vehicle type values
export const cocheraVehicleTypeEnum = ["auto", "moto", "camioneta"] as const;
export type CocheraVehicleType = (typeof cocheraVehicleTypeEnum)[number];

export const cocheraSessions = pgTable(
  "cochera_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),

    // Vehicle info
    plate: varchar("plate", { length: 20 }).notNull(),
    vehicleType: varchar("vehicle_type", { length: 20 }).notNull().default("auto"),

    // Session lifecycle
    status: varchar("status", { length: 20 }).notNull().default("dentro"),
    entryAt: timestamp("entry_at").notNull().defaultNow(),
    exitAt: timestamp("exit_at"),

    // Optional notes
    notes: text("notes"),

    // Checkout fields prepared for F-005
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
    discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }),
    amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).default("0"),
    balanceDue: decimal("balance_due", { precision: 10, scale: 2 }).default("0"),
    paymentMode: varchar("payment_mode", { length: 20 }),
    paymentMethod: varchar("payment_method", { length: 20 }),
    responsibleCustomerId: uuid("responsible_customer_id").references(() => customers.id),
    responsibleName: varchar("responsible_name", { length: 160 }),
    responsiblePhone: varchar("responsible_phone", { length: 40 }),
    settlementNotes: text("settlement_notes"),
    checkoutAt: timestamp("checkout_at"),
    checkoutBy: uuid("checkout_by"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_cochera_sessions_business_id").on(table.businessId),
    index("idx_cochera_sessions_status").on(table.status),
    index("idx_cochera_sessions_plate").on(table.plate),
    index("idx_cochera_sessions_entry_at").on(table.entryAt),
    index("idx_cochera_sessions_active_plate").on(table.businessId, table.plate, table.status),
  ]
);

export type CocheraSession = typeof cocheraSessions.$inferSelect;
export type NewCocheraSession = typeof cocheraSessions.$inferInsert;

export const cocheraSessionsRelations = relations(cocheraSessions, ({ one }) => ({
  business: one(businesses, {
    fields: [cocheraSessions.businessId],
    references: [businesses.id],
  }),
}));

export const cocheraSessionPayments = pgTable(
  "cochera_session_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => cocheraSessions.id, { onDelete: "cascade" }),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("efectivo"),
    referenceNumber: varchar("reference_number", { length: 50 }),
    proofImageId: uuid("proof_image_id").references(() => files.id),
    notes: text("notes"),
    collectedBy: uuid("collected_by").references(() => businessUsers.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_cochera_session_payments_business_id").on(table.businessId),
    index("idx_cochera_session_payments_session_id").on(table.sessionId),
    index("idx_cochera_session_payments_payment_method").on(table.paymentMethod),
    index("idx_cochera_session_payments_proof_image_id").on(table.proofImageId),
    index("idx_cochera_session_payments_collected_by").on(table.collectedBy),
    index("idx_cochera_session_payments_created_at").on(table.createdAt),
  ]
);

export type CocheraSessionPayment = typeof cocheraSessionPayments.$inferSelect;
export type NewCocheraSessionPayment = typeof cocheraSessionPayments.$inferInsert;

export const cocheraSessionPaymentsRelations = relations(
  cocheraSessionPayments,
  ({ one }) => ({
    business: one(businesses, {
      fields: [cocheraSessionPayments.businessId],
      references: [businesses.id],
    }),
    session: one(cocheraSessions, {
      fields: [cocheraSessionPayments.sessionId],
      references: [cocheraSessions.id],
    }),
    proofImage: one(files, {
      fields: [cocheraSessionPayments.proofImageId],
      references: [files.id],
    }),
    collector: one(businessUsers, {
      fields: [cocheraSessionPayments.collectedBy],
      references: [businessUsers.id],
    }),
  })
);
