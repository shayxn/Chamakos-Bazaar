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
  colors: text("colors"),
  isPreOrder: boolean("is_pre_order").notNull().default(false),
  preOrderLabel: text("pre_order_label"),
  preOrderDate: text("pre_order_date"),
  preOrderNote: text("pre_order_note"),
  supplierPrice: numeric("supplier_price", { precision: 10, scale: 2 }),
  importSource: text("import_source"),
  externalId: text("external_id"),
  sourceUrl: text("source_url"),
  videoUrl: text("video_url"),
  shipsToUaeVerified: boolean("ships_to_uae_verified").notNull().default(false),
  sellingFast: boolean("selling_fast").notNull().default(false),
  spotlight: boolean("spotlight").notNull().default(false),
  hidden: boolean("hidden").notNull().default(false),
  publishAt: timestamp("publish_at", { withTimezone: true }),
  unpublishAt: timestamp("unpublish_at", { withTimezone: true }),
  collection: text("collection"),
  bestSeller: boolean("best_seller").notNull().default(false),
  trending: boolean("trending").notNull().default(false),
  newArrival: boolean("new_arrival").notNull().default(false),
  limitedEdition: boolean("limited_edition").notNull().default(false),
  comingSoon: boolean("coming_soon").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
