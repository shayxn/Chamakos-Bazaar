import { Router } from "express";
import { db, customerAccountsTable, customerAddressesTable, ordersTable, orderItemsTable, siteSettingsTable } from "@workspace/db";
import { eq, desc, or, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import type { Request } from "express";
import { sendActivityPush, initPush } from "../lib/push";
import { sendVerificationEmail } from "../lib/email";

/* ─── In-memory email verification store ───────────────────────────────── */
interface VerifEntry {
  code: string;
  passwordHash: string;
  name: string;
  email: string;
  phone?: string;
  expiresAt: number;   // ms timestamp
  attempts: number;
  lockedUntil?: number; // ms timestamp — set after 10 bad attempts
}
const verifications = new Map<string, VerifEntry>();
// Clean expired entries every 15 min
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of verifications) {
    if (v.expiresAt < now && (!v.lockedUntil || v.lockedUntil < now)) verifications.delete(k);
  }
}, 15 * 60 * 1000);

const router = Router();


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

  // Push notification for new account (async, don't block response)
  (async () => {
    try {
      const setting = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, "notif_new_accounts"));
      if (setting.length > 0 && setting[0].value === "true") {
        await initPush();
        await sendActivityPush("NEW_ACCOUNT", { email: customer.email });
      }
    } catch {}
  })();

  res.status(201).json(customer);
});

/* ─── Step 1: send verification code ───────────────────────────────────── */
router.post("/customers/send-verification", async (req, res) => {
  const { name, email, password, phone } = req.body as Record<string, string>;
  if (!name || !email || !password) { res.status(400).json({ error: "Name, email, and password are required" }); return; }
  if (password.length < 6) { res.status(400).json({ error: "Password must be at least 6 characters" }); return; }

  const normalEmail = email.toLowerCase();

  // Existing account?
  const exists = await db.select({ id: customerAccountsTable.id }).from(customerAccountsTable).where(eq(customerAccountsTable.email, normalEmail));
  if (exists.length > 0) { res.status(409).json({ error: "An account with this email already exists" }); return; }

  // Locked out?
  const existing = verifications.get(normalEmail);
  if (existing?.lockedUntil && existing.lockedUntil > Date.now()) {
    const secs = Math.ceil((existing.lockedUntil - Date.now()) / 1000);
    const mins = Math.ceil(secs / 60);
    res.status(429).json({ error: `Too many attempts. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.` }); return;
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const passwordHash = await bcrypt.hash(password, 12);

  verifications.set(normalEmail, {
    code, passwordHash, name, email: normalEmail, phone: phone || undefined,
    expiresAt: Date.now() + 10 * 60 * 1000,
    attempts: 0,
  });

  const emailSent = await sendVerificationEmail(email, code);
  const isDev = process.env.NODE_ENV !== "production";

  res.json({
    ok: true,
    emailSent,
    // Only expose code in dev when SMTP isn't configured (for testing)
    ...(isDev && !emailSent ? { devCode: code } : {}),
  });
});

/* ─── Step 2: verify code & create account ──────────────────────────────── */
router.post("/customers/verify-registration", async (req, res) => {
  const { email, code } = req.body as Record<string, string>;
  if (!email || !code) { res.status(400).json({ error: "Email and code are required" }); return; }

  const normalEmail = email.toLowerCase();
  const entry = verifications.get(normalEmail);

  if (!entry) {
    res.status(400).json({ error: "No verification pending for this email. Please request a new code.", expired: true }); return;
  }
  if (entry.lockedUntil && entry.lockedUntil > Date.now()) {
    const secs = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
    const mins = Math.ceil(secs / 60);
    res.status(429).json({ error: `Too many attempts. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.`, locked: true, lockedUntil: entry.lockedUntil }); return;
  }
  if (entry.expiresAt < Date.now()) {
    verifications.delete(normalEmail);
    res.status(400).json({ error: "Code has expired. Please request a new one.", expired: true }); return;
  }
  if (entry.code !== code.trim()) {
    entry.attempts++;
    if (entry.attempts >= 10) {
      entry.lockedUntil = Date.now() + 5 * 60 * 1000;
      res.status(429).json({ error: "Too many incorrect attempts. Try again in 5 minutes.", locked: true, lockedUntil: entry.lockedUntil, attemptsLeft: 0 }); return;
    }
    const left = 10 - entry.attempts;
    res.status(400).json({ error: `Incorrect code. ${left} attempt${left !== 1 ? "s" : ""} remaining.`, attemptsLeft: left }); return;
  }

  // ✓ Code correct — create account
  const [customer] = await db.insert(customerAccountsTable).values({
    name: entry.name, email: normalEmail, passwordHash: entry.passwordHash, phone: entry.phone || null,
  }).returning({ id: customerAccountsTable.id, name: customerAccountsTable.name, email: customerAccountsTable.email, phone: customerAccountsTable.phone, createdAt: customerAccountsTable.createdAt });

  verifications.delete(normalEmail);
  const s = (req as any).session;
  if (s) s.customerId = customer.id;

  (async () => {
    try {
      const setting = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, "notif_new_accounts"));
      if (setting.length > 0 && setting[0].value === "true") { await initPush(); await sendActivityPush("NEW_ACCOUNT", { email: customer.email }); }
    } catch {}
  })();

  res.status(201).json({ ...customer, createdAt: customer.createdAt.toISOString() });
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
  const [customer] = await db.select({ email: customerAccountsTable.email, phone: customerAccountsTable.phone })
    .from(customerAccountsTable).where(eq(customerAccountsTable.id, customerId));
  if (!customer) { res.status(401).json({ error: "Not found" }); return; }

  // Match orders by email OR phone — checkout only collects phone, not email
  const conditions = [eq(ordersTable.customerEmail, customer.email)];
  if (customer.phone) conditions.push(eq(ordersTable.customerPhone, customer.phone));
  const orders = await db.select().from(ordersTable)
    .where(or(...conditions))
    .orderBy(desc(ordersTable.createdAt));

  // Fetch all items for these orders in one query
  const orderIds = orders.map(o => o.id);
  const allItems = orderIds.length > 0
    ? await db.select({
        orderId: orderItemsTable.orderId,
        productName: orderItemsTable.productName,
        quantity: orderItemsTable.quantity,
        price: orderItemsTable.price,
        size: orderItemsTable.size,
      }).from(orderItemsTable).where(inArray(orderItemsTable.orderId, orderIds))
    : [];

  res.json(orders.map(o => ({
    ...o,
    total: Number(o.total),
    createdAt: o.createdAt.toISOString(),
    items: allItems
      .filter(i => i.orderId === o.id)
      .map(i => ({ ...i, price: Number(i.price) })),
  })));
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
