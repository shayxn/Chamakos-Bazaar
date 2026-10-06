import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
let ready: Promise<void> | undefined;
export function ensureCommerceSchema() {
  if (!ready) ready=(async()=>{
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS colors TEXT,
      ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(10,2),ADD COLUMN IF NOT EXISTS seo_title TEXT,
      ADD COLUMN IF NOT EXISTS seo_description TEXT,ADD COLUMN IF NOT EXISTS social_image TEXT,
      ADD COLUMN IF NOT EXISTS variants JSONB NOT NULL DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS image_urls TEXT,
      ADD COLUMN IF NOT EXISTS sizes TEXT,
      ADD COLUMN IF NOT EXISTS is_pre_order BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS pre_order_label TEXT,
      ADD COLUMN IF NOT EXISTS pre_order_date TEXT,
      ADD COLUMN IF NOT EXISTS pre_order_note TEXT,
      ADD COLUMN IF NOT EXISTS supplier_price NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS import_source TEXT,
      ADD COLUMN IF NOT EXISTS external_id TEXT,
      ADD COLUMN IF NOT EXISTS source_url TEXT,
      ADD COLUMN IF NOT EXISTS video_url TEXT,
      ADD COLUMN IF NOT EXISTS ships_to_uae_verified BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS selling_fast BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS spotlight BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS publish_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS unpublish_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS collection TEXT,
      ADD COLUMN IF NOT EXISTS best_seller BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS trending BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS new_arrival BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS limited_edition BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS coming_soon BOOLEAN NOT NULL DEFAULT FALSE`);
    await db.execute(sql`ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS color TEXT,
      ADD COLUMN IF NOT EXISTS variant_id TEXT, ADD COLUMN IF NOT EXISTS size TEXT`);
    await db.execute(sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS color TEXT,
      ADD COLUMN IF NOT EXISTS variant_id TEXT, ADD COLUMN IF NOT EXISTS size TEXT,
      ADD COLUMN IF NOT EXISTS is_pre_order BOOLEAN NOT NULL DEFAULT FALSE`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id INTEGER,
      ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'AE',
      ADD COLUMN IF NOT EXISTS stock_reserved BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS stock_released BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,ADD COLUMN IF NOT EXISTS payment_status TEXT,
      ADD COLUMN IF NOT EXISTS payment_cart_id TEXT,ADD COLUMN IF NOT EXISTS discount_customer_key TEXT,
      ADD COLUMN IF NOT EXISTS order_number TEXT,
      ADD COLUMN IF NOT EXISTS customer_email TEXT,
      ADD COLUMN IF NOT EXISTS payment_method TEXT,
      ADD COLUMN IF NOT EXISTS delivery_method TEXT,
      ADD COLUMN IF NOT EXISTS delivery_charge NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS tip NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS courier_name TEXT,
      ADD COLUMN IF NOT EXISTS estimated_delivery TEXT,
      ADD COLUMN IF NOT EXISTS has_pre_order BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS tracking_note TEXT,
      ADD COLUMN IF NOT EXISTS delay_reason TEXT,
      ADD COLUMN IF NOT EXISTS delayed_until TEXT,
      ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
      ADD COLUMN IF NOT EXISTS refund_initiated BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS customer_push_log TEXT DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS coupon_code TEXT,
      ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2)`);
    await db.execute(sql`ALTER TABLE orders ALTER COLUMN delivery_charge SET DEFAULT 25`);
    // Render uses the existing external database, not Replit's managed schema
    // publishing flow. Provision only the already-declared filming control table.
    // No orders, products, customers, or analytics records are inserted/rewritten.
    if (process.env.RENDER === "true") {
      await db.execute(sql`CREATE TABLE IF NOT EXISTS admin_movie_devices (
        id UUID PRIMARY KEY,
        admin_id INTEGER NOT NULL REFERENCES users(id),
        admin_session_id INTEGER,
        endpoint TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL,
        opted_in BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
    }
  })().catch(error=>{ready=undefined;throw error;});
  return ready;
}
