import { pgTable, serial, text, boolean, numeric, integer, timestamp } from "drizzle-orm/pg-core";

export const gamesTable = pgTable("games", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  coverImage: text("cover_image"),
  videoUrl: text("video_url"),
  musicUrl: text("music_url"),
  trailerUrl: text("trailer_url"),
  platform: text("platform"),
  genre: text("genre"),
  isPreOrder: boolean("is_pre_order").notNull().default(true),
  preOrderDate: text("pre_order_date"),
  preOrderPrice: numeric("pre_order_price", { precision: 10, scale: 2 }),
  preOrderNote: text("pre_order_note"),
  preOrderButtonText: text("pre_order_button_text"),
  isActive: boolean("is_active").notNull().default(true),
  animationEnabled: boolean("animation_enabled").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Game = typeof gamesTable.$inferSelect;
export type InsertGame = typeof gamesTable.$inferInsert;
