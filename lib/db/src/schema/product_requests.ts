import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productRequestsTable = pgTable("product_requests", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  productName: text("product_name").notNull(),
  description: text("description"),
  referenceUrl: text("reference_url"),
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProductRequestSchema = createInsertSchema(productRequestsTable).omit({ id: true, createdAt: true, status: true, adminNote: true });
export type InsertProductRequest = z.infer<typeof insertProductRequestSchema>;
export type ProductRequest = typeof productRequestsTable.$inferSelect;
