import { Router } from "express";
import { db, productsTable, categoriesTable } from "@workspace/db";
import { eq, ilike, and, inArray, ne, isNotNull, isNull, or, type SQL } from "drizzle-orm";
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
  sellingFast?: boolean; spotlight?: boolean; hidden?: boolean;
  publishAt?: Date | string | null; unpublishAt?: Date | string | null;
  collection?: string | null;
}) {
  return {
    ...p,
    price: Number(p.price),
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    publishAt: p.publishAt instanceof Date ? p.publishAt.toISOString() : (p.publishAt ?? null),
    unpublishAt: p.unpublishAt instanceof Date ? p.unpublishAt.toISOString() : (p.unpublishAt ?? null),
  };
}

function isPublished(p: { hidden: boolean; publishAt: Date | null; unpublishAt: Date | null }): boolean {
  if (p.hidden) return false;
  const now = new Date();
  if (p.publishAt && now < p.publishAt) return false;
  if (p.unpublishAt && now > p.unpublishAt) return false;
  return true;
}

router.get("/products", async (req, res) => {
  const isAdmin = (req as any).session?.userId != null;
  const cacheKey = isAdmin ? null : req.originalUrl;
  if (cacheKey) {
    const cached = productListCache.get(cacheKey);
    if (cached) { setPublicReadCacheHeaders(res); res.json(cached); return; }
  }

  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const featured = req.query.featured === "true" ? true : req.query.featured === "false" ? false : undefined;
  const collection = typeof req.query.collection === "string" ? req.query.collection : undefined;

  const conditions: SQL[] = [];
  if (!isAdmin) conditions.push(eq(productsTable.hidden, false));
  if (categoryId !== undefined) conditions.push(eq(productsTable.categoryId, categoryId));
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
  if (featured !== undefined) conditions.push(eq(productsTable.featured, featured));
  if (collection !== undefined) {
    conditions.push(eq(productsTable.collection, collection));
  } else {
    // Default: main store only (collection IS NULL)
    // Basics products must be accessed explicitly via ?collection=basics
    conditions.push(isNull(productsTable.collection));
  }

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
      hidden: productsTable.hidden,
      publishAt: productsTable.publishAt,
      unpublishAt: productsTable.unpublishAt,
      collection: productsTable.collection,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const filtered = isAdmin ? products : products.filter(p => isPublished(p as any));
  const result = filtered.map(serializeProduct);
  if (cacheKey) { productListCache.set(cacheKey, result); setPublicReadCacheHeaders(res); }
  res.json(result);
});

router.post("/products", requireAdmin, async (req, res) => {
  const body = req.body as {
    name: string; description?: string; price: number; imageUrl?: string;
    imageUrls?: string; stock?: number; categoryId?: number; featured?: boolean;
    rep?: boolean; sizes?: string; isPreOrder?: boolean; preOrderLabel?: string;
    preOrderDate?: string; preOrderNote?: string; sellingFast?: boolean; spotlight?: boolean;
    hidden?: boolean; publishAt?: string | null; unpublishAt?: string | null;
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
    hidden: body.hidden ?? false,
    publishAt: body.publishAt ? new Date(body.publishAt) : null,
    unpublishAt: body.unpublishAt ? new Date(body.unpublishAt) : null,
    collection: (body as any).collection ?? null,
  }).returning();
  clearProductCaches();
  res.status(201).json(serializeProduct({ ...product, categoryName: null }));
});

router.get("/products/complete-the-look", async (req, res) => {
  const productId = req.query.productId ? Number(req.query.productId) : null;
  if (!productId) { res.json([]); return; }

  const [current] = await db
    .select({ importSource: productsTable.importSource })
    .from(productsTable)
    .where(eq(productsTable.id, productId))
    .limit(1);

  if (!current) { res.json([]); return; }

  const ALL_SOURCES = ["fashioncage", "stealstreetwear", "reesdxb"];
  const otherSources = current.importSource
    ? ALL_SOURCES.filter((s) => s !== current.importSource)
    : ALL_SOURCES;

  const picks: ReturnType<typeof serializeProduct>[] = [];

  for (const source of otherSources) {
    for (const tryFeatured of [true, false]) {
      if (picks.find((p) => (p as any).importSource === source)) break;
      const conds: SQL[] = [
        eq(productsTable.importSource, source),
        ne(productsTable.id, productId),
        isNotNull(productsTable.imageUrl),
        eq(productsTable.hidden, false),
      ];
      if (tryFeatured) conds.push(eq(productsTable.featured, true));

      const [row] = await db
        .select({
          id: productsTable.id, name: productsTable.name, description: productsTable.description,
          price: productsTable.price, imageUrl: productsTable.imageUrl, imageUrls: productsTable.imageUrls,
          stock: productsTable.stock, categoryId: productsTable.categoryId,
          categoryName: categoriesTable.name, featured: productsTable.featured,
          rep: productsTable.rep, sizes: productsTable.sizes, isPreOrder: productsTable.isPreOrder,
          preOrderLabel: productsTable.preOrderLabel, preOrderDate: productsTable.preOrderDate,
          preOrderNote: productsTable.preOrderNote, importSource: productsTable.importSource,
          createdAt: productsTable.createdAt,
        })
        .from(productsTable)
        .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
        .where(and(...conds))
        .limit(1);

      if (row) picks.push(serializeProduct(row));
    }
  }

  setPublicReadCacheHeaders(res);
  res.json(picks);
});

