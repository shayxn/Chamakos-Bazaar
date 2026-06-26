import { Router } from "express";
import { db, customerAccountsTable, customerAddressesTable, ordersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import type { Request } from "express";

const router = Router();

declare module "express-session" {
  interface SessionData { customerId?: number; }
}

function getCustomerId(req: Request): number | null {
  const s = (req as any).session;
  return s?.customerId ?? null;
}

router.post("/customers/register", async (req, res) => {
  const { name, email, password, phone } = req.body as Record<string, string>;
  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email, and password are required" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }
  const existing = await db.select({ id: customerAccountsTable.id }).from(customerAccountsTable).where(eq(customerAccountsTable.email, email.toLowerCase()));
  if (existing.length > 0) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const [customer] = await db.insert(customerAccountsTable).values({
    name, email: email.toLowerCase(), passwordHash, phone: phone || null,
  }).returning({ id: customerAccountsTable.id, name: customerAccountsTable.name, email: customerAccountsTable.email, phone: customerAccountsTable.phone, createdAt: customerAccountsTable.createdAt });
  const s = (req as any).session;
  if (s) s.customerId = customer.id;
  res.status(201).json(customer);
});

router.post("/customers/login", async (req, res) => {
  const { email, password } = req.body as Record<string, string>;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }
  const [customer] = await db.select().from(customerAccountsTable).where(eq(customerAccountsTable.email, email.toLowerCase()));
  if (!customer) { res.status(401).json({ error: "Invalid email or password" }); return; }
  const ok = await bcrypt.compare(password, customer.passwordHash);
  if (!ok) { res.status(401).json({ error: "Invalid email or password" }); return; }
  const s = (req as any).session;
  if (s) s.customerId = customer.id;
  res.json({ id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, createdAt: customer.createdAt.toISOString() });
});

router.post("/customers/logout", async (req, res) => {
  const s = (req as any).session;
  if (s) delete s.customerId;
  res.json({ ok: true });
});

router.get("/customers/me", async (req, res) => {
  const customerId = getCustomerId(req);
  if (!customerId) { res.status(401).json({ error: "Not logged in" }); return; }
  const [customer] = await db.select({ id: customerAccountsTable.id, name: customerAccountsTable.name, email: customerAccountsTable.email, phone: customerAccountsTable.phone, createdAt: customerAccountsTable.createdAt })
    .from(customerAccountsTable).where(eq(customerAccountsTable.id, customerId));
  if (!customer) { res.status(401).json({ error: "Not found" }); return; }
  res.json({ ...customer, createdAt: customer.createdAt.toISOString() });
});

router.patch("/customers/me", async (req, res) => {
  const customerId = getCustomerId(req);
  if (!customerId) { res.status(401).json({ error: "Not logged in" }); return; }
  const { name, phone } = req.body as { name?: string; phone?: string };
  const [customer] = await db.update(customerAccountsTable)
    .set({ name: name ?? undefined, phone: phone ?? undefined })
    .where(eq(customerAccountsTable.id, customerId))
    .returning({ id: customerAccountsTable.id, name: customerAccountsTable.name, email: customerAccountsTable.email, phone: customerAccountsTable.phone, createdAt: customerAccountsTable.createdAt });
  res.json({ ...customer, createdAt: customer.createdAt.toISOString() });
});

router.post("/customers/change-password", async (req, res) => {
  const customerId = getCustomerId(req);
  if (!customerId) { res.status(401).json({ error: "Not logged in" }); return; }
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  if (!currentPassword || !newPassword) { res.status(400).json({ error: "Both passwords required" }); return; }
  if (newPassword.length < 6) { res.status(400).json({ error: "New password must be at least 6 characters" }); return; }
  const [customer] = await db.select().from(customerAccountsTable).where(eq(customerAccountsTable.id, customerId));
  if (!customer) { res.status(404).json({ error: "Not found" }); return; }
  const ok = await bcrypt.compare(currentPassword, customer.passwordHash);
  if (!ok) { res.status(401).json({ error: "Current password is incorrect" }); return; }
  const newHash = await bcrypt.hash(newPassword, 12);
  await db.update(customerAccountsTable).set({ passwordHash: newHash }).where(eq(customerAccountsTable.id, customerId));
  res.json({ ok: true });
});

router.get("/customers/orders", async (req, res) => {
  const customerId = getCustomerId(req);
  if (!customerId) { res.status(401).json({ error: "Not logged in" }); return; }
  const [customer] = await db.select({ email: customerAccountsTable.email }).from(customerAccountsTable).where(eq(customerAccountsTable.id, customerId));
  if (!customer) { res.status(401).json({ error: "Not found" }); return; }
  const orders = await db.select().from(ordersTable)
    .where(eq(ordersTable.customerEmail, customer.email))
    .orderBy(desc(ordersTable.createdAt));
  res.json(orders.map(o => ({ ...o, total: Number(o.total), createdAt: o.createdAt.toISOString() })));
});

router.get("/customers/addresses", async (req, res) => {
  const customerId = getCustomerId(req);
  if (!customerId) { res.status(401).json({ error: "Not logged in" }); return; }
  const addresses = await db.select().from(customerAddressesTable).where(eq(customerAddressesTable.customerId, customerId)).orderBy(desc(customerAddressesTable.isDefault));
  res.json(addresses);
});

router.post("/customers/addresses", async (req, res) => {
  const customerId = getCustomerId(req);
  if (!customerId) { res.status(401).json({ error: "Not logged in" }); return; }
  const { label, address, isDefault } = req.body as { label?: string; address: string; isDefault?: boolean };
  if (!address) { res.status(400).json({ error: "Address is required" }); return; }
  if (isDefault) {
    await db.update(customerAddressesTable).set({ isDefault: false }).where(eq(customerAddressesTable.customerId, customerId));
  }
  const [row] = await db.insert(customerAddressesTable).values({
    customerId, label: label || "Home", address, isDefault: isDefault ?? false,
  }).returning();
  res.status(201).json(row);
});

router.delete("/customers/addresses/:id", async (req, res) => {
  const customerId = getCustomerId(req);
  if (!customerId) { res.status(401).json({ error: "Not logged in" }); return; }
  await db.delete(customerAddressesTable)
    .where(eq(customerAddressesTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

export default router;
