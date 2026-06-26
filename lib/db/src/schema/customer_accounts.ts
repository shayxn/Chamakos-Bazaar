import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const customerAccountsTable = pgTable("customer_accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customerAddressesTable = pgTable("customer_addresses", {
  id: serial("id").primaryKey(),
  customerId: serial("customer_id").notNull(),
  label: text("label").notNull().default("Home"),
  address: text("address").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCustomerSchema = createInsertSchema(customerAccountsTable).omit({ id: true, createdAt: true, passwordHash: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customerAccountsTable.$inferSelect;
export type CustomerAddress = typeof customerAddressesTable.$inferSelect;
