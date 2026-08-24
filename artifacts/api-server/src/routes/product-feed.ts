import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";

const router = Router();
const ALLOWED_SOURCES = new Set(["stylescape", "stealstreetwear"]);

let ensurePromise: Promise<void> | null = null;
function ensureSavedProductsTable() {
  if (!ensurePromise) {
    ensurePromise = db.execute(sql`
      CREATE TABLE IF NOT EXISTS admin_saved_products (
        admin_user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (admin_user_id, product_id)
      );
      CREATE INDEX IF NOT EXISTS admin_saved_products_user_created_idx
        ON admin_saved_products (admin_user_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS admin_feed_added_products (
        admin_user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        source_url TEXT NOT NULL,
        source_price NUMERIC(10,2) NOT NULL,
        suggested_profit NUMERIC(10,2) NOT NULL,
        selling_price NUMERIC(10,2) NOT NULL,
        delivery_status TEXT NOT NULL DEFAULT 'confirmation_required',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (admin_user_id, product_id)
      );
      CREATE INDEX IF NOT EXISTS admin_feed_added_products_user_created_idx
        ON admin_feed_added_products (admin_user_id, created_at DESC);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS source_url TEXT;
       ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url TEXT;
       ALTER TABLE products ADD COLUMN IF NOT EXISTS ships_to_uae_verified BOOLEAN NOT NULL DEFAULT FALSE;
       CREATE TABLE IF NOT EXISTS admin_product_feed_comments (
         id BIGSERIAL PRIMARY KEY,
         product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
         admin_user_id INTEGER NOT NULL,
         author_name TEXT NOT NULL,
         body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       );
       CREATE INDEX IF NOT EXISTS admin_product_feed_comments_product_created_idx
         ON admin_product_feed_comments (product_id, created_at DESC);
    `).then(() => undefined);
  }
  return ensurePromise;
}

function rows<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  return ((value as { rows?: T[] }).rows ?? []);
}

type FeedRow = {
  id: number;
  name: string;
  description: string | null;
  price: string | number;
  supplier_price: string | number | null;
  image_url: string | null;
  image_urls: string | null;
  stock: number;
  import_source: string | null;
  external_id: string | null;
  source_url: string | null;
  video_url: string | null;
  ships_to_uae_verified: boolean;
  hidden: boolean;
  collection: string | null;
  category_name: string | null;
  created_at: string;
  saved_at: string | null;
  added_at: string | null;
  comment_count: string | number;
};

function serialize(row: FeedRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    supplierPrice: row.supplier_price === null ? null : Number(row.supplier_price),
    imageUrl: row.image_url,
    imageUrls: row.image_urls,
    stock: row.stock,
    importSource: row.import_source,
    externalId: row.external_id,
    sourceUrl: row.source_url,
    videoUrl: row.video_url,
    shipsToUaeVerified: row.ships_to_uae_verified,
    hidden: row.hidden,
    collection: row.collection,
    categoryName: row.category_name,
    createdAt: row.created_at,
    savedAt: row.saved_at,
    addedAt: row.added_at,
    commentCount: Number(row.comment_count ?? 0),
    state: row.hidden ? "hidden" : "available",
  };
}

router.get("/admin/product-feed", requireAdmin, async (req, res) => {
  await ensureSavedProductsTable();
  const userId = (req.session as Record<string, unknown>).userId as number;
  const source = typeof req.query.source === "string" ? req.query.source : undefined;
  const savedOnly = req.query.saved === "true";
  const addedOnly = req.query.added === "true";
  const parsedCursor = Number(req.query.cursor);
  const cursor = Number.isInteger(parsedCursor) && parsedCursor > 0 ? parsedCursor : null;
  const parsedLimit = Number(req.query.limit);
   const limit = Number.isInteger(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 24;

  if (source && !ALLOWED_SOURCES.has(source)) {
    res.status(400).json({ error: "Unknown supplier source" });
    return;
  }

  const sourceClause = source ? sql`AND p.import_source = ${source}` : sql``;
  const savedClause = savedOnly ? sql`AND saved.product_id IS NOT NULL` : sql``;
  const addedClause = addedOnly ? sql`AND added.product_id IS NOT NULL` : sql`AND added.product_id IS NULL`;
  const cursorClause = cursor ? sql`AND p.id < ${cursor}` : sql``;
  const results = rows<FeedRow>(await db.execute(sql`
    SELECT
      p.id, p.name, p.description, p.price, p.supplier_price, p.image_url, p.image_urls,
      p.stock, p.import_source, p.external_id, p.source_url, p.video_url, p.ships_to_uae_verified,
      p.hidden, p.collection, p.created_at, c.name AS category_name, saved.created_at AS saved_at,
      added.created_at AS added_at,
      (SELECT COUNT(*) FROM admin_product_feed_comments comments WHERE comments.product_id = p.id) AS comment_count
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN admin_saved_products saved
      ON saved.product_id = p.id AND saved.admin_user_id = ${userId}
    LEFT JOIN admin_feed_added_products added
      ON added.product_id = p.id AND added.admin_user_id = ${userId}
    WHERE p.import_source IN ('stylescape', 'stealstreetwear')
      AND p.hidden = FALSE
      AND p.stock > 0
      AND p.video_url IS NOT NULL
      AND p.ships_to_uae_verified = TRUE
      ${sourceClause}
      ${savedClause}
      ${addedClause}
      ${cursorClause}
    ORDER BY p.id DESC
    LIMIT ${limit + 1}
  `));

  const hasMore = results.length > limit;
  const items = results.slice(0, limit).map(serialize);
  res.json({
    items,
    nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
    hasMore,
  });
});

router.post("/admin/product-feed/:productId/save", requireAdmin, async (req, res) => {
  await ensureSavedProductsTable();
  const userId = (req.session as Record<string, unknown>).userId as number;
  const productId = Number(req.params.productId);
  if (!Number.isInteger(productId) || productId <= 0) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }
  await db.execute(sql`
    INSERT INTO admin_saved_products (admin_user_id, product_id)
    SELECT ${userId}, p.id FROM products p
    WHERE p.id = ${productId} AND p.import_source IS NOT NULL
    ON CONFLICT (admin_user_id, product_id) DO NOTHING
  `);
  res.status(201).json({ saved: true, productId });
});

