import { pgTable, serial, text, boolean, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("custom"),

  // Banner
  bannerText: text("banner_text"),
  bannerSubtext: text("banner_subtext"),
  bannerColor: text("banner_color").default("#ff6600"),
  textColor: text("text_color").default("#ffffff"),
  accentColor: text("accent_color").default("#ffffff"),

  // Extended visuals
  logoUrl: text("logo_url"),
  backgroundImageUrl: text("background_image_url"),
  badgeText: text("badge_text"),

  // Countdown & timing
  countdownEnabled: boolean("countdown_enabled").notNull().default(false),
  startAt: timestamp("start_at", { withTimezone: true }),
  endAt: timestamp("end_at", { withTimezone: true }),

  // Homepage takeover
  homepageEnabled: boolean("homepage_enabled").notNull().default(false),
  homepageTitle: text("homepage_title"),
  homepageSubtitle: text("homepage_subtitle"),
  ctaText: text("cta_text"),
  ctaUrl: text("cta_url"),

  // Popup
  popupEnabled: boolean("popup_enabled").notNull().default(false),
  popupText: text("popup_text"),
  popupImageUrl: text("popup_image_url"),

  // Discount
  discountPercent: text("discount_percent"),

  // Priority (lower = higher priority)
  priority: integer("priority").notNull().default(0),

  // Flexible extra config (featuredProductIds, featuredCategoryIds, etc.)
  config: jsonb("config"),

  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
