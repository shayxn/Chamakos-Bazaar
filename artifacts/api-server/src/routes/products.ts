import { Router } from "express";
import { db, productsTable, categoriesTable } from "@workspace/db";
import { eq, ilike, and, type SQL } from "drizzle-orm";
import {
  ListProductsQueryParams,
  CreateProductBody,
  GetProductParams,
  UpdateProductParams,
  UpdateProductBody,
  DeleteProductParams,
} from "@workspace/api-zod";
import { createTtlCache, setPublicReadCacheHeaders } from "../lib/response-cache";

const router = Router();
const productListCache = createTtlCache<unknown>(30_000);
const productDetailCache = createTtlCache<unknown>(30_000);

function clearProductCaches() {
  productListCache.clear();
  productDetailCache.clear();
}

router.get("/products", async (req, res) => {
  const cacheKey = req.originalUrl;
  const cached = productListCache.get(cacheKey);
  if (cached) {
    setPublicReadCacheHeaders(res);
    res.json(cached);
    return;
  }

  const parsed = ListProductsQueryParams.safeParse({
    categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
    search: req.query.search,
    featured: req.query.featured === "true" ? true : req.query.featured === "false" ? false : undefined,
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query" });
    return;
  }
  const { categoryId, search, featured } = parsed.data;
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
      stock: productsTable.stock,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      featured: productsTable.featured,
      rep: productsTable.rep,
      sizes: productsTable.sizes,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const result = products.map((p) => ({
    ...p,
    price: Number(p.price),
    createdAt: p.createdAt.toISOString(),
  }));
  productListCache.set(cacheKey, result);
  setPublicReadCacheHeaders(res);
  res.json(result);
});

router.post("/products", async (req, res) => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [product] = await db.insert(productsTable).values({
    ...parsed.data,
    price: String(parsed.data.price),
  }).returning();
  clearProductCaches();
  res.status(201).json({ ...product, price: Number(product.price), createdAt: product.createdAt.toISOString() });
});

router.get("/products/:id", async (req, res) => {
  const cacheKey = req.originalUrl;
  const cached = productDetailCache.get(cacheKey);
  if (cached) {
    setPublicReadCacheHeaders(res);
    res.json(cached);
    return;
  }

  const parsed = GetProductParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [product] = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      imageUrl: productsTable.imageUrl,
      stock: productsTable.stock,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      featured: productsTable.featured,
      rep: productsTable.rep,
      sizes: productsTable.sizes,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.id, parsed.data.id));

  if (!product) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const result = { ...product, price: Number(product.price), createdAt: product.createdAt.toISOString() };
  productDetailCache.set(cacheKey, result);
  setPublicReadCacheHeaders(res);
  res.json(result);
});

router.patch("/products/:id", async (req, res) => {
  const paramsParsed = UpdateProductParams.safeParse({ id: Number(req.params.id) });
  const bodyParsed = UpdateProductBody.safeParse(req.body);
  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const updateData: Record<string, unknown> = { ...bodyParsed.data };
  if (updateData.price !== undefined) updateData.price = String(updateData.price);
  const [product] = await db
    .update(productsTable)
    .set(updateData)
    .where(eq(productsTable.id, paramsParsed.data.id))
    .returning();
  if (!product) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  clearProductCaches();
  res.json({ ...product, price: Number(product.price), createdAt: product.createdAt.toISOString() });
});

router.delete("/products/:id", async (req, res) => {
  const parsed = DeleteProductParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(productsTable).where(eq(productsTable.id, parsed.data.id));
  clearProductCaches();
  res.json({ message: "Deleted" });
});

export default router;
