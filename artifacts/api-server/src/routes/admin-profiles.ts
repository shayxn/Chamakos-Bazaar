import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";

const router = Router();
let schemaReady: Promise<void> | undefined;

function ensureAdminProfiles(): Promise<void> {
  if (!schemaReady) {
    schemaReady = db.execute(sql`
      CREATE TABLE IF NOT EXISTS admin_profiles (
        admin_id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        avatar_color TEXT NOT NULL DEFAULT '#ff6600',
        pfp_data TEXT,
        last_name_change TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE admin_profiles ADD COLUMN IF NOT EXISTS pfp_data TEXT;
    `).then(() => undefined).catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  }
  return schemaReady;
}

router.get("/admin/profile/:adminId", requireAdmin, async (req, res): Promise<void> => {
  await ensureAdminProfiles();
  const result = await db.execute<any>(
    sql`SELECT * FROM admin_profiles WHERE admin_id = ${String(req.params.adminId)} LIMIT 1`,
  );
  const rows = Array.isArray(result) ? result : (result as any).rows ?? [];
  res.json(rows[0] ?? null);
});

router.post("/admin/profile", requireAdmin, async (req, res): Promise<void> => {
  const { adminId, displayName, avatarColor } = req.body as Record<string, string>;
  if (!adminId || !displayName?.trim()) {
    res.status(400).json({ error: "adminId and displayName required" });
    return;
  }
  await ensureAdminProfiles();
  const result = await db.execute<any>(
    sql`SELECT last_name_change FROM admin_profiles WHERE admin_id = ${adminId}`,
  );
  const rows = Array.isArray(result) ? result : (result as any).rows ?? [];
  const existing = rows[0];
  if (existing?.last_name_change && (Date.now() - new Date(existing.last_name_change).getTime()) < 7 * 86_400_000) {
    const daysLeft = Math.ceil(7 - (Date.now() - new Date(existing.last_name_change).getTime()) / 86_400_000);
    res.status(429).json({ error: `You can change your name again in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.` });
    return;
  }
  await db.execute(sql`
    INSERT INTO admin_profiles (admin_id, display_name, avatar_color, last_name_change)
    VALUES (${adminId}, ${displayName.trim()}, ${avatarColor ?? "#ff6600"}, NOW())
    ON CONFLICT (admin_id) DO UPDATE SET display_name = EXCLUDED.display_name,
      avatar_color = COALESCE(EXCLUDED.avatar_color, admin_profiles.avatar_color),
      last_name_change = NOW()
  `);
  res.json({ ok: true });
});

router.post("/admin/profile/pfp", requireAdmin, async (req, res): Promise<void> => {
  const { adminId, pfpData } = req.body as Record<string, string>;
  if (!adminId || !pfpData) {
    res.status(400).json({ error: "adminId and pfpData required" });
    return;
  }
  if (pfpData.length > 800_000) {
    res.status(413).json({ error: "Image too large. Please use a smaller photo." });
    return;
  }
  await ensureAdminProfiles();
  await db.execute(sql`
    INSERT INTO admin_profiles (admin_id, display_name, pfp_data)
    VALUES (${adminId}, 'Admin', ${pfpData})
    ON CONFLICT (admin_id) DO UPDATE SET pfp_data = EXCLUDED.pfp_data
  `);
  res.json({ ok: true });
});

export default router;
