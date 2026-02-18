/**
 * Business Payment Settings Schema
 * Configuración de métodos de pago por negocio
 */
import {
  pgTable,
  uuid,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { businesses } from "./businesses";

export interface PaymentMethodConfig {
  enabled: boolean;
  phone?: string;
  accountNumber?: string;
  accountName?: string;
  bank?: string;
  cci?: string;
  qrImageUrl?: string;
}

export const businessPaymentSettings = pgTable(
  "business_payment_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" })
      .unique(),
    methods: jsonb("methods").$type<{
      efectivo: PaymentMethodConfig;
      yape: PaymentMethodConfig;
      plin: PaymentMethodConfig;
      transferencia: PaymentMethodConfig;
      tarjeta: PaymentMethodConfig;
    }>().notNull().default({
      efectivo: { enabled: true },
      yape: { enabled: false },
      plin: { enabled: false },
      transferencia: { enabled: false },
      tarjeta: { enabled: false },
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_business_payment_settings_business_id").on(table.businessId),
  ]
);

export type BusinessPaymentSettings = typeof businessPaymentSettings.$inferSelect;
export type NewBusinessPaymentSettings = typeof businessPaymentSettings.$inferInsert;

export const businessPaymentSettingsRelations = relations(
  businessPaymentSettings,
  ({ one }) => ({
    business: one(businesses, {
      fields: [businessPaymentSettings.businessId],
      references: [businesses.id],
    }),
  })
);
