import { Router } from "express";
import { db, productsTable, categoriesTable } from "@workspace/db";
import { eq, ilike, and, type SQL } from "drizzle-orm";
import { requireAdmin } from "../lib/auth-middleware";
import { createTtlCache, setPublicReadCacheHeaders } from "../lib/response-cache";

const router = Router();
const productListCache = createTtlCache<unknown>(30_000);
const productDetailCache = createTtlCache<unknown>(30_000);

function clearProductCaches() {
  productListCache.clear();
  productDetailCache.clear();
}

function serializeProduct(p: {
  id: number; name: string; description: string | null; price: string | number;
  imageUrl: string | null; imageUrls: string | null; stock: number;
  categoryId: number | null; categoryName?: string | null; featured: boolean;
  rep: boolean; sizes: string | null; isPreOrder: boolean; preOrderLabel: string | null;
  preOrderDate: string | null; preOrderNote: string | null; createdAt: Date | string;
  sellingFast?: boolean;
  spotlight?: boolean;
}) {
  return {
    ...p,
    price: Number(p.price),
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  };
}

router.get("/products", async (req, res) => {
  const cacheKey = req.originalUrl;
  const cached = productListCache.get(cacheKey);
  if (cached) { setPublicReadCacheHeaders(res); res.json(cached); return; }

  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const featured = req.query.featured === "true" ? true : req.query.featured === "false" ? false : undefined;

  const conditions: SQL[] = [];
  if (categoryId !== undefined) conditions.push(eq(productsTable.categoryId, categoryId));
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
  if (featured !== undefined) conditions.push(eq(productsTable.featured, featured));

  const products = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      imageUrl: productsTable.imageUrl,
      imageUrls: productsTable.imageUrls,
      stock: productsTable.stock,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      featured: productsTable.featured,
      rep: productsTable.rep,
      sizes: productsTable.sizes,
      isPreOrder: productsTable.isPreOrder,
      preOrderLabel: productsTable.preOrderLabel,
      preOrderDate: productsTable.preOrderDate,
      preOrderNote: productsTable.preOrderNote,
      sellingFast: productsTable.sellingFast,
      spotlight: productsTable.spotlight,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const result = products.map(serializeProduct);
  productListCache.set(cacheKey, result);
  setPublicReadCacheHeaders(res);
  res.json(result);
});

router.post("/products", requireAdmin, async (req, res) => {
  const body = req.body as {
    name: string; description?: string; price: number; imageUrl?: string;
    imageUrls?: string; stock?: number; categoryId?: number; featured?: boolean;
    rep?: boolean; sizes?: string; isPreOrder?: boolean; preOrderLabel?: string;
    preOrderDate?: string; preOrderNote?: string; sellingFast?: boolean; spotlight?: boolean;
  };
  if (!body.name || body.price === undefined) {
    res.status(400).json({ error: "name and price required" });
    return;
  }
  const [product] = await db.insert(productsTable).values({
    name: body.name,
    description: body.description ?? null,
    price: String(body.price),
    imageUrl: body.imageUrl ?? null,
    imageUrls: body.imageUrls ?? null,
    stock: body.stock ?? 0,
    categoryId: body.categoryId ?? null,
    featured: body.featured ?? false,
    rep: body.rep ?? false,
    sizes: body.sizes ?? null,
    isPreOrder: body.isPreOrder ?? false,
    preOrderLabel: body.preOrderLabel ?? null,
    preOrderDate: body.preOrderDate ?? null,
    preOrderNote: body.preOrderNote ?? null,
    sellingFast: body.sellingFast ?? false,
    spotlight: body.spotlight ?? false,
  }).returning();
  clearProductCaches();
  res.status(201).json(serializeProduct({ ...product, categoryName: null }));
});

router.get("/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const cacheKey = req.originalUrl;
  const cached = productDetailCache.get(cacheKey);
  if (cached) { setPublicReadCacheHeaders(res); res.json(cached); return; }

  const [product] = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      imageUrl: productsTable.imageUrl,
      imageUrls: productsTable.imageUrls,
      stock: productsTable.stock,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      featured: productsTable.featured,
      rep: productsTable.rep,
      sizes: productsTable.sizes,
      isPreOrder: productsTable.isPreOrder,
      preOrderLabel: productsTable.preOrderLabel,
      preOrderDate: productsTable.preOrderDate,
      preOrderNote: productsTable.preOrderNote,
      sellingFast: productsTable.sellingFast,
      spotlight: productsTable.spotlight,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.id, id));

  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  const result = serializeProduct(product);
  productDetailCache.set(cacheKey, result);
  setPublicReadCacheHeaders(res);
  res.json(result);
});

router.patch("/products/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const updateData: Record<string, unknown> = { ...req.body };
  if (updateData.price !== undefined) updateData.price = String(updateData.price);
  if (updateData.spotlight === true) {
    await db.update(productsTable).set({ spotlight: false }).where(eq(productsTable.spotlight, true));
  }
  const [product] = await db.update(productsTable).set(updateData).where(eq(productsTable.id, id)).returning();
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  clearProductCaches();
  res.json(serializeProduct({ ...product, categoryName: null }));
});

router.delete("/products/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(productsTable).where(eq(productsTable.id, id));
  clearProductCaches();
  res.json({ message: "Deleted" });
});

export default router;
