import { pgTable, serial, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const abandonedCartsTable = pgTable("abandoned_carts", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  customerEmail: text("customer_email"),
  customerName: text("customer_name"),
  cartData: text("cart_data"),
  totalValue: numeric("total_value", { precision: 10, scale: 2 }),
  itemCount: numeric("item_count").default("0"),
  recovered: boolean("recovered").notNull().default(false),
  recoveredAt: timestamp("recovered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAbandonedCartSchema = createInsertSchema(abandonedCartsTable).omit({ id: true, createdAt: true, updatedAt: true, recovered: true, recoveredAt: true });
export type InsertAbandonedCart = z.infer<typeof insertAbandonedCartSchema>;
export type AbandonedCart = typeof abandonedCartsTable.$inferSelect;
