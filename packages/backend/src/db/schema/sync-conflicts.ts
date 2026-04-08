import { pgTable, uuid, varchar, text, timestamp, jsonb, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { businesses } from "./businesses";
import { businessUsers } from "./businesses";

export const syncConflicts = pgTable(
  "sync_conflicts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    operationId: varchar("operation_id", { length: 128 }).notNull(),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: varchar("entity_id", { length: 128 }).notNull(),
    localData: jsonb("local_data").$type<Record<string, unknown>>().notNull(),
    serverData: jsonb("server_data").$type<Record<string, unknown>>().notNull(),
    localVersion: integer("local_version").notNull(),
    serverVersion: integer("server_version").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    resolution: varchar("resolution", { length: 32 }),
    resolvedBy: uuid("resolved_by").references(() => businessUsers.id),
    resolvedAt: timestamp("resolved_at"),

    // Device tracking for debugging multi-device conflicts
    sourceDeviceId: varchar("source_device_id", { length: 128 }),
    sourceFingerprint: varchar("source_fingerprint", { length: 256 }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_sync_conflicts_business_id").on(table.businessId),
    index("idx_sync_conflicts_status").on(table.status),
    index("idx_sync_conflicts_entity").on(table.entityType, table.entityId),
    index("idx_sync_conflicts_created_at").on(table.createdAt),
    uniqueIndex("uq_sync_conflicts_operation").on(
      table.businessId,
      table.operationId
    ),
  ]
);

export type SyncConflict = typeof syncConflicts.$inferSelect;
export type NewSyncConflict = typeof syncConflicts.$inferInsert;

export const syncConflictsRelations = relations(syncConflicts, ({ one }) => ({
  business: one(businesses, {
    fields: [syncConflicts.businessId],
    references: [businesses.id],
  }),
  resolvedByUser: one(businessUsers, {
    fields: [syncConflicts.resolvedBy],
    references: [businessUsers.id],
  }),
}));
