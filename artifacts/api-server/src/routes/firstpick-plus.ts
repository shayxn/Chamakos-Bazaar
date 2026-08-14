import { Router } from "express";
import { db, siteSettingsTable } from "@workspace/db";
import { inArray, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";

const router = Router();

function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const r = result as any;
  if (r && Array.isArray(r.rows)) return r.rows as T[];
  return [];
}

async function ensureTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS firstpick_plus_memberships (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER,
      customer_name TEXT NOT NULL DEFAULT '',
      customer_email TEXT,
      customer_phone TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      activated_at TIMESTAMPTZ,
      cancelled_at TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

// ── Settings (public read, admin write) ──────────────────────────────────────

const FP_SETTING_KEYS = [
  "fp_plus_price",
  "fp_plus_launched",
  "fp_plus_free_delivery",
  "fp_plus_order_discount",
  "fp_plus_exclusive_deals",
  "fp_plus_early_access",
] as const;

const FP_SETTING_DEFAULTS: Record<string, string> = {
  fp_plus_price: "30",
  fp_plus_launched: "false",
  fp_plus_free_delivery: "true",
  fp_plus_order_discount: "5",
  fp_plus_exclusive_deals: "true",
  fp_plus_early_access: "true",
};

router.get("/firstpick-plus/settings", async (_req, res) => {
  try {
    await ensureTable();
    const rows = await db
      .select()
      .from(siteSettingsTable)
      .where(inArray(siteSettingsTable.key, [...FP_SETTING_KEYS]));
    const map: Record<string, string> = { ...FP_SETTING_DEFAULTS };
    for (const row of rows) map[row.key] = row.value;
    res.json(map);
  } catch {
    res.json({ ...FP_SETTING_DEFAULTS });
  }
});

router.put("/firstpick-plus/settings", requireAdmin, async (req, res) => {
  try {
    const body = req.body as Record<string, string>;
    const allowed = [...FP_SETTING_KEYS];
    for (const key of allowed) {
      if (body[key] !== undefined) {
        await db.execute(sql`
          INSERT INTO site_settings (key, value, updated_at)
          VALUES (${key}, ${String(body[key])}, NOW())
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `);
      }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("[FP+] settings update:", err);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// ── Admin: manage members ────────────────────────────────────────────────────

router.get("/firstpick-plus/members", requireAdmin, async (_req, res) => {
  try {
    await ensureTable();
    const result = await db.execute(
      sql`SELECT * FROM firstpick_plus_memberships ORDER BY created_at DESC`
    );
    res.json(extractRows(result));
  } catch (err) {
    console.error("[FP+] list members:", err);
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

// Admin: manually add a member
router.post("/firstpick-plus/members", requireAdmin, async (req, res) => {
  try {
    await ensureTable();
    const { customer_name, customer_email, customer_phone, notes } = req.body as Record<string, string>;
    if (!customer_name) { res.status(400).json({ error: "customer_name required" }); return; }
    const result = await db.execute(sql`
      INSERT INTO firstpick_plus_memberships (customer_name, customer_email, customer_phone, notes, status)
      VALUES (${customer_name}, ${customer_email ?? null}, ${customer_phone ?? null}, ${notes ?? null}, 'pending')
      RETURNING *
    `);
    const rows = extractRows(result);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("[FP+] add member:", err);
    res.status(500).json({ error: "Failed to add member" });
  }
});

router.post("/firstpick-plus/members/:id/activate", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await ensureTable();
    await db.execute(sql`
      UPDATE firstpick_plus_memberships
      SET status = 'active', activated_at = NOW(), updated_at = NOW()
      WHERE id = ${id}
    `);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to activate" });
  }
});

router.post("/firstpick-plus/members/:id/deactivate", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await ensureTable();
    await db.execute(sql`
      UPDATE firstpick_plus_memberships
      SET status = 'inactive', cancelled_at = NOW(), updated_at = NOW()
      WHERE id = ${id}
    `);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to deactivate" });
  }
});

router.delete("/firstpick-plus/members/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await db.execute(sql`DELETE FROM firstpick_plus_memberships WHERE id = ${id}`);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete" });
  }
});

router.patch("/firstpick-plus/members/:id/notes", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { notes } = req.body as { notes: string };
  try {
    await db.execute(sql`
      UPDATE firstpick_plus_memberships SET notes = ${notes ?? null}, updated_at = NOW() WHERE id = ${id}
    `);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to update notes" });
  }
});

// ── Customer: check own membership status ────────────────────────────────────

router.get("/firstpick-plus/my-status", async (req, res) => {
  const customerId = (req as any).session?.customerId as number | undefined;
  if (!customerId) { res.json({ status: null, membership: null }); return; }
  try {
    await ensureTable();
    const result = await db.execute(
      sql`SELECT id, status, activated_at FROM firstpick_plus_memberships
          WHERE customer_id = ${customerId} LIMIT 1`
    );
    const rows = extractRows<{ id: number; status: string; activated_at: string | null }>(result);
    const membership = rows[0] ?? null;
    res.json({ status: membership?.status ?? null, membership });
  } catch {
    res.json({ status: null, membership: null });
  }
});

export default router;
