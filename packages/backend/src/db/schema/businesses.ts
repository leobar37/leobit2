/**
 * Businesses Schema
 * Entidad de negocio para separar datos del negocio de datos del usuario
 * Soporta multi-tenancy: un usuario puede pertenecer a múltiples negocios
 */
import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  boolean,
  timestamp,
  date,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { businessUserRoleEnum } from "./enums";

// Businesses table - datos del negocio
export const businesses = pgTable(
  "businesses",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Business info
    name: varchar("name", { length: 100 }).notNull(),
    ruc: varchar("ruc", { length: 20 }), // RUC/DNI fiscal
    address: text("address"),
    phone: varchar("phone", { length: 20 }),
    email: varchar("email", { length: 100 }),
    logoUrl: varchar("logo_url", { length: 255 }),

    // Feature flags específicos del negocio (override de system_config)
    modoOperacion: varchar("modo_operacion", { length: 50 }).default("inventario_propio"),
    controlKilos: boolean("control_kilos").default(true),
    usarDistribucion: boolean("usar_distribucion").default(true),
    permitirVentaSinStock: boolean("permitir_venta_sin_stock").default(false),

    isActive: boolean("is_active").notNull().default(true),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_businesses_name").on(table.name),
    index("idx_businesses_ruc").on(table.ruc),
    index("idx_businesses_is_active").on(table.isActive),
  ]
);

// Business Users - relación muchos a muchos entre negocios y usuarios
export const businessUsers = pgTable(
  "business_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Relations
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 }).notNull(), // FK a Better Auth user.id

    // Role in this business
    role: businessUserRoleEnum("role").notNull().default("VENDEDOR"),

    // Business-specific data (antes en user_profiles)
    salesPoint: varchar("sales_point", { length: 100 }), // Carro A, Casa, etc.
    commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("0"),

    isActive: boolean("is_active").notNull().default(true),

    // Timestamps
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_business_users_business_id").on(table.businessId),
    index("idx_business_users_user_id").on(table.userId),
    index("idx_business_users_role").on(table.role),
    index("idx_business_users_unique").on(table.businessId, table.userId),
  ]
);

// Type exports
export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
export type BusinessUser = typeof businessUsers.$inferSelect;
export type NewBusinessUser = typeof businessUsers.$inferInsert;

export const businessesRelations = relations(businesses, ({ many }) => ({
  users: many(businessUsers),
}));

export const businessUsersRelations = relations(businessUsers, ({ one }) => ({
  business: one(businesses, {
    fields: [businessUsers.businessId],
    references: [businesses.id],
  }),
}));
