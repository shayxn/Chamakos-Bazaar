import { Router } from "express";
import { db, siteSettingsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";
import { createTtlCache, setPublicReadCacheHeaders } from "../lib/response-cache";

const router = Router();
const settingsCache = createTtlCache<Record<string, string>>(30_000);

function invalidateSettings() {
  settingsCache.clear();
}

router.get("/settings", async (_req, res) => {
  const cached = settingsCache.get("all");
  if (cached) { setPublicReadCacheHeaders(res); res.json(cached); return; }

  const rows = await db.select().from(siteSettingsTable);
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;

  settingsCache.set("all", map);
  setPublicReadCacheHeaders(res);
  res.json(map);
});

router.put("/settings/:key", requireAdmin, async (req, res) => {
  const key = String(req.params.key);
  const { value } = req.body as { value: string };
  if (typeof value !== "string") {
    res.status(400).json({ error: "value must be a string" });
    return;
  }
  await db.execute(
    sql`INSERT INTO site_settings (key, value, updated_at) VALUES (${key}, ${value}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`
  );
  invalidateSettings();
  const rows = await db.select().from(siteSettingsTable);
  const row = rows.find((r) => r.key === key);
  res.json(row ?? { key, value });
});

router.post("/settings/bulk", requireAdmin, async (req, res) => {
  const map = req.body as Record<string, string>;
  if (typeof map !== "object" || Array.isArray(map)) {
    res.status(400).json({ error: "Expected object" });
    return;
  }
  const entries = Object.entries(map);
  await Promise.all(entries.map(([k, v]) =>
    db.execute(
      sql`INSERT INTO site_settings (key, value, updated_at) VALUES (${k}, ${String(v)}, NOW())
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`
    )
  ));
  invalidateSettings();
  const rows = await db.select().from(siteSettingsTable);
  const result: Record<string, string> = {};
  for (const row of rows) result[row.key] = row.value;
  res.json(result);
});

export default router;
