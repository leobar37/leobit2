/**
 * Water vertical schema
 * Typed extension tables for bidon delivery businesses.
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
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { businesses } from "./businesses";
import { customers } from "./customers";
import { visitas } from "./visitas";

export const waterRoutes = pgTable(
  "water_routes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    zone: varchar("zone", { length: 160 }),
    description: text("description"),
    isActive: integer("is_active").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_water_routes_business_id").on(table.businessId),
    uniqueIndex("ux_water_routes_business_name").on(table.businessId, table.name),
  ]
);

export const waterCustomerProfiles = pgTable(
  "water_customer_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),

    deliveryFrequency: varchar("delivery_frequency", { length: 40 }).notNull().default("weekly"),
    deliveryDays: jsonb("delivery_days").$type<string[]>().notNull().default([]),
    defaultContainerQuantity: integer("default_container_quantity").notNull().default(1),
    containersAtCustomer: integer("containers_at_customer").notNull().default(0),
    depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }).notNull().default("0"),
    depositStatus: varchar("deposit_status", { length: 30 }).notNull().default("none"),
    depositExceptionReason: text("deposit_exception_reason"),
    waterRouteId: uuid("water_route_id").references(() => waterRoutes.id, { onDelete: "set null" }),
    preferredRoute: varchar("preferred_route", { length: 120 }),
    deliveryInstructions: text("delivery_instructions"),
    scheduleAnchorDate: timestamp("schedule_anchor_date"),
    lastScheduledAt: timestamp("last_scheduled_at"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_water_customer_profiles_business_id").on(table.businessId),
    index("idx_water_customer_profiles_customer_id").on(table.customerId),
    index("idx_water_customer_profiles_water_route_id").on(table.waterRouteId),
    index("idx_water_customer_profiles_preferred_route").on(table.businessId, table.preferredRoute),
    uniqueIndex("ux_water_customer_profiles_business_customer").on(table.businessId, table.customerId),
  ]
);

export const waterDeliveryStops = pgTable(
  "water_delivery_stops",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    visitaId: uuid("visita_id")
      .notNull()
      .references(() => visitas.id, { onDelete: "cascade" }),
    customerProfileId: uuid("customer_profile_id")
      .notNull()
      .references(() => waterCustomerProfiles.id, { onDelete: "cascade" }),
    waterRouteId: uuid("water_route_id").references(() => waterRoutes.id, { onDelete: "set null" }),
    scheduledDate: varchar("scheduled_date", { length: 10 }).notNull(),

    expectedContainerQuantity: integer("expected_container_quantity").notNull().default(1),
    containersAtStart: integer("containers_at_start").notNull().default(0),
    deliveredContainerQuantity: integer("delivered_container_quantity").notNull().default(0),
    collectedContainerQuantity: integer("collected_container_quantity").notNull().default(0),
    damagedContainerQuantity: integer("damaged_container_quantity").notNull().default(0),
    lostContainerQuantity: integer("lost_container_quantity").notNull().default(0),
    status: varchar("status", { length: 30 }).notNull().default("pendiente"),
    notes: text("notes"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_water_delivery_stops_business_id").on(table.businessId),
    index("idx_water_delivery_stops_visita_id").on(table.visitaId),
    index("idx_water_delivery_stops_profile_id").on(table.customerProfileId),
    index("idx_water_delivery_stops_route_date").on(table.businessId, table.waterRouteId, table.scheduledDate),
    index("idx_water_delivery_stops_status").on(table.status),
    uniqueIndex("ux_water_delivery_stops_visita").on(table.visitaId),
    uniqueIndex("ux_water_delivery_stops_profile_route_date").on(table.businessId, table.customerProfileId, table.waterRouteId, table.scheduledDate),
  ]
);

export const waterContainerLedgerEntries = pgTable(
  "water_container_ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    customerProfileId: uuid("customer_profile_id")
      .notNull()
      .references(() => waterCustomerProfiles.id, { onDelete: "cascade" }),
    visitaId: uuid("visita_id").references(() => visitas.id, { onDelete: "set null" }),

    entryType: varchar("entry_type", { length: 30 }).notNull(),
    quantity: integer("quantity").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    reason: text("reason"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_water_container_ledger_business_id").on(table.businessId),
    index("idx_water_container_ledger_customer_id").on(table.customerId),
    index("idx_water_container_ledger_profile_id").on(table.customerProfileId),
    index("idx_water_container_ledger_created_at").on(table.createdAt),
  ]
);

export const waterDepositLedgerEntries = pgTable(
  "water_deposit_ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    customerProfileId: uuid("customer_profile_id")
      .notNull()
      .references(() => waterCustomerProfiles.id, { onDelete: "cascade" }),

    entryType: varchar("entry_type", { length: 30 }).notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),
    reason: text("reason"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_water_deposit_ledger_business_id").on(table.businessId),
    index("idx_water_deposit_ledger_customer_id").on(table.customerId),
    index("idx_water_deposit_ledger_profile_id").on(table.customerProfileId),
    index("idx_water_deposit_ledger_created_at").on(table.createdAt),
  ]
);

export type WaterRoute = typeof waterRoutes.$inferSelect;
export type NewWaterRoute = typeof waterRoutes.$inferInsert;
export type WaterCustomerProfile = typeof waterCustomerProfiles.$inferSelect;
export type NewWaterCustomerProfile = typeof waterCustomerProfiles.$inferInsert;
export type WaterDeliveryStop = typeof waterDeliveryStops.$inferSelect;
export type NewWaterDeliveryStop = typeof waterDeliveryStops.$inferInsert;
export type WaterContainerLedgerEntry = typeof waterContainerLedgerEntries.$inferSelect;
export type NewWaterContainerLedgerEntry = typeof waterContainerLedgerEntries.$inferInsert;
export type WaterDepositLedgerEntry = typeof waterDepositLedgerEntries.$inferSelect;
export type NewWaterDepositLedgerEntry = typeof waterDepositLedgerEntries.$inferInsert;

export const waterCustomerProfilesRelations = relations(waterCustomerProfiles, ({ one, many }) => ({
  business: one(businesses, {
    fields: [waterCustomerProfiles.businessId],
    references: [businesses.id],
  }),
  customer: one(customers, {
    fields: [waterCustomerProfiles.customerId],
    references: [customers.id],
  }),
  waterRoute: one(waterRoutes, {
    fields: [waterCustomerProfiles.waterRouteId],
    references: [waterRoutes.id],
  }),
  deliveryStops: many(waterDeliveryStops),
  containerLedgerEntries: many(waterContainerLedgerEntries),
  depositLedgerEntries: many(waterDepositLedgerEntries),
}));

export const waterRoutesRelations = relations(waterRoutes, ({ one, many }) => ({
  business: one(businesses, {
    fields: [waterRoutes.businessId],
    references: [businesses.id],
  }),
  customerProfiles: many(waterCustomerProfiles),
  deliveryStops: many(waterDeliveryStops),
}));

export const waterDeliveryStopsRelations = relations(waterDeliveryStops, ({ one }) => ({
  business: one(businesses, {
    fields: [waterDeliveryStops.businessId],
    references: [businesses.id],
  }),
  visita: one(visitas, {
    fields: [waterDeliveryStops.visitaId],
    references: [visitas.id],
  }),
  customerProfile: one(waterCustomerProfiles, {
    fields: [waterDeliveryStops.customerProfileId],
    references: [waterCustomerProfiles.id],
  }),
  waterRoute: one(waterRoutes, {
    fields: [waterDeliveryStops.waterRouteId],
    references: [waterRoutes.id],
  }),
}));

export const waterContainerLedgerEntriesRelations = relations(waterContainerLedgerEntries, ({ one }) => ({
  business: one(businesses, {
    fields: [waterContainerLedgerEntries.businessId],
    references: [businesses.id],
  }),
  customer: one(customers, {
    fields: [waterContainerLedgerEntries.customerId],
    references: [customers.id],
  }),
  customerProfile: one(waterCustomerProfiles, {
    fields: [waterContainerLedgerEntries.customerProfileId],
    references: [waterCustomerProfiles.id],
  }),
  visita: one(visitas, {
    fields: [waterContainerLedgerEntries.visitaId],
    references: [visitas.id],
  }),
}));

export const waterDepositLedgerEntriesRelations = relations(waterDepositLedgerEntries, ({ one }) => ({
  business: one(businesses, {
    fields: [waterDepositLedgerEntries.businessId],
    references: [businesses.id],
  }),
  customer: one(customers, {
    fields: [waterDepositLedgerEntries.customerId],
    references: [customers.id],
  }),
  customerProfile: one(waterCustomerProfiles, {
    fields: [waterDepositLedgerEntries.customerProfileId],
    references: [waterCustomerProfiles.id],
  }),
}));
