import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tiktokVideosTable = pgTable("tiktok_videos", {
  id: serial("id").primaryKey(),
  title: text("title"),
  embedUrl: text("embed_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  displayOrder: integer("display_order").notNull().default(0),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTiktokVideoSchema = createInsertSchema(tiktokVideosTable).omit({ id: true, createdAt: true });
export type InsertTiktokVideo = z.infer<typeof insertTiktokVideoSchema>;
export type TiktokVideo = typeof tiktokVideosTable.$inferSelect;
