import { pgTable, serial, text, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").unique(),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  customerAddress: text("customer_address"),
  paymentMethod: text("payment_method").default("cod"),
  deliveryMethod: text("delivery_method").default("standard"),
  deliveryCharge: numeric("delivery_charge", { precision: 10, scale: 2 }).default("20"),
  tip: numeric("tip", { precision: 10, scale: 2 }).default("0"),
  courierName: text("courier_name"),
  estimatedDelivery: text("estimated_delivery"),
  status: text("status").notNull().default("pending"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  hasPreOrder: boolean("has_pre_order").notNull().default(false),
  trackingNote: text("tracking_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
