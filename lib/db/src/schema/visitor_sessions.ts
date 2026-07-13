import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const visitorSessionsTable = pgTable("visitor_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  deviceType: text("device_type"),
  deviceOs: text("device_os"),
  browser: text("browser"),
  screenWidth: integer("screen_width"),
  screenHeight: integer("screen_height"),
  referrer: text("referrer"),
  entryPage: text("entry_page"),
  events: text("events"),
  durationSeconds: integer("duration_seconds"),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

export type VisitorSession = typeof visitorSessionsTable.$inferSelect;
