import { pgTable, serial, text, numeric, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").unique(),
  customerName: text("customer_name"),
  customerId: integer("customer_id"),
  stockReserved:boolean("stock_reserved").notNull().default(false),
  stockReleased:boolean("stock_released").notNull().default(false),
  paymentIntentId:text("payment_intent_id"),
  paymentStatus:text("payment_status"),
  paymentCartId:text("payment_cart_id"),
  discountCustomerKey:text("discount_customer_key"),
  couponCode:text("coupon_code"),
  discountAmount:numeric("discount_amount",{precision:10,scale:2}).default("0"),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  customerAddress: text("customer_address"),
  countryCode: text("country_code").notNull().default("AE"),
  paymentMethod: text("payment_method").default("cod"),
  deliveryMethod: text("delivery_method").default("standard"),
  deliveryCharge: numeric("delivery_charge", { precision: 10, scale: 2 }).default("25"),
  tip: numeric("tip", { precision: 10, scale: 2 }).default("0"),
  courierName: text("courier_name"),
  estimatedDelivery: text("estimated_delivery"),
  status: text("status").notNull().default("pending"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  hasPreOrder: boolean("has_pre_order").notNull().default(false),
  trackingNote: text("tracking_note"),
  delayReason:text("delay_reason"),
  delayedUntil:text("delayed_until"),
  cancelReason:text("cancel_reason"),
  refundInitiated:boolean("refund_initiated").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
