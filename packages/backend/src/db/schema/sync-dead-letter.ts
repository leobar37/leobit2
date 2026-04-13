import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { businesses } from "./businesses";

/**
 * Dead Letter Queue table for permanently failed sync operations
 * Tracks operations that exceeded retry limits for admin review
 */
export const syncDeadLetter = pgTable(
  "sync_dead_letter",
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
    error: text("error").notNull(),
    syncAttempts: integer("sync_attempts").notNull().default(0),
    originalError: text("original_error"),
    clientTimestamp: timestamp("client_timestamp").notNull(),
    deviceId: varchar("device_id", { length: 128 }),
    sourceFingerprint: varchar("source_fingerprint", { length: 256 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_sync_dead_letter_business_id").on(table.businessId),
    index("idx_sync_dead_letter_entity").on(table.entity, table.entityId),
    index("idx_sync_dead_letter_created_at").on(table.createdAt),
  ]
);

export type SyncDeadLetter = typeof syncDeadLetter.$inferSelect;
export type NewSyncDeadLetter = typeof syncDeadLetter.$inferInsert;
