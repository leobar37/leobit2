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
  boolean,
  decimal,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { sql } from "drizzle-orm";
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
    hourlyBillingEnabled: boolean("hourly_billing_enabled").notNull().default(false),
    hourlyBaseRate: decimal("hourly_base_rate", { precision: 10, scale: 2 }).notNull().default("0"),
    hourlyBaseHours: integer("hourly_base_hours").notNull().default(1),
    extraHourRate: decimal("extra_hour_rate", { precision: 10, scale: 2 }).notNull().default("0"),
    defaultPaymentTiming: varchar("default_payment_timing", { length: 20 })
      .notNull()
      .default("exit"),

    // Accepted payment methods for parking checkout
    acceptedPaymentMethods: jsonb("accepted_payment_methods")
      .$type<("efectivo" | "yape" | "plin")[]>()
      .notNull()
      .default(["efectivo"]),
    vehicleTypes: jsonb("vehicle_types")
      .$type<{ id: string; label: string; enabled: boolean; isDefault?: boolean }[]>()
      .notNull()
      .default([
        { id: "auto", label: "Auto", enabled: true, isDefault: true },
        { id: "moto", label: "Moto", enabled: true, isDefault: true },
        { id: "camioneta", label: "Camioneta", enabled: true, isDefault: true },
        { id: "mototaxi", label: "Mototaxi", enabled: true, isDefault: true },
        { id: "motolineal", label: "Motolineal", enabled: true, isDefault: true },
      ]),

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

// Vehicle type values. Stored as varchar so each garage can add its own labels.
export const cocheraVehicleTypeEnum = ["auto", "moto", "camioneta", "mototaxi", "motolineal"] as const;
export type CocheraVehicleType = (typeof cocheraVehicleTypeEnum)[number] | (string & {});

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
    paymentTiming: varchar("payment_timing", { length: 20 }),
    entryAmountPaid: decimal("entry_amount_paid", { precision: 10, scale: 2 }).notNull().default("0"),
    entryPaymentMethod: varchar("entry_payment_method", { length: 20 }),
    entryPaymentAt: timestamp("entry_payment_at"),
    pricingSnapshot: jsonb("pricing_snapshot").$type<{
      hourlyBillingEnabled: boolean;
      hourlyRate: string;
      graceMinutes: number;
      dailyRate: string | null;
      hourlyBaseRate: string;
      hourlyBaseHours: number;
      extraHourRate: string;
    }>(),

    // Checkout fields prepared for F-005
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
    discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }),
    amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).default("0"),
    balanceDue: decimal("balance_due", { precision: 10, scale: 2 }).default("0"),
    paymentMode: varchar("payment_mode", { length: 20 }),
    paymentMethod: varchar("payment_method", { length: 20 }),
    responsibleCustomerId: uuid("responsible_customer_id").references(() => customers.id),
    customerVehicleId: uuid("customer_vehicle_id").references(() => cocheraCustomerVehicles.id),
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
  responsibleCustomer: one(customers, {
    fields: [cocheraSessions.responsibleCustomerId],
    references: [customers.id],
  }),
  customerVehicle: one(cocheraCustomerVehicles, {
    fields: [cocheraSessions.customerVehicleId],
    references: [cocheraCustomerVehicles.id],
  }),
}));

export const cocheraCustomerVehicles = pgTable(
  "cochera_customer_vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    plate: varchar("plate", { length: 20 }).notNull(),
    vehicleType: varchar("vehicle_type", { length: 20 }).notNull().default("auto"),
    alias: varchar("alias", { length: 120 }),
    notes: text("notes"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_cochera_customer_vehicles_business_id").on(table.businessId),
    index("idx_cochera_customer_vehicles_customer_id").on(table.customerId),
    index("idx_cochera_customer_vehicles_plate").on(table.plate),
    uniqueIndex("idx_cochera_customer_vehicles_active_plate")
      .on(table.businessId, table.plate)
      .where(sql`${table.active} = true`),
  ]
);

export type CocheraCustomerVehicle = typeof cocheraCustomerVehicles.$inferSelect;
export type NewCocheraCustomerVehicle = typeof cocheraCustomerVehicles.$inferInsert;

export const cocheraCustomerVehiclesRelations = relations(
  cocheraCustomerVehicles,
  ({ one, many }) => ({
    business: one(businesses, {
      fields: [cocheraCustomerVehicles.businessId],
      references: [businesses.id],
    }),
    customer: one(customers, {
      fields: [cocheraCustomerVehicles.customerId],
      references: [customers.id],
    }),
    sessions: many(cocheraSessions),
  })
);

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
