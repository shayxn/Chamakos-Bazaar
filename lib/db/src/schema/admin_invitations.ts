import { pgTable, uuid, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const adminInvitationsTable = pgTable("admin_invitations", {
  id: uuid("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  createdBy: integer("created_by").notNull().references(() => usersTable.id),
  permissions: jsonb("permissions").$type<string[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  acceptedBy: integer("accepted_by").references(() => usersTable.id),
});
