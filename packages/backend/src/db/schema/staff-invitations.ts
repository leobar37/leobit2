import { pgTable, uuid, varchar, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { businesses } from "./businesses";

export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "rejected",
  "cancelled",
  "expired",
]);

export const staffInvitations = pgTable("staff_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),

  email: varchar("email", { length: 255 }).notNull(),
  inviteeName: varchar("invitee_name", { length: 255 }).notNull(),
  salesPoint: varchar("sales_point", { length: 100 }),

  token: varchar("token", { length: 255 }).unique().notNull(),

  status: invitationStatusEnum("status").notNull().default("pending"),

  invitedBy: varchar("invited_by", { length: 255 }).notNull(),
  acceptedBy: varchar("accepted_by", { length: 255 }),

  sentAt: timestamp("sent_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  rejectedAt: timestamp("rejected_at"),
  cancelledAt: timestamp("cancelled_at"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type StaffInvitation = typeof staffInvitations.$inferSelect;
export type NewStaffInvitation = typeof staffInvitations.$inferInsert;
