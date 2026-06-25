import { pgTable, serial, text, numeric, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
  imageUrls: text("image_urls"),
  stock: integer("stock").notNull().default(0),
  categoryId: integer("category_id"),
  featured: boolean("featured").notNull().default(false),
  rep: boolean("rep").notNull().default(false),
  sizes: text("sizes"),
  isPreOrder: boolean("is_pre_order").notNull().default(false),
  preOrderLabel: text("pre_order_label"),
  preOrderDate: text("pre_order_date"),
  preOrderNote: text("pre_order_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
