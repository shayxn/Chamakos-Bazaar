import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";
import { z } from "zod";
import { ensureDiscounts, validateDiscount, type DiscountContext } from "../lib/discount-validation";
import { logAdminActivity } from "./admin-activity";
import { logger } from "../lib/logger";

const router = Router();

function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const r = result as any;
  if (r && Array.isArray(r.rows)) return r.rows as T[];
  return [];
}

let _ready = false;
async function ensureTable() {
  if (_ready) return;
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
  await ensureDiscounts();
  _ready = true;
}
ensureTable().catch(error => logger.error({ error }, "Discount table unavailable"));

const discountInput = z.object({
  code: z.string().trim().min(1).max(80), description: z.string().max(500).nullable().optional(),
  discountType: z.enum(["percent","fixed"]), discountValue: z.number().finite().nonnegative(),
  minOrderAmount: z.number().finite().nonnegative().default(0), usageLimit: z.number().int().positive().nullable().optional(),
  perCustomerLimit: z.number().int().positive().nullable().optional(),
  startsAt: z.string().datetime({offset:true}).nullable().optional(), expiresAt: z.string().datetime({offset:true}).nullable().optional(),
  isActive: z.boolean().default(true), eligibleProducts: z.array(z.number().int().positive()).default([]),
  eligibleCollections: z.array(z.string().max(100)).default([]), eligibleCountries: z.array(z.string().length(2)).default([]),
}).refine(b => b.discountType !== "percent" || b.discountValue <= 100, { message:"Percentage must not exceed 100." })
  .refine(b => !b.startsAt || !b.expiresAt || new Date(b.expiresAt) > new Date(b.startsAt), { message:"End must be after start." });

// Public: validate a coupon
router.post("/coupons/validate", async (req, res) => {
  await ensureTable();
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  if (!code) { res.status(400).json({ error: "Code is required" }); return; }
  const session = req.session as Record<string, unknown>;
  const items = extractRows<any>(await db.execute(sql`SELECT p.id AS "productId",p.price,p.variants,c.variant_id AS "variantId",c.quantity,p.collection FROM cart_items c JOIN products p ON p.id=c.product_id WHERE c.session_id=${String(session.cartId ?? "")}`))
    .map(i => ({ ...i,price:Number(i.variants?.find((v:any)=>v.id===i.variantId)?.price ?? i.price),quantity:Number(i.quantity) }));
  try {
    res.json(await validateDiscount(code, { items, customerKey: session.customerId ? `customer:${session.customerId}` :
      req.body.customerPhone?`phone:${String(req.body.customerPhone).replace(/\D/g,"")}`:`session:${session.cartId}`, country:"AE" }));
  } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Discount code unavailable." }); }
});

// Admin: list all coupons
router.get("/coupons", requireAdmin, async (_req, res) => {
  await ensureTable();
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
    startsAt: c.starts_at, perCustomerLimit: c.per_customer_limit,
    eligibleProducts: c.eligible_products, eligibleCollections: c.eligible_collections, eligibleCountries: c.eligible_countries,
  })));
});

// Admin: create coupon
router.post("/coupons", requireAdmin, async (req, res) => {
  await ensureTable();
  const parsed = discountInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Check discount value, code, restrictions, and dates." }); return; }
  const { code, description, discountType, discountValue, minOrderAmount, usageLimit, expiresAt, isActive, startsAt,perCustomerLimit,eligibleProducts,eligibleCollections,eligibleCountries } = parsed.data;
  const existing = extractRows(await db.execute(sql`SELECT id FROM coupons WHERE code=UPPER(${code})`));
  if (existing.length) { res.status(409).json({ error: "This discount code already exists." }); return; }
  const rows = extractRows<any>(await db.execute(sql`
    INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, usage_limit, expires_at, is_active,starts_at,per_customer_limit,eligible_products,eligible_collections,eligible_countries)
    VALUES (
      UPPER(${String(code).trim()}), ${description ?? null},
      ${discountType ?? "percent"}, ${Number(discountValue)},
      ${Number(minOrderAmount ?? 0)}, ${usageLimit != null ? Number(usageLimit) : null},
      ${expiresAt ? new Date(expiresAt) : null}, ${isActive !== false},
      ${startsAt ?? null},${perCustomerLimit ?? null},${JSON.stringify(eligibleProducts)}::jsonb,
      ${JSON.stringify(eligibleCollections)}::jsonb,${JSON.stringify(eligibleCountries.map(c=>c.toUpperCase()))}::jsonb
    )
    RETURNING *
  `));
  await logAdminActivity(`Admin ${req.session?.userId}`, "Discount code created", code);
  res.status(201).json(rows[0] ?? {});
});

