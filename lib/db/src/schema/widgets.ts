import { pgTable, serial, text, boolean, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export const widgets = pgTable("widgets", {
  id: serial("id").primaryKey(),
  /** 'image' | 'custom' */
  type: text("type").notNull().default("custom"),
  title: text("title"),
  subtitle: text("subtitle"),
  imageUrl: text("image_url"),
  icon: text("icon"),
  buttonLabel: text("button_label"),
  buttonUrl: text("button_url"),
  /** 'home' | 'shop' | 'account' | 'order' */
  placement: text("placement").notNull().default("home"),
  displayOrder: integer("display_order").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(false),
  /** 'everyone' | 'signed_in' | 'guests' */
  targeting: text("targeting").notNull().default("everyone"),
  // Custom widget style options
  background: text("background"),
  accent: text("accent"),
  /** 'none' | 'light' | 'medium' | 'heavy' */
  glassAmount: text("glass_amount"),
  /** 'stack' | 'row' | 'centered' */
  layout: text("layout"),
  /** 'sm' | 'md' | 'lg' | 'full' */
  size: text("size"),
  borderRadius: integer("border_radius"),
  /** 'fade' | 'slide' | 'scale' | 'none' */
  animation: text("animation"),
  config: jsonb("config"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
