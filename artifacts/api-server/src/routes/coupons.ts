import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";

const router = Router();

function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const r = result as any;
  if (r && Array.isArray(r.rows)) return r.rows as T[];
  return [];
}

let _ready = false;
async function ensureTable() {
  if (_ready) return; _ready = true;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS coupons (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      description TEXT,
      discount_type TEXT NOT NULL DEFAULT 'percent',
      discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
      min_order_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
      usage_limit INTEGER,
      used_count INTEGER NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
ensureTable().catch(console.error);

// Public: validate a coupon
router.post("/coupons/validate", async (req, res) => {
  const { code, orderTotal } = req.body as { code: string; orderTotal: number };
  if (!code?.trim()) { res.status(400).json({ error: "Code is required" }); return; }

  const rows = extractRows<any>(
    await db.execute(sql`SELECT * FROM coupons WHERE UPPER(code) = UPPER(${code.trim()}) AND is_active = TRUE LIMIT 1`)
  );
  const coupon = rows[0];
  if (!coupon) { res.status(404).json({ error: "Invalid or inactive coupon code" }); return; }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    res.status(400).json({ error: "This coupon has expired" }); return;
  }
  if (coupon.usage_limit !== null && Number(coupon.used_count) >= Number(coupon.usage_limit)) {
    res.status(400).json({ error: "This coupon has reached its usage limit" }); return;
  }
  const minOrder = Number(coupon.min_order_amount ?? 0);
  if (minOrder > 0 && Number(orderTotal) < minOrder) {
    res.status(400).json({ error: `Minimum order of AED ${minOrder.toFixed(0)} required for this coupon` }); return;
  }

  const val = Number(coupon.discount_value);
  let discountAmount = 0;
  if (coupon.discount_type === "percent") {
    discountAmount = Math.round(Number(orderTotal) * val / 100 * 100) / 100;
  } else {
    discountAmount = Math.min(val, Number(orderTotal));
  }

  res.json({
    id: coupon.id, code: coupon.code,
    discountType: coupon.discount_type,
    discountValue: val, discountAmount,
    description: coupon.description,
  });
});

// Admin: list all coupons
router.get("/coupons", requireAdmin, async (_req, res) => {
  const rows = extractRows<any>(await db.execute(sql`SELECT * FROM coupons ORDER BY created_at DESC`));
  res.json(rows.map((c: any) => ({
    ...c,
    discountValue: Number(c.discount_value),
    minOrderAmount: Number(c.min_order_amount ?? 0),
    usedCount: Number(c.used_count),
    usageLimit: c.usage_limit != null ? Number(c.usage_limit) : null,
    isActive: c.is_active,
    createdAt: c.created_at,
    expiresAt: c.expires_at,
  })));
});

// Admin: create coupon
router.post("/coupons", requireAdmin, async (req, res) => {
  const { code, description, discountType, discountValue, minOrderAmount, usageLimit, expiresAt, isActive } = req.body as any;
  if (!code || discountValue === undefined) { res.status(400).json({ error: "code and discountValue required" }); return; }
  const rows = extractRows<any>(await db.execute(sql`
    INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, usage_limit, expires_at, is_active)
    VALUES (
      UPPER(${String(code).trim()}), ${description ?? null},
      ${discountType ?? "percent"}, ${Number(discountValue)},
      ${Number(minOrderAmount ?? 0)}, ${usageLimit != null ? Number(usageLimit) : null},
      ${expiresAt ? new Date(expiresAt) : null}, ${isActive !== false}
    )
    RETURNING *
  `));
  res.status(201).json(rows[0] ?? {});
});

// Admin: update coupon
router.patch("/coupons/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body as any;
  const rows = extractRows<any>(await db.execute(sql`
    UPDATE coupons SET
      code = CASE WHEN ${b.code != null} THEN UPPER(${b.code != null ? String(b.code).trim() : ""}) ELSE code END,
      description = CASE WHEN ${b.description !== undefined} THEN ${b.description ?? null} ELSE description END,
      discount_type = CASE WHEN ${b.discountType != null} THEN ${b.discountType} ELSE discount_type END,
      discount_value = CASE WHEN ${b.discountValue !== undefined} THEN ${Number(b.discountValue)} ELSE discount_value END,
      min_order_amount = CASE WHEN ${b.minOrderAmount !== undefined} THEN ${Number(b.minOrderAmount ?? 0)} ELSE min_order_amount END,
      usage_limit = CASE WHEN ${b.usageLimit !== undefined} THEN ${b.usageLimit != null ? Number(b.usageLimit) : null} ELSE usage_limit END,
      expires_at = CASE WHEN ${b.expiresAt !== undefined} THEN ${b.expiresAt ? new Date(b.expiresAt) : null} ELSE expires_at END,
      is_active = CASE WHEN ${b.isActive !== undefined} THEN ${Boolean(b.isActive)} ELSE is_active END
    WHERE id = ${id} RETURNING *
  `));
  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  res.json(rows[0]);
});

// Admin: delete coupon
router.delete("/coupons/:id", requireAdmin, async (req, res) => {
  await db.execute(sql`DELETE FROM coupons WHERE id = ${Number(req.params.id)}`);
  res.json({ ok: true });
});

// Internal helper: apply coupon to an order (increments used_count, returns discount)
export async function applyCoupon(code: string, orderTotal: number): Promise<{ discountAmount: number; couponCode: string } | null> {
  const rows = extractRows<any>(
    await db.execute(sql`SELECT * FROM coupons WHERE UPPER(code) = UPPER(${code.trim()}) AND is_active = TRUE LIMIT 1`)
  );
  const coupon = rows[0];
  if (!coupon) return null;

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return null;
  if (coupon.usage_limit !== null && Number(coupon.used_count) >= Number(coupon.usage_limit)) return null;
  if (Number(coupon.min_order_amount ?? 0) > 0 && orderTotal < Number(coupon.min_order_amount)) return null;

  const val = Number(coupon.discount_value);
  const discountAmount = coupon.discount_type === "percent"
    ? Math.round(orderTotal * val / 100 * 100) / 100
    : Math.min(val, orderTotal);

  // Consume atomically so concurrent checkouts cannot pass a finite usage limit.
  const consumed = extractRows<{ id: number }>(
    await db.execute(sql`
      UPDATE coupons
      SET used_count = used_count + 1
      WHERE id = ${coupon.id}
        AND (usage_limit IS NULL OR used_count < usage_limit)
      RETURNING id
    `),
  );
  if (!consumed[0]) return null;

  return { discountAmount, couponCode: coupon.code };
}

export default router;
