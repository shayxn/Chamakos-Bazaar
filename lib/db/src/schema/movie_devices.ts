import { pgTable, uuid, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
export const movieDevicesTable = pgTable("admin_movie_devices", {
  id: uuid("id").primaryKey(),
  adminId: integer("admin_id").notNull().references(() => usersTable.id),
  adminSessionId: integer("admin_session_id"),
  endpoint: text("endpoint").notNull().unique(),
  label: text("label").notNull(),
  optedIn: boolean("opted_in").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
