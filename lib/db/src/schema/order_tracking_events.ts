import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const orderTrackingEventsTable = pgTable("order_tracking_events", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  status: text("status").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrderTrackingEventSchema = createInsertSchema(orderTrackingEventsTable).omit({ id: true, createdAt: true });
export type InsertOrderTrackingEvent = z.infer<typeof insertOrderTrackingEventSchema>;
export type OrderTrackingEvent = typeof orderTrackingEventsTable.$inferSelect;