// Admin: update coupon
router.patch("/coupons/:id", requireAdmin, async (req, res) => {
  await ensureTable();
  const id = Number(req.params.id);
  if (Object.keys(req.body ?? {}).length === 1 && typeof req.body.isActive === "boolean") {
    const result = extractRows(await db.execute(sql`UPDATE coupons SET is_active=${req.body.isActive} WHERE id=${id} RETURNING *`));
    if (!result[0]) { res.sendStatus(404); return; }
    await logAdminActivity(`Admin ${req.session?.userId}`, "Discount code active state changed", String(id));
    res.json(result[0]); return;
  }
  const parsed = discountInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Check discount value, code, restrictions, and dates." }); return; }
  const b = parsed.data;
  const rows = extractRows<any>(await db.execute(sql`
    UPDATE coupons SET
      code = CASE WHEN ${b.code != null} THEN UPPER(${b.code != null ? String(b.code).trim() : ""}) ELSE code END,
      description = CASE WHEN ${b.description !== undefined} THEN ${b.description ?? null} ELSE description END,
      discount_type = CASE WHEN ${b.discountType != null} THEN ${b.discountType} ELSE discount_type END,
      discount_value = CASE WHEN ${b.discountValue !== undefined} THEN ${Number(b.discountValue)} ELSE discount_value END,
      min_order_amount = CASE WHEN ${b.minOrderAmount !== undefined} THEN ${Number(b.minOrderAmount ?? 0)} ELSE min_order_amount END,
      usage_limit = CASE WHEN ${b.usageLimit !== undefined} THEN ${b.usageLimit != null ? Number(b.usageLimit) : null} ELSE usage_limit END,
      expires_at = CASE WHEN ${b.expiresAt !== undefined} THEN ${b.expiresAt ? new Date(b.expiresAt) : null} ELSE expires_at END,
      is_active = ${b.isActive},starts_at=${b.startsAt ?? null},per_customer_limit=${b.perCustomerLimit ?? null},
      eligible_products=${JSON.stringify(b.eligibleProducts)}::jsonb,eligible_collections=${JSON.stringify(b.eligibleCollections)}::jsonb,
      eligible_countries=${JSON.stringify(b.eligibleCountries.map(c=>c.toUpperCase()))}::jsonb
    WHERE id = ${id} RETURNING *
  `));
  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  await logAdminActivity(`Admin ${req.session?.userId}`, "Discount code updated", b.code);
  res.json(rows[0]);
});

// Admin: delete coupon
router.delete("/coupons/:id", requireAdmin, async (req, res) => {
  await db.execute(sql`UPDATE coupons SET is_active=FALSE WHERE id = ${Number(req.params.id)}`);
  await logAdminActivity(`Admin ${req.session?.userId}`, "Discount code archived", String(req.params.id));
  res.json({ ok: true });
});

// Internal helper: apply coupon to an order (increments used_count, returns discount)
export async function applyCoupon(code: string, _orderTotal: number, context?: DiscountContext, executor: Pick<typeof db,"execute"> = db): Promise<{ discountAmount: number; couponCode: string } | null> {
  await ensureTable();
  if (!context) return null;
  try { return await validateDiscount(code,context,true,executor); } catch { return null; }
}

export default router;
