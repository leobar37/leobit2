import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { businesses, businessUsers } from "./businesses";

export const businessUserWhatsAppSettings = pgTable(
  "business_user_whatsapp_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessUserId: uuid("business_user_id")
      .notNull()
      .references(() => businessUsers.id, { onDelete: "cascade" })
      .unique(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    isConnected: boolean("is_connected").notNull().default(false),
    phoneNumber: varchar("phone_number", { length: 20 }),
    instanceName: varchar("instance_name", { length: 100 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_whatsapp_settings_business_user_id").on(table.businessUserId),
    index("idx_whatsapp_settings_business_id").on(table.businessId),
  ]
);

export type BusinessUserWhatsAppSettings = typeof businessUserWhatsAppSettings.$inferSelect;
export type NewBusinessUserWhatsAppSettings = typeof businessUserWhatsAppSettings.$inferInsert;

export const businessUserWhatsAppSettingsRelations = relations(
  businessUserWhatsAppSettings,
  ({ one }) => ({
    businessUser: one(businessUsers, {
      fields: [businessUserWhatsAppSettings.businessUserId],
      references: [businessUsers.id],
    }),
    business: one(businesses, {
      fields: [businessUserWhatsAppSettings.businessId],
      references: [businesses.id],
    }),
  })
);