router.get("/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const isAdmin = (req as any).session?.userId != null;
  const cacheKey = isAdmin ? null : req.originalUrl;
  if (cacheKey) {
    const cached = productDetailCache.get(cacheKey);
    if (cached) { setPublicReadCacheHeaders(res); res.json(cached); return; }
  }

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
      hidden: productsTable.hidden,
      publishAt: productsTable.publishAt,
      unpublishAt: productsTable.unpublishAt,
      collection: productsTable.collection,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.id, id));

  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  if (!isAdmin && !isPublished(product as any)) { res.status(404).json({ error: "Not found" }); return; }
  const result = serializeProduct(product);
  if (cacheKey) { productDetailCache.set(cacheKey, result); setPublicReadCacheHeaders(res); }
  res.json(result);
});

router.patch("/products/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const updateData: Record<string, unknown> = { ...req.body };
  if (updateData.price !== undefined) updateData.price = String(updateData.price);
  if (updateData.publishAt !== undefined) updateData.publishAt = updateData.publishAt ? new Date(updateData.publishAt as string) : null;
  if (updateData.unpublishAt !== undefined) updateData.unpublishAt = updateData.unpublishAt ? new Date(updateData.unpublishAt as string) : null;
  if (updateData.spotlight === true) {
    await db.update(productsTable).set({ spotlight: false }).where(eq(productsTable.spotlight, true));
  }
  const [product] = await db.update(productsTable).set(updateData).where(eq(productsTable.id, id)).returning();
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  clearProductCaches();
  res.json(serializeProduct({ ...product, categoryName: null }));
});

router.delete("/products/all", requireAdmin, async (_req, res) => {
  await db.delete(productsTable);
  clearProductCaches();
  res.json({ message: "All products deleted" });
});

router.delete("/products/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(productsTable).where(eq(productsTable.id, id));
  clearProductCaches();
  res.json({ message: "Deleted" });
});

router.post("/products/bulk-action", requireAdmin, async (req, res) => {
  const { ids, action, value } = req.body as {
    ids: number[];
    action: "delete" | "hide" | "show" | "feature" | "unfeature" | "preorder" | "unpreorder" | "category" | "price";
    value?: unknown;
  };
  if (!ids || ids.length === 0) { res.status(400).json({ error: "No product IDs provided" }); return; }

  let affected = 0;
  switch (action) {
    case "delete":
      await db.delete(productsTable).where(inArray(productsTable.id, ids));
      affected = ids.length;
      break;
    case "hide":
      await db.update(productsTable).set({ hidden: true }).where(inArray(productsTable.id, ids));
      affected = ids.length;
      break;
    case "show":
      await db.update(productsTable).set({ hidden: false }).where(inArray(productsTable.id, ids));
      affected = ids.length;
      break;
    case "feature":
      await db.update(productsTable).set({ featured: true }).where(inArray(productsTable.id, ids));
      affected = ids.length;
      break;
    case "unfeature":
      await db.update(productsTable).set({ featured: false }).where(inArray(productsTable.id, ids));
      affected = ids.length;
      break;
    case "preorder":
      await db.update(productsTable).set({ isPreOrder: true }).where(inArray(productsTable.id, ids));
      affected = ids.length;
      break;
    case "unpreorder":
      await db.update(productsTable).set({ isPreOrder: false }).where(inArray(productsTable.id, ids));
      affected = ids.length;
      break;
    case "category":
      await db.update(productsTable).set({ categoryId: value as number }).where(inArray(productsTable.id, ids));
      affected = ids.length;
      break;
    case "price":
      for (const id of ids) {
        await db.update(productsTable).set({ price: String(value) }).where(eq(productsTable.id, id));
      }
      affected = ids.length;
      break;
    default:
      res.status(400).json({ error: "Unknown action" }); return;
  }
  clearProductCaches();
  res.json({ ok: true, affected });
});

export default router;
