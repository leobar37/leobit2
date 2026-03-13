import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { businesses, businessUsers } from "./businesses";
import { customers } from "./customers";
import { whatsAppTemplates } from "./whatsapp-templates";

export const messageStatusEnum = ["enviado", "entregado", "fallido"] as const;

export const whatsAppMessages = pgTable(
  "whatsapp_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessUserId: uuid("business_user_id")
      .notNull()
      .references(() => businessUsers.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    templateId: uuid("template_id")
      .references(() => whatsAppTemplates.id, { onDelete: "set null" }),
    phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
    messageContent: text("message_content").notNull(),
    status: varchar("status", { length: 20, enum: messageStatusEnum })
      .notNull()
      .default("enviado"),
    errorMessage: text("error_message"),
    sentAt: timestamp("sent_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_whatsapp_messages_business_user_id").on(table.businessUserId),
    index("idx_whatsapp_messages_business_id").on(table.businessId),
    index("idx_whatsapp_messages_customer_id").on(table.customerId),
    index("idx_whatsapp_messages_status").on(table.status),
    index("idx_whatsapp_messages_sent_at").on(table.sentAt),
  ]
);

export type WhatsAppMessage = typeof whatsAppMessages.$inferSelect;
export type NewWhatsAppMessage = typeof whatsAppMessages.$inferInsert;

export const whatsAppMessagesRelations = relations(
  whatsAppMessages,
  ({ one }) => ({
    businessUser: one(businessUsers, {
      fields: [whatsAppMessages.businessUserId],
      references: [businessUsers.id],
    }),
    business: one(businesses, {
      fields: [whatsAppMessages.businessId],
      references: [businesses.id],
    }),
    customer: one(customers, {
      fields: [whatsAppMessages.customerId],
      references: [customers.id],
    }),
    template: one(whatsAppTemplates, {
      fields: [whatsAppMessages.templateId],
      references: [whatsAppTemplates.id],
    }),
  })
);
