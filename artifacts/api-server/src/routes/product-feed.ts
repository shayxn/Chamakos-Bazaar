import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";

const router = Router();
const ALLOWED_SOURCES = new Set(["fashioncage", "stylescape", "stealstreetwear"]);

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
  hidden: boolean;
  collection: string | null;
  category_name: string | null;
  created_at: string;
  saved_at: string | null;
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
    hidden: row.hidden,
    collection: row.collection,
    categoryName: row.category_name,
    createdAt: row.created_at,
    savedAt: row.saved_at,
    state: row.hidden ? "hidden" : "available",
  };
}

router.get("/admin/product-feed", requireAdmin, async (req, res) => {
  await ensureSavedProductsTable();
  const userId = (req.session as Record<string, unknown>).userId as number;
  const source = typeof req.query.source === "string" ? req.query.source : undefined;
  const savedOnly = req.query.saved === "true";
  const parsedCursor = Number(req.query.cursor);
  const cursor = Number.isInteger(parsedCursor) && parsedCursor > 0 ? parsedCursor : null;
  const parsedLimit = Number(req.query.limit);
  const limit = Number.isInteger(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 30) : 12;

  if (source && !ALLOWED_SOURCES.has(source)) {
    res.status(400).json({ error: "Unknown supplier source" });
    return;
  }

  const sourceClause = source ? sql`AND p.import_source = ${source}` : sql``;
  const savedClause = savedOnly ? sql`AND saved.product_id IS NOT NULL` : sql``;
  const cursorClause = cursor ? sql`AND p.id < ${cursor}` : sql``;
  const results = rows<FeedRow>(await db.execute(sql`
    SELECT
      p.id, p.name, p.description, p.price, p.supplier_price, p.image_url, p.image_urls,
      p.stock, p.import_source, p.external_id, p.hidden, p.collection, p.created_at,
      c.name AS category_name, saved.created_at AS saved_at
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN admin_saved_products saved
      ON saved.product_id = p.id AND saved.admin_user_id = ${userId}
    WHERE p.import_source IS NOT NULL
      ${sourceClause}
      ${savedClause}
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

export default router;