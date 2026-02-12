/**
 * Database Relations
 * Centralized relation definitions to avoid circular dependencies
 */
import { relations } from "drizzle-orm";
import { userProfiles } from "./user-profiles";
import { customers } from "./customers";
import { sales, saleItems } from "./sales";
import { abonos } from "./payments";
import { products, inventory, distribuciones } from "./inventory";
import { businesses, businessUsers } from "./businesses";

// User Profiles relations
export const userProfilesRelations = relations(userProfiles, ({ many }) => ({
  // Note: businessUsers define la relación con negocios
}));

// Business relations
export const businessesRelations = relations(businesses, ({ many }) => ({
  businessUsers: many(businessUsers),
}));

// Business Users relations
export const businessUsersRelations = relations(businessUsers, ({ one, many }) => ({
  business: one(businesses, {
    fields: [businessUsers.businessId],
    references: [businesses.id],
  }),
  // Relations to business-specific data
  sales: many(sales),
  abonos: many(abonos),
  distribuciones: many(distribuciones),
  customers: many(customers),
}));

// Customers relations
export const customersRelations = relations(customers, ({ one, many }) => ({
  business: one(businesses, {
    fields: [customers.businessId],
    references: [businesses.id],
  }),
  creator: one(businessUsers, {
    fields: [customers.createdBy],
    references: [businessUsers.id],
  }),
  sales: many(sales),
  abonos: many(abonos),
}));

// Sales relations
export const salesRelations = relations(sales, ({ one, many }) => ({
  business: one(businesses, {
    fields: [sales.businessId],
    references: [businesses.id],
  }),
  client: one(customers, {
    fields: [sales.clientId],
    references: [customers.id],
  }),
  seller: one(businessUsers, {
    fields: [sales.sellerId],
    references: [businessUsers.id],
  }),
  distribucion: one(distribuciones, {
    fields: [sales.distribucionId],
    references: [distribuciones.id],
  }),
  items: many(saleItems),
}));

// Sale Items relations
export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id],
  }),
}));

// Abonos relations
export const abonosRelations = relations(abonos, ({ one }) => ({
  business: one(businesses, {
    fields: [abonos.businessId],
    references: [businesses.id],
  }),
  client: one(customers, {
    fields: [abonos.clientId],
    references: [customers.id],
  }),
  seller: one(businessUsers, {
    fields: [abonos.sellerId],
    references: [businessUsers.id],
  }),
}));

// Products relations
export const productsRelations = relations(products, ({ many }) => ({
  inventory: many(inventory),
  saleItems: many(saleItems),
}));

// Inventory relations
export const inventoryRelations = relations(inventory, ({ one }) => ({
  product: one(products, {
    fields: [inventory.productId],
    references: [products.id],
  }),
}));

// Distribuciones relations
export const distribucionesRelations = relations(distribuciones, ({ one, many }) => ({
  business: one(businesses, {
    fields: [distribuciones.businessId],
    references: [businesses.id],
  }),
  vendedor: one(businessUsers, {
    fields: [distribuciones.vendedorId],
    references: [businessUsers.id],
  }),
  sales: many(sales),
}));
