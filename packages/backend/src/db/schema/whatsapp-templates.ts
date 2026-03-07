import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { businesses, businessUsers } from "./businesses";

export const whatsAppTemplates = pgTable(
  "whatsapp_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessUserId: uuid("business_user_id")
      .notNull()
      .references(() => businessUsers.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    content: text("content").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_whatsapp_templates_business_user_id").on(table.businessUserId),
    index("idx_whatsapp_templates_business_id").on(table.businessId),
  ]
);

export type WhatsAppTemplate = typeof whatsAppTemplates.$inferSelect;
export type NewWhatsAppTemplate = typeof whatsAppTemplates.$inferInsert;

export const whatsAppTemplatesRelations = relations(
  whatsAppTemplates,
  ({ one }) => ({
    businessUser: one(businessUsers, {
      fields: [whatsAppTemplates.businessUserId],
      references: [businessUsers.id],
    }),
    business: one(businesses, {
      fields: [whatsAppTemplates.businessId],
      references: [businesses.id],
    }),
  })
);
