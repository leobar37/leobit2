import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { businesses } from "./businesses";

export const syncOperations = pgTable(
  "sync_operations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    operationId: varchar("operation_id", { length: 128 }).notNull(),
    entity: varchar("entity", { length: 64 }).notNull(),
    action: varchar("action", { length: 32 }).notNull(),
    entityId: varchar("entity_id", { length: 128 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    error: text("error"),
    clientTimestamp: timestamp("client_timestamp").notNull(),
    processedAt: timestamp("processed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_sync_operations_business_id").on(table.businessId),
    index("idx_sync_operations_status").on(table.status),
    index("idx_sync_operations_processed_at").on(table.processedAt),
    uniqueIndex("uq_sync_operations_business_operation").on(
      table.businessId,
      table.operationId
    ),
  ]
);

export type SyncOperation = typeof syncOperations.$inferSelect;
export type NewSyncOperation = typeof syncOperations.$inferInsert;

export const syncOperationsRelations = relations(syncOperations, ({ one }) => ({
  business: one(businesses, {
    fields: [syncOperations.businessId],
    references: [businesses.id],
  }),
}));
