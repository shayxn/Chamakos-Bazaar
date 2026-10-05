import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "../lib/auth-middleware";
import { requireOwner, adminAccess } from "../lib/admin-permissions";
import { ensureManagement, rows } from "../lib/management-db";
import { getReminderConfig, REMINDER_CATEGORIES } from "../lib/admin-notifications";
import { logAdminActivity } from "./admin-activity";

const router = Router();
router.get("/admin/reminders", requireAdmin, async (_req, res): Promise<void> => { res.json(await getReminderConfig()); });
router.patch("/admin/reminders", requireAdmin, requireOwner, async (req, res): Promise<void> => {
  const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
  const parsed = z.object({
    enabled: z.boolean(), times: z.array(time).max(5), days: z.array(z.number().int().min(0).max(6)).max(7),
    timezone: z.string().max(100), quietStart: time, quietEnd: time, dailyLimit: z.number().int().min(0).max(5),
    intensity: z.enum(["professional","mixed","funny"]), categories: z.array(z.string()).max(19),
  }).safeParse(req.body);
  if (!parsed.success || parsed.data.categories.some(c => !REMINDER_CATEGORIES.includes(c))) { res.status(400).json({ error: "Check reminder times, days, categories, and daily limit (0–5)." }); return; }
  try { new Intl.DateTimeFormat("en", { timeZone: parsed.data.timezone }); }
  catch { res.status(400).json({ error: "Invalid business time zone." }); return; }
  await db.execute(sql`INSERT INTO site_settings(key,value) VALUES('imaginate_reminders',${JSON.stringify(parsed.data)})
    ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`);
  await logAdminActivity(`Admin ${req.session?.userId}`, "Work reminder preferences updated");
  res.json(await getReminderConfig());
});
router.get("/admin/notification-center", requireAdmin, async (req, res): Promise<void> => {
  await ensureManagement();
  const id = Number(req.session?.userId);
  const access = await adminAccess(id);
  const category = String(req.query.category ?? "all");
  const result = rows(await db.execute(sql`SELECT n.id,n.title,n.body,n.category,n.url,n.created_at AS "createdAt",
    (r.user_id IS NOT NULL) AS read FROM imaginate_notifications n
    LEFT JOIN imaginate_notification_reads r ON r.notification_id=n.id AND r.user_id=${id}
    WHERE (${access.isOwner} OR NOT n.owner_only)
      AND (${category}='all' OR n.category=${category})
    ORDER BY CASE n.category WHEN 'security' THEN 1 WHEN 'important' THEN 2 WHEN 'orders' THEN 3
      WHEN 'support' THEN 4 WHEN 'inventory' THEN 5 WHEN 'activity' THEN 6 WHEN 'launch' THEN 7 ELSE 8 END, n.created_at DESC LIMIT 250`));
  res.json(result);
});
router.patch("/admin/notification-center/read", requireAdmin, async (req, res): Promise<void> => {
  await ensureManagement();
  const parsed = z.union([z.object({ all: z.literal(true) }), z.object({ ids: z.array(z.number().int().positive()).max(250) })]).safeParse(req.body);
  if (!parsed.success) { res.sendStatus(400); return; }
  const id = Number(req.session?.userId);
  const access = await adminAccess(id);
  if ("all" in parsed.data) {
    await db.execute(sql`INSERT INTO imaginate_notification_reads(notification_id,user_id)
      SELECT id,${id} FROM imaginate_notifications WHERE (${access.isOwner} OR NOT owner_only) ON CONFLICT DO NOTHING`);
  } else {
    for (const notificationId of parsed.data.ids) await db.execute(sql`INSERT INTO imaginate_notification_reads(notification_id,user_id)
      SELECT id,${id} FROM imaginate_notifications WHERE id=${notificationId} AND (${access.isOwner} OR NOT owner_only) ON CONFLICT DO NOTHING`);
  }
  res.json({ ok: true });
});
export default router;
