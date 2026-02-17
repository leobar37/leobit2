/**
 * User Profiles Schema
 * Datos personales del usuario (no relacionados con negocio)
 * La relación con negocios está en business_users
 */
import {
  pgTable,
  uuid,
  varchar,
  date,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { files } from "./files";

// Table definition - solo datos personales del usuario
export const userProfiles = pgTable(
  "user_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // FK to Better Auth user table
    userId: varchar("user_id", { length: 255 }).notNull().unique(),

    // Personal info
    dni: varchar("dni", { length: 20 }),
    phone: varchar("phone", { length: 50 }),
    birthDate: date("birth_date"),
    avatarId: uuid("avatar_id").references(() => files.id),

    // Account status
    isActive: boolean("is_active").notNull().default(true),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_user_profiles_user_id").on(table.userId),
    index("idx_user_profiles_is_active").on(table.isActive),
    index("idx_user_profiles_avatar_id").on(table.avatarId),
  ]
);

// Relations
export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  avatar: one(files, {
    fields: [userProfiles.avatarId],
    references: [files.id],
  }),
}));

// Type exports
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
