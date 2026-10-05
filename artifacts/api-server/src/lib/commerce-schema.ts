import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
let ready: Promise<void> | undefined;
export function ensureCommerceSchema() {
  if (!ready) ready=(async()=>{
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS colors TEXT,
      ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(10,2),ADD COLUMN IF NOT EXISTS seo_title TEXT,
      ADD COLUMN IF NOT EXISTS seo_description TEXT,ADD COLUMN IF NOT EXISTS social_image TEXT,
      ADD COLUMN IF NOT EXISTS variants JSONB NOT NULL DEFAULT '[]'`);
    await db.execute(sql`ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS color TEXT,ADD COLUMN IF NOT EXISTS variant_id TEXT`);
    await db.execute(sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS color TEXT,ADD COLUMN IF NOT EXISTS variant_id TEXT`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id INTEGER,
      ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'AE',
      ADD COLUMN IF NOT EXISTS stock_reserved BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS stock_released BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,ADD COLUMN IF NOT EXISTS payment_status TEXT,
      ADD COLUMN IF NOT EXISTS payment_cart_id TEXT,ADD COLUMN IF NOT EXISTS discount_customer_key TEXT`);
    await db.execute(sql`ALTER TABLE orders ALTER COLUMN delivery_charge SET DEFAULT 25`);
  })().catch(error=>{ready=undefined;throw error;});
  return ready;
}
