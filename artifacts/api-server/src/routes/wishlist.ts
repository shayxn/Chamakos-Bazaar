import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

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
    CREATE TABLE IF NOT EXISTS wishlists (
      id SERIAL PRIMARY KEY,
      session_id TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (session_id, product_id)
    )
  `);
}
ensureTable().catch(console.error);

function getSessionId(req: any): string {
  // Use existing session cookie ID; if not present, generate one and store it
  if (!req.session.wishlistId) {
    req.session.wishlistId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  return req.session.wishlistId as string;
}

// GET /wishlist — list wishlisted products with product details
router.get("/wishlist", async (req, res) => {
  const sessionId = getSessionId(req);
  const rows = extractRows<any>(await db.execute(sql`
    SELECT w.product_id, p.id, p.name, p.price, p.image_url, p.stock, p.is_pre_order, p.sizes, p.hidden,
           COALESCE(p.coming_soon, FALSE) as coming_soon
    FROM wishlists w
    JOIN products p ON p.id = w.product_id
    WHERE w.session_id = ${sessionId}
      AND p.hidden = FALSE
    ORDER BY w.coming_soon DESC, w.created_at DESC
  `));
  res.json(rows.map((r: any) => ({
    productId: r.product_id,
    id: r.id, name: r.name,
    price: Number(r.price),
    imageUrl: r.image_url,
    stock: r.stock,
    isPreOrder: r.is_pre_order,
    sizes: r.sizes,
    comingSoon: Boolean(r.coming_soon),
  })));
});

// GET /wishlist/ids — just the array of product IDs (for fast UI check)
router.get("/wishlist/ids", async (req, res) => {
  const sessionId = getSessionId(req);
  const rows = extractRows<any>(await db.execute(sql`
    SELECT product_id FROM wishlists WHERE session_id = ${sessionId}
  `));
  res.json(rows.map((r: any) => r.product_id as number));
});

// POST /wishlist — add to wishlist
router.post("/wishlist", async (req, res) => {
  const sessionId = getSessionId(req);
  const { productId } = req.body as { productId: number };
  if (!productId) { res.status(400).json({ error: "productId required" }); return; }
  await db.execute(sql`
    INSERT INTO wishlists (session_id, product_id) VALUES (${sessionId}, ${Number(productId)})
    ON CONFLICT (session_id, product_id) DO NOTHING
  `);
  res.json({ ok: true });
});

// DELETE /wishlist/:productId — remove from wishlist
router.delete("/wishlist/:productId", async (req, res) => {
  const sessionId = getSessionId(req);
  const productId = Number(req.params.productId);
  await db.execute(sql`DELETE FROM wishlists WHERE session_id = ${sessionId} AND product_id = ${productId}`);
  res.json({ ok: true });
});

export default router;
