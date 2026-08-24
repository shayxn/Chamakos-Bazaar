import { Router } from "express";
import { db } from "@workspace/db";
import { requireAdmin } from "../lib/auth-middleware";
import { sql, desc } from "drizzle-orm";
import { sendAdminActivityPush } from "../lib/push";

const router = Router();

let _actMigrated = false;
async function ensureActivityTable() {
  if (_actMigrated) return; _actMigrated = true;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS admin_activity_log (
      id SERIAL PRIMARY KEY,
      admin_name TEXT NOT NULL DEFAULT 'Admin',
      action TEXT NOT NULL,
      order_ref TEXT,
      details TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
ensureActivityTable().catch(console.error);

export async function logAdminActivity(adminName: string, action: string, orderRef?: string, details?: string) {
  try {
    await ensureActivityTable();
    const rows = await db.execute<any>(sql`
      INSERT INTO admin_activity_log (admin_name, action, order_ref, details)
      VALUES (${adminName}, ${action}, ${orderRef ?? null}, ${details ?? null})
      RETURNING id, admin_name, action, order_ref, details, created_at
    `);
    const [entry] = Array.isArray(rows) ? rows : (rows as any).rows ?? [];
    // Notify all admin SSE clients of new activity
    if (entry) broadcastActivity(entry);
    // Push to admin devices (non-SSE)
    sendAdminActivityPush(adminName, action, orderRef).catch(() => {});
  } catch {}
}

// SSE for real-time admin activity feed
const actSseClients = new Set<any>();
export function broadcastActivity(data: object) {
  const chunk = `data: ${JSON.stringify({ type: "ACTIVITY", ...data })}\n\n`;
  for (const client of [...actSseClients]) {
    try { client.write(chunk); client.flush?.(); } catch { actSseClients.delete(client); }
  }
}

router.get("/admin/activity-log/stream", requireAdmin, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  actSseClients.add(res);
  req.on("close", () => actSseClients.delete(res));
});

router.get("/admin/activity-log", requireAdmin, async (req, res) => {
  await ensureActivityTable();
  const limit = Math.min(Number(req.query.limit ?? 100), 500);
  const rows = await db.execute<{ id: number; admin_name: string; action: string; order_ref: string | null; details: string | null; created_at: string }>(
    sql`SELECT id, admin_name, action, order_ref, details, created_at FROM admin_activity_log ORDER BY created_at DESC LIMIT ${limit}`
  );
  const result = Array.isArray(rows) ? rows : (rows as any).rows ?? [];
  res.json(result);
});

export default router;
