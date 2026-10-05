import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { rows } from "./management-db";

export type DiscountContext = {
  items: { productId: number; price: number; quantity: number; collection?: string | null }[];
  customerKey: string; country: string;
};
type Executor = Pick<typeof db, "execute">;
let ready: Promise<void> | undefined;
export function ensureDiscounts() {
  if (!ready) ready = (async () => {
    await db.execute(sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS per_customer_limit INTEGER,
      ADD COLUMN IF NOT EXISTS eligible_products JSONB NOT NULL DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS eligible_collections JSONB NOT NULL DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS eligible_countries JSONB NOT NULL DEFAULT '[]'`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS imaginate_discount_uses (
      coupon_id INTEGER NOT NULL, customer_key TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY(coupon_id,customer_key))`);
  })().catch(error => { ready = undefined; throw error; });
  return ready;
}

export async function validateDiscount(code: string, context: DiscountContext, consume = false, executor: Executor = db) {
  await ensureDiscounts();
  const coupon = rows(await executor.execute(sql`SELECT * FROM coupons WHERE UPPER(code)=UPPER(${code.trim()})
    AND is_active=TRUE LIMIT 1 ${consume ? sql`FOR UPDATE` : sql``}`))[0];
  if (!coupon) throw new Error("Invalid or inactive discount code.");
  const now = Date.now();
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) throw new Error("This discount code is not active yet.");
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() <= now) throw new Error("This discount code has expired.");
  if (coupon.usage_limit != null && Number(coupon.used_count) >= Number(coupon.usage_limit)) throw new Error("This discount code has reached its usage limit.");
  const subtotal = context.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  if (!Number.isFinite(subtotal) || subtotal <= 0) throw new Error("Add products to your bag before applying a discount code.");
  if (subtotal < Number(coupon.min_order_amount)) throw new Error(`Minimum order of AED ${Number(coupon.min_order_amount).toFixed(2)} required.`);
  const countries: string[] = Array.isArray(coupon.eligible_countries) ? coupon.eligible_countries : [];
  if (countries.length && !countries.includes(context.country)) throw new Error("This discount code is not eligible for your delivery country.");
  const products: number[] = Array.isArray(coupon.eligible_products) ? coupon.eligible_products : [];
  const collections: string[] = Array.isArray(coupon.eligible_collections) ? coupon.eligible_collections : [];
  const eligibleTotal = context.items.filter(i => (!products.length && !collections.length) || products.includes(i.productId) || (i.collection && collections.includes(i.collection)))
    .reduce((sum,i) => sum + i.price * i.quantity, 0);
  if (!eligibleTotal) throw new Error("No products in your bag qualify for this discount code.");
  const used = rows(await executor.execute(sql`SELECT count FROM imaginate_discount_uses WHERE coupon_id=${coupon.id} AND customer_key=${context.customerKey}`))[0];
  if (coupon.per_customer_limit != null && Number(used?.count ?? 0) >= coupon.per_customer_limit) throw new Error("You have reached the per-customer limit for this discount code.");
  const value = Number(coupon.discount_value);
  if (!Number.isFinite(value) || value < 0 || (coupon.discount_type === "percent" && value > 100)) throw new Error("This discount code is misconfigured.");
  const discountAmount = Math.round(Math.min(eligibleTotal, coupon.discount_type === "percent" ? eligibleTotal * value / 100 : value) * 100) / 100;
  if (consume) {
    const claim = rows(await executor.execute(sql`INSERT INTO imaginate_discount_uses(coupon_id,customer_key,count)
      VALUES(${coupon.id},${context.customerKey},1) ON CONFLICT(coupon_id,customer_key)
      DO UPDATE SET count=imaginate_discount_uses.count+1
      WHERE ${coupon.per_customer_limit ?? null}::integer IS NULL OR imaginate_discount_uses.count < ${coupon.per_customer_limit ?? null} RETURNING count`));
    if (!claim.length) throw new Error("You have reached the per-customer discount limit.");
    const global = rows(await executor.execute(sql`UPDATE coupons SET used_count=used_count+1 WHERE id=${coupon.id}
      AND (usage_limit IS NULL OR used_count < usage_limit) RETURNING id`));
    if (!global.length) throw new Error("This discount code has reached its usage limit.");
  }
  return { id: coupon.id, code: coupon.code, couponCode: coupon.code, discountAmount,
    discountType: coupon.discount_type, discountValue: value, description: coupon.description };
}
