import { Router } from "express";
import { db, siteSettingsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";
import { getOperationalSettings, invalidateOperationalSettings } from "../lib/operational-settings";
import { createTtlCache, setPublicReadCacheHeaders } from "../lib/response-cache";
import { requireOwner } from "../lib/admin-permissions";
import { logAdminActivity } from "./admin-activity";
import { resetPushConfiguration } from "../lib/push";
import { ensureManagement, rows as extractRows } from "../lib/management-db";

const router = Router();
const settingsCache = createTtlCache<Record<string, string>>(30_000);
const privateKey = /private|secret|password|token|api_key|vapid|smtp|owner_|admin_|reminder|worldwide|country_|currency_|exchange|global_store|supplier|source|notification|push_/i;
const secretKey = /private|secret|password|token|api_key|smtp_pass/i;
const ownerKey = /worldwide|shipping|delivery_|country|currency|exchange|global_store|owner_|security|emergency_shutdown|maintenance_mode|store_enabled|push_/i;

function invalidateSettings() {
  settingsCache.clear();
  invalidateOperationalSettings();
}

router.get("/settings", async (_req, res) => {
  const cached = settingsCache.get("all");
  if (cached) { setPublicReadCacheHeaders(res); res.json(cached); return; }

  const rows = await db.select().from(siteSettingsTable);
  const map: Record<string, string> = {};
  for (const row of rows) if (!privateKey.test(row.key)) map[row.key] = row.value;
  await ensureManagement();
  const shipping=extractRows(await db.execute(sql`SELECT data FROM imaginate_documents WHERE kind='shipping' AND status='published'
    AND data->>'countryCode'='AE' AND (publish_at IS NULL OR publish_at<=NOW()) AND (unpublish_at IS NULL OR unpublish_at>NOW()) ORDER BY updated_at ASC`));
  for(const row of shipping){
    const method=row.data.method||"standard";
    if(["standard","express","priority"].includes(method)&&Number.isFinite(Number(row.data.amount))&&Number(row.data.amount)>0)
      map[`delivery_${method}_price`]=String(row.data.amount);
  }

  settingsCache.set("all", map);
  setPublicReadCacheHeaders(res);
  map.online_payments_available=String(Boolean(process.env.ZIINA_ACCESS_TOKEN));
  res.json(map);
});

router.get("/admin/settings", requireAdmin, async (_req, res): Promise<void> => {
  const settings = await db.select().from(siteSettingsTable);
  res.setHeader("Cache-Control", "no-store");
  res.json(Object.fromEntries(settings.filter(row => !secretKey.test(row.key) && !/global_store|exchange_snapshot/i.test(row.key)).map(row => [row.key,row.value])));
});

router.use(["/settings/:key", "/settings/bulk"], (req, res, next) => {
  if (["GET","HEAD"].includes(req.method)) { next(); return; }
  const keys = req.method === "PUT" ? [String(req.params.key)] : Object.keys(req.body ?? {});
  if(req.method==="PUT"&&/worldwide/i.test(keys[0])&&req.body?.value==="true"){res.status(409).json({error:"Use Global Switch to control international availability."});return;}
  if (keys.some(key => secretKey.test(key))) { res.status(400).json({ error: "Credentials must be managed using secure configuration." }); return; }
  if (keys.some(key => /worldwide/i.test(key) && req.body?.[key] === "true")) {
    res.status(409).json({ error: "Use Global Switch to control international availability." }); return;
  }
  if (keys.some(key => ownerKey.test(key))) { void requireOwner(req, res, next); return; }
  next();
});

router.get("/settings/operational", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.json(await getOperationalSettings());
});

router.put("/settings/:key", requireAdmin, async (req, res) => {
  const key = String(req.params.key);
  if (/global_store|exchange_snapshot/i.test(key)) {
    res.status(409).json({error:"Use Global Switch for country and payment settings. Exchange rates are managed automatically."}); return;
  }
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
  if(key==="push_contact") resetPushConfiguration();
  await logAdminActivity(`Admin ${req.session?.userId}`, "Setting updated", key, "Configuration saved");
  const rows = await db.select().from(siteSettingsTable);
  const row = rows.find((r) => r.key === key);
  res.json(row && !secretKey.test(row.key) ? row : { key, value });
});

router.post("/settings/bulk", requireAdmin, async (req, res) => {
  const map = req.body as Record<string, string>;
  if (typeof map !== "object" || map === null || Array.isArray(map)) {
    res.status(400).json({ error: "Expected object" });
    return;
  }
  const entries = Object.entries(map);
  if (entries.some(([key])=>/global_store|exchange_snapshot/i.test(key))) {
    res.status(409).json({error:"Use Global Switch for country and payment settings. Exchange rates are managed automatically."}); return;
  }
  if (entries.length > 100 || entries.some(([k,v]) => k.length > 100 || typeof v !== "string" || v.length > 150_000)) {
    res.status(400).json({ error: "Settings must be text values within the supported size." }); return;
  }
  await Promise.all(entries.map(([k, v]) =>
    db.execute(
      sql`INSERT INTO site_settings (key, value, updated_at) VALUES (${k}, ${String(v)}, NOW())
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`
    )
  ));
  invalidateSettings();
  await logAdminActivity(`Admin ${req.session?.userId}`, "Website settings updated", undefined, entries.map(([key]) => key).join(", "));
  if(entries.some(([key])=>key==="push_contact"))resetPushConfiguration();
  const rows = await db.select().from(siteSettingsTable);
  const result: Record<string, string> = {};
  for (const row of rows) if (!secretKey.test(row.key)) result[row.key] = row.value;
  res.json(result);
});

export default router;
