import { index, integer, numeric, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { productsTable } from "./products";

export const productImportQueueTable = pgTable("product_import_queue", {
  id: serial("id").primaryKey(),
  importer: text("importer").notNull(),
  externalId: text("external_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  sourcePrice: numeric("source_price", { precision: 10, scale: 2 }).notNull(),
  profit: numeric("profit", { precision: 10, scale: 2 }).notNull().default("25"),
  imageUrl: text("image_url"),
  imageUrls: text("image_urls"),
  sourceUrl: text("source_url"),
  categoryName: text("category_name"),
  stock: integer("stock").notNull().default(0),
  sizes: text("sizes"),
  colors: text("colors"),
  status: text("status").notNull().default("staged"),
  productId: integer("product_id").references(() => productsTable.id, { onDelete: "set null" }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("product_import_queue_importer_external_id_unique").on(table.importer, table.externalId),
  index("product_import_queue_importer_status_idx").on(table.importer, table.status),
]);