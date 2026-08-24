import { integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const ownerStudioPagesTable = pgTable("owner_studio_pages", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  pageType: text("page_type").notNull().default("store"),
  status: text("status").notNull().default("draft"),
  content: jsonb("content").notNull().default({ sections: [] }),
  publishedContent: jsonb("published_content"),
  permissions: jsonb("permissions").notNull().default({ mode: "owner", adminIds: [] }),
  version: integer("version").notNull().default(1),
  hidden: integer("hidden").notNull().default(0),
  createdBy: integer("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  publishedBy: integer("published_by").references(() => usersTable.id, { onDelete: "set null" }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("owner_studio_pages_type_slug_unique").on(table.pageType, table.slug),
]);

export const ownerStudioVersionsTable = pgTable("owner_studio_versions", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id").notNull().references(() => ownerStudioPagesTable.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  content: jsonb("content").notNull(),
  pageType: text("page_type").notNull(),
  status: text("status").notNull(),
  createdBy: integer("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("owner_studio_versions_page_version_unique").on(table.pageId, table.version),
]);

export type OwnerStudioPage = typeof ownerStudioPagesTable.$inferSelect;
export type OwnerStudioVersion = typeof ownerStudioVersionsTable.$inferSelect;