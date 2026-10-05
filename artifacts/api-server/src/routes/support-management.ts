import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db, customerAccountsTable } from "@workspace/db";
import { sql, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "../lib/auth-middleware";
import { ensureManagement, rows } from "../lib/management-db";
import { logAdminActivity } from "./admin-activity";
import { createAdminNotification } from "../lib/admin-notifications";

const router = Router();
function ownership(req: import("express").Request) {
  const session = req.session as Record<string, unknown>;
  if (!session.supportId) session.supportId = randomUUID();
  return { key: String(session.supportId), customerId: Number(session.customerId) || null };
}
const ticketInput = z.object({
  subject: z.string().trim().min(3).max(200), category: z.string().trim().min(1).max(100),
  message: z.string().trim().min(10).max(8000),
});
function ticket(row: Record<string, any>) {
  return { id: row.id, subject: row.subject, category: row.category, message: row.message, status: row.status, reply: row.reply, createdAt: row.created_at };
}
router.get("/support", async (req, res): Promise<void> => {
  await ensureManagement();
  const owner = ownership(req);
  res.json(rows(await db.execute(sql`SELECT * FROM imaginate_support WHERE owner_key=${owner.key}
    OR (${owner.customerId}::integer IS NOT NULL AND customer_id=${owner.customerId}) ORDER BY created_at DESC LIMIT 100`)).map(ticket));
});
router.post("/support", async (req, res): Promise<void> => {
  const parsed = ticketInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Provide a subject, category, and message of at least 10 characters." }); return; }
  await ensureManagement();
  const owner = ownership(req);
  const recent = rows(await db.execute(sql`SELECT COUNT(*)::integer AS count FROM imaginate_support WHERE owner_key=${owner.key} AND created_at > NOW() - INTERVAL '1 hour'`))[0];
  if (Number(recent?.count) >= 5) { res.status(429).json({ error: "Please wait before sending another request." }); return; }
  const b = parsed.data;
  const result = rows(await db.execute(sql`INSERT INTO imaginate_support(owner_key,customer_id,subject,category,message)
    VALUES (${owner.key},${owner.customerId},${b.subject},${b.category},${b.message}) RETURNING *`))[0];
  await createAdminNotification("New support request", b.subject, "support", "/admin/manage/support");
  res.status(201).json(ticket(result));
});
router.get("/admin/support", requireAdmin, async (_req, res): Promise<void> => {
  await ensureManagement();
  res.json(rows(await db.execute(sql`SELECT * FROM imaginate_support ORDER BY created_at DESC LIMIT 500`)).map(ticket));
});
router.patch("/admin/support/:id", requireAdmin, async (req, res): Promise<void> => {
  const parsed = z.object({ status: z.enum(["open", "in-progress", "resolved"]), reply: z.string().max(8000) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid support response." }); return; }
  await ensureManagement();
  const result = rows(await db.execute(sql`UPDATE imaginate_support SET status=${parsed.data.status},reply=${parsed.data.reply},updated_at=NOW()
    WHERE id=${Number(req.params.id)} RETURNING *`))[0];
  if (!result) { res.sendStatus(404); return; }
  await logAdminActivity(`Admin ${req.session?.userId}`, "Support request updated", `support:${result.id}`, parsed.data.status);
  res.json(ticket(result));
});
router.post("/newsletter", async (req, res): Promise<void> => {
  const parsed = z.object({ email: z.string().email().max(254), consent: z.literal(true) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "A valid email and your consent are required." }); return; }
  await ensureManagement();
  await db.execute(sql`INSERT INTO imaginate_newsletter(email) VALUES (${parsed.data.email.toLowerCase()})
    ON CONFLICT(email) DO UPDATE SET status='subscribed',consent_at=NOW()`);
  res.status(201).json({ ok: true });
});
router.get("/admin/newsletter", requireAdmin, async (_req, res): Promise<void> => {
  await ensureManagement();
  res.json(rows(await db.execute(sql`SELECT id,email,status,created_at AS "createdAt" FROM imaginate_newsletter ORDER BY created_at DESC LIMIT 1000`)));
});
router.patch("/admin/newsletter/:id", requireAdmin, async (req, res): Promise<void> => {
  const parsed = z.object({ status: z.enum(["subscribed", "unsubscribed"]) }).safeParse(req.body);
  if (!parsed.success) { res.sendStatus(400); return; }
  await ensureManagement();
  await db.execute(sql`UPDATE imaginate_newsletter SET status=${parsed.data.status} WHERE id=${Number(req.params.id)}`);
  res.json({ ok: true });
});
router.get("/admin/customers", requireAdmin, async (_req, res): Promise<void> => {
  const customers = await db.select({
    id: customerAccountsTable.id, name: customerAccountsTable.name, email: customerAccountsTable.email,
    phone: customerAccountsTable.phone, createdAt: customerAccountsTable.createdAt,
  }).from(customerAccountsTable).orderBy(desc(customerAccountsTable.createdAt)).limit(500);
  res.json(customers);
});
export default router;