router.delete("/admin/product-feed/:productId/save", requireAdmin, async (req, res) => {
  await ensureSavedProductsTable();
  const userId = (req.session as Record<string, unknown>).userId as number;
  const productId = Number(req.params.productId);
  if (!Number.isInteger(productId) || productId <= 0) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }
  await db.execute(sql`
    DELETE FROM admin_saved_products
    WHERE admin_user_id = ${userId} AND product_id = ${productId}
  `);
  res.json({ saved: false, productId });
});

router.post("/admin/product-feed/:productId/add", requireAdmin, async (req, res) => {
  await ensureSavedProductsTable();
  const userId = (req.session as Record<string, unknown>).userId as number;
  const productId = Number(req.params.productId);
  const suggestedProfit = Number(req.body?.suggestedProfit);
  const sellingPrice = Number(req.body?.sellingPrice);
  if (!Number.isInteger(productId) || productId <= 0) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }
  if (!Number.isFinite(suggestedProfit) || suggestedProfit < 20 || suggestedProfit > 100) {
    res.status(400).json({ error: "Profit must be between AED 20 and AED 100" });
    return;
  }
  if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
    res.status(400).json({ error: "A valid FirstPick selling price is required" });
    return;
  }

  const sourceRows = rows<{ source_url: string | null; supplier_price: string | number | null }>(await db.execute(sql`
    SELECT source_url, supplier_price FROM products
    WHERE id = ${productId} AND import_source IN ('stylescape', 'stealstreetwear')
    LIMIT 1
  `));
  const source = sourceRows[0];
  if (!source?.source_url || source.supplier_price === null) {
    res.status(409).json({ error: "This product needs a real source URL and source price before it can be added." });
    return;
  }

  await db.execute(sql`
    INSERT INTO admin_feed_added_products
      (admin_user_id, product_id, source_url, source_price, suggested_profit, selling_price)
    VALUES
      (${userId}, ${productId}, ${source.source_url}, ${String(source.supplier_price)}, ${String(suggestedProfit)}, ${String(sellingPrice)})
    ON CONFLICT (admin_user_id, product_id) DO NOTHING
  `);
  res.status(201).json({ added: true, productId, deliveryStatus: "confirmation_required" });
});

router.get("/admin/product-feed/:productId/comments", requireAdmin, async (req, res) => {
  await ensureSavedProductsTable();
  const productId = Number(req.params.productId);
  if (!Number.isInteger(productId) || productId <= 0) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }
  const comments = rows<{ id: number; author_name: string; body: string; created_at: string }>(await db.execute(sql`
    SELECT id, author_name, body, created_at
    FROM admin_product_feed_comments
    WHERE product_id = ${productId}
    ORDER BY created_at ASC
    LIMIT 200
  `));
  res.json(comments.map((comment) => ({
    id: comment.id,
    authorName: comment.author_name,
    body: comment.body,
    createdAt: comment.created_at,
  })));
});

router.post("/admin/product-feed/:productId/comments", requireAdmin, async (req, res) => {
  await ensureSavedProductsTable();
  const productId = Number(req.params.productId);
  const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
  const userId = (req.session as Record<string, unknown>).userId as number;
  if (!Number.isInteger(productId) || productId <= 0) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }
  if (!body || body.length > 500) {
    res.status(400).json({ error: "Comment must be between 1 and 500 characters" });
    return;
  }
  const author = rows<{ username: string }>(await db.execute(sql`
    SELECT username FROM users WHERE id = ${userId} LIMIT 1
  `))[0];
  if (!author) {
    res.status(401).json({ error: "Admin account not found" });
    return;
  }
  const [comment] = rows<{ id: number; author_name: string; body: string; created_at: string }>(await db.execute(sql`
    INSERT INTO admin_product_feed_comments (product_id, admin_user_id, author_name, body)
    SELECT p.id, ${userId}, ${author.username}, ${body}
    FROM products p
    WHERE p.id = ${productId}
      AND p.import_source IN ('stylescape', 'stealstreetwear')
      AND p.video_url IS NOT NULL
      AND p.ships_to_uae_verified = TRUE
    RETURNING id, author_name, body, created_at
  `));
  if (!comment) {
    res.status(404).json({ error: "Verified video product not found" });
    return;
  }
  res.status(201).json({
    id: comment.id,
    authorName: comment.author_name,
    body: comment.body,
    createdAt: comment.created_at,
  });
});

export default router;